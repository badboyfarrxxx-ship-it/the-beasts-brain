---
status: active
project: meta
type: plan
created: 2026-09-25
---

# VLC build pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private GitHub repo, `vlc-build`, that builds [[VLC]] 4 for Windows at a pinned commit with one click and publishes a portable zip Nathan can unzip and run on the Surface.

**Architecture:** A GitHub Actions workflow on an Ubuntu runner downloads VLC at the commit in `VLC_COMMIT`, applies `patches/*.patch`, reads the Windows build image VLC's own CI uses from that commit's `extras/ci/gitlab-ci.yml`, and runs VLC's official `extras/package/win32/build.sh` inside that image with `docker run`; its release flag also packages the zip. A check script confirms the zip holds the core files; the zip is then published as a GitHub release. All logic lives in small bash scripts under `scripts/` with bash tests under `tests/`, so the workflow file only wires them together.

**Tech Stack:** bash, git, Docker, GitHub Actions (`ubuntu-24.04` runner), VLC's `vlc-debian-win64-posix` build image, `unzip`, Python 3 (tests only, to make fixture zips).

**Spec:** [[VLC build pipeline]] (`04 - Resources/VLC build pipeline.md` in this vault). Read it first.

## Global Constraints

- Repo: `badboyfarrxxx-ship-it/vlc-build`, **private**.
- VLC source: `https://github.com/videolan/vlc.git` (VideoLAN's official GitHub mirror of `code.videolan.org/videolan/vlc`). Branch `master`, VLC 4.0 dev.
- Initial pin: `9e59d4b38f804b33491b332df7643c1f80cc0b57` (master on 2026-09-25). `VLC_COMMIT` holds one full 40-character hash and nothing else.
- Build image: the value of `VLC_WIN64_IMAGE` in the pinned commit's `extras/ci/gitlab-ci.yml`. For the initial pin that is `registry.videolan.org/vlc-debian-win64-posix:20260611225331`. Never hard-code it in the workflow.
- Build command: `extras/package/win32/build.sh -a x86_64 -r -p`. Its `-r` (release) flag also runs `make package-win32`, which makes the zip (and a .7z and installer that aren't published). Output: `win64/vlc-<VERSION>-win64.zip`, whose single top folder is `vlc-<VERSION>/`.
- Output is a portable zip, not an installer. No file associations, nothing installed.
- Required files in the zip (relative to its top folder): `vlc.exe`, `libvlc.dll`, `libvlccore.dll`, `plugins/gui/libqt_plugin.dll`, `plugins/codec/libavcodec_plugin.dll`.
- Builds start by hand only (`workflow_dispatch`). No schedule.
- Writing rules for README and notes: plain language, no em dashes, no hype words.
- **Local testing limit:** the Claude cloud sandbox cannot reach `*.videolan.org` (its proxy returns 403), so the Docker build itself can only be tested on GitHub's runners. The unit tests run anywhere.

## Review Focus

1. **`patches/` holds no patches** (only `README.md`, or nothing): the build must go ahead with stock VLC, not fail. Test in Task 2.
2. **A patch that no longer applies after an upgrade:** the build must stop before compiling and name the patch. Test in Task 2.
3. **`VLC_COMMIT` edited by hand** (trailing newline, spaces, a branch name, a short hash): whitespace is fine; anything but a full hash stops the build with a clear message. Tests in Task 1.
4. **VLC builds but the Qt interface is silently left out** (for example a configure change upstream): the zip must be rejected, because a VLC with no window is exactly the failure Nathan already hit once. Test in Task 4.
5. **VLC's CI file changes shape** (the image variable quoted, moved or renamed): quoting must still work; a missing variable must stop the build with a clear message rather than running `docker run` with an empty image. Tests in Task 3.

## Files

| path | responsibility |
|------|----------------|
| `VLC_COMMIT` | the pinned VLC commit |
| `patches/README.md` | how to add a patch |
| `scripts/read-commit.sh` | print the pinned hash, or fail |
| `scripts/apply-patches.sh` | apply `patches/*.patch` in name order, or fail naming the patch |
| `scripts/read-image.sh` | print the build image from VLC's CI file, or fail |
| `scripts/check-package.sh` | check the zip holds the required files, or fail listing what's missing |
| `scripts/container-build.sh` | runs inside the image: build, then zip |
| `tests/lib.sh` | tiny assertion helpers |
| `tests/test-*.sh` | one test file per script |
| `tests/run-all.sh` | run every test file |
| `.github/workflows/tests.yml` | unit tests on every push |
| `.github/workflows/build-win64.yml` | the build |
| `README.md` | how to build, upgrade, add a patch, and install on the Surface |
| `.gitignore` | ignore `vlc/` and `*.zip` |

## Before starting

Nathan approved the design, including the private repo. At execution time, confirm one thing with him: **commits go straight to `main` of the new repo.** A `workflow_dispatch` workflow can only be started once its file is on the default branch, and the repo is new and his alone. If he wants branches and PRs instead, do Tasks 1-4 on a branch, merge, then do Task 5.

---

### Task 1: Create the repo, the test helpers, and `read-commit.sh`

**Files:**
- Create: `README.md`, `.gitignore`, `VLC_COMMIT`, `patches/README.md`, `tests/lib.sh`, `tests/run-all.sh`, `tests/test-read-commit.sh`, `scripts/read-commit.sh`, `.github/workflows/tests.yml`

**Interfaces:**
- Produces: `scripts/read-commit.sh [FILE]`: prints the 40-hex hash in FILE (default `VLC_COMMIT`) to stdout, exit 0; else a message on stderr, exit 1.
- Produces: `tests/lib.sh` functions `expect_ok NAME CMD...`, `expect_fail NAME CMD...`, `expect_output NAME WANT CMD...`, `expect_output_contains NAME WANT CMD...`, `finish`.

- [ ] **Step 1: Create the repo and clone it**

Use the GitHub MCP tool `create_repository` with `name: vlc-build`, `private: true`, `autoInit: false`, description `Builds VLC 4 for Windows as a portable zip`. Then `add_repo` (`owner: badboyfarrxxx-ship-it`, `repo: vlc-build`, `access: push`) and clone it as the tool says, to `/home/user/vlc-build`.

```bash
cd /home/user/vlc-build && git checkout -b main
```

- [ ] **Step 2: Write the test helpers**

`tests/lib.sh`:

```bash
# Tiny test helpers. Source this from a test file, then call finish at the end.
fails=0
_out="$(mktemp)"

expect_ok() {
  local name="$1"; shift
  if "$@" >"$_out" 2>&1; then echo "ok   - $name"
  else echo "FAIL - $name"; sed 's/^/       /' "$_out"; fails=$((fails + 1)); fi
}

expect_fail() {
  local name="$1"; shift
  if "$@" >"$_out" 2>&1; then echo "FAIL - $name (expected a failure)"; fails=$((fails + 1))
  else echo "ok   - $name"; fi
}

expect_output() {
  local name="$1" want="$2"; shift 2
  local got; got="$("$@" 2>&1)" || true
  if [ "$got" = "$want" ]; then echo "ok   - $name"
  else echo "FAIL - $name: wanted '$want', got '$got'"; fails=$((fails + 1)); fi
}

expect_output_contains() {
  local name="$1" want="$2"; shift 2
  local got; got="$("$@" 2>&1)" || true
  if printf '%s' "$got" | grep -qF -- "$want"; then echo "ok   - $name"
  else echo "FAIL - $name: output lacks '$want':"; printf '%s\n' "$got" | sed 's/^/       /'; fails=$((fails + 1)); fi
}

finish() {
  rm -f "$_out"
  if [ "$fails" -gt 0 ]; then echo "$fails failed"; exit 1; fi
}
```

`tests/run-all.sh`:

```bash
#!/usr/bin/env bash
# Run every tests/test-*.sh. Exit 1 if any fails.
cd "$(dirname "$0")/.."
rc=0
for t in tests/test-*.sh; do
  echo "== $t"
  bash "$t" || rc=1
done
exit $rc
```

- [ ] **Step 3: Write the failing test**

`tests/test-read-commit.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
. tests/lib.sh
tmp="$(mktemp -d)"
good=9e59d4b38f804b33491b332df7643c1f80cc0b57

printf '%s\n' "$good" > "$tmp/plain"
printf '  %s  \n\n' "$good" > "$tmp/spaces"
printf 'master\n' > "$tmp/branch"
printf '9e59d4b\n' > "$tmp/short"
printf '%s\n' "9E59D4B38F804B33491B332DF7643C1F80CC0B57" > "$tmp/upper"
: > "$tmp/empty"

expect_output "reads a plain hash" "$good" scripts/read-commit.sh "$tmp/plain"
expect_output "ignores spaces and blank lines" "$good" scripts/read-commit.sh "$tmp/spaces"
expect_fail "rejects a branch name" scripts/read-commit.sh "$tmp/branch"
expect_fail "rejects a short hash" scripts/read-commit.sh "$tmp/short"
expect_fail "rejects an empty file" scripts/read-commit.sh "$tmp/empty"
expect_fail "rejects a missing file" scripts/read-commit.sh "$tmp/missing"
expect_output_contains "says what is wrong" "full 40-character commit hash" scripts/read-commit.sh "$tmp/branch"
expect_output "accepts upper case, prints lower case" "$good" scripts/read-commit.sh "$tmp/upper"
expect_ok "the repo's own VLC_COMMIT is valid" scripts/read-commit.sh VLC_COMMIT

rm -rf "$tmp"
finish
```

- [ ] **Step 4: Run it to see it fail**

Run: `chmod +x tests/*.sh && tests/run-all.sh`
Expected: FAIL lines ("No such file or directory" for `scripts/read-commit.sh`), exit 1.

- [ ] **Step 5: Write `scripts/read-commit.sh` and `VLC_COMMIT`**

```bash
#!/usr/bin/env bash
# Print the VLC commit pinned in FILE (default: VLC_COMMIT), or fail.
set -euo pipefail
file="${1:-VLC_COMMIT}"
if [ ! -f "$file" ]; then
  echo "read-commit: $file not found" >&2
  exit 1
fi
sha="$(tr -d '[:space:]' < "$file" | tr 'A-F' 'a-f')"
if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "read-commit: $file must hold one full 40-character commit hash, not '$sha'" >&2
  exit 1
fi
echo "$sha"
```

```bash
chmod +x scripts/read-commit.sh
echo 9e59d4b38f804b33491b332df7643c1f80cc0b57 > VLC_COMMIT
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `tests/run-all.sh`
Expected: every line `ok`, exit 0.

- [ ] **Step 7: Add the rest of the skeleton**

`.gitignore`:

```
vlc/
*.zip
```

`patches/README.md`:

```markdown
# Patches

Every `*.patch` file here is applied to the VLC source before building, in name order.
Number them so the order is clear: `0001-swipe-to-seek.patch`, `0002-...`.

Make one from a VLC checkout at the commit in `VLC_COMMIT`:

    git diff > ../vlc-build/patches/0001-name.patch

If an upgrade breaks a patch, the build stops at "Apply patches" and names it.
Fix the patch against the new commit, then build again.
```

`README.md`:

```markdown
# vlc-build

Builds VLC 4 for Windows as a portable zip, on GitHub's servers.

## Build

Actions tab > "Build VLC for Windows" > Run workflow. About an hour.
When it finishes, the zip is on the Releases page.

## Install on the Surface

1. Uninstall the old "VLC 4.0 dev" from Settings > Apps, if it's there.
2. Download the zip from Releases and unzip it anywhere, for example `C:\Apps\VLC 4`.
3. Run `vlc.exe`. The first start is slow while it scans its plugins.

It doesn't touch a normal VLC install or your file types.

## Upgrade VLC

Put a newer commit hash from https://github.com/videolan/vlc/commits/master in `VLC_COMMIT`,
commit, and run a build.

## Add your own changes

See `patches/README.md`.

## Tests

`tests/run-all.sh` tests the scripts. They also run on every push.
```

`.github/workflows/tests.yml`:

```yaml
name: Tests
on:
  push:
  pull_request:
permissions:
  contents: read
jobs:
  tests:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - run: tests/run-all.sh
```

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "Add repo skeleton, test helpers and read-commit.sh"
git push -u origin main
```

Then check the "Tests" run on GitHub (`actions_list` for workflow runs) went green.

---

### Task 2: `apply-patches.sh`

**Files:**
- Create: `scripts/apply-patches.sh`, `tests/test-apply-patches.sh`

**Interfaces:**
- Produces: `scripts/apply-patches.sh VLC_DIR PATCH_DIR`: applies each `PATCH_DIR/*.patch` to the git tree at `VLC_DIR` in C-locale name order; exit 0 when all apply or there are none; exit 1 naming the first patch that fails.

- [ ] **Step 1: Write the failing test**

`tests/test-apply-patches.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
. tests/lib.sh
tmp="$(mktemp -d)"

# A toy git repo with one file, reset to "line1" before each case.
repo="$tmp/repo"
git init -q "$repo"
printf 'line1\n' > "$repo/a.txt"
git -C "$repo" add a.txt
git -C "$repo" -c user.name=t -c user.email=t@t commit -qm init
reset_repo() { git -C "$repo" checkout -q -- . && git -C "$repo" clean -qfd; }

# Patch "first" turns line1 into line2; patch "second" turns line2 into line3.
# "second" only applies after "first", which proves the order.
mkdir -p "$tmp/p-order" "$tmp/p-empty" "$tmp/p-bad" "$tmp/p-readme"
printf 'line2\n' > "$repo/a.txt"; git -C "$repo" diff > "$tmp/p-order/0002-first.patch"
git -C "$repo" add a.txt; printf 'line3\n' > "$repo/a.txt"; git -C "$repo" diff > "$tmp/p-order/0010-second.patch"
git -C "$repo" reset -q; reset_repo
cp "$tmp/p-order/0010-second.patch" "$tmp/p-bad/0001-needs-line2.patch"
echo "notes" > "$tmp/p-readme/README.md"

expect_ok "no patches: succeeds" scripts/apply-patches.sh "$repo" "$tmp/p-empty"
expect_output "no patches: tree unchanged" "line1" cat "$repo/a.txt"

expect_ok "only a README: succeeds" scripts/apply-patches.sh "$repo" "$tmp/p-readme"
expect_output "only a README: tree unchanged" "line1" cat "$repo/a.txt"

expect_ok "two patches: succeed" scripts/apply-patches.sh "$repo" "$tmp/p-order"
expect_output "two patches: applied in name order" "line3" cat "$repo/a.txt"
reset_repo

expect_fail "bad patch: fails" scripts/apply-patches.sh "$repo" "$tmp/p-bad"
reset_repo
expect_output_contains "bad patch: named in the error" "0001-needs-line2.patch does not apply" \
  scripts/apply-patches.sh "$repo" "$tmp/p-bad"
reset_repo

expect_fail "missing arguments: fails" scripts/apply-patches.sh "$repo"

rm -rf "$tmp"
finish
```

- [ ] **Step 2: Run it to see it fail**

Run: `tests/run-all.sh`
Expected: `test-apply-patches.sh` FAIL lines, exit 1.

- [ ] **Step 3: Write `scripts/apply-patches.sh`**

```bash
#!/usr/bin/env bash
# Apply every *.patch in PATCH_DIR to the git tree at VLC_DIR, in name order.
# Stops at the first patch that doesn't apply and names it.
set -euo pipefail
if [ $# -ne 2 ]; then
  echo "usage: apply-patches.sh VLC_DIR PATCH_DIR" >&2
  exit 1
fi
vlc_dir="$1"
patch_dir="$2"
export LC_ALL=C
shopt -s nullglob
patches=("$patch_dir"/*.patch)
if [ ${#patches[@]} -eq 0 ]; then
  echo "apply-patches: no patches in $patch_dir, building stock VLC"
  exit 0
fi
for p in "${patches[@]}"; do
  name="$(basename "$p")"
  echo "apply-patches: $name"
  if ! git -C "$vlc_dir" apply --whitespace=nowarn "$(realpath "$p")"; then
    echo "apply-patches: $name does not apply to this VLC commit" >&2
    exit 1
  fi
done
```

```bash
chmod +x scripts/apply-patches.sh tests/test-apply-patches.sh
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `tests/run-all.sh`
Expected: all `ok`, exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "Add apply-patches.sh" && git push
```

---

### Task 3: `read-image.sh`

**Files:**
- Create: `scripts/read-image.sh`, `tests/test-read-image.sh`

**Interfaces:**
- Produces: `scripts/read-image.sh CI_YML`: prints the `VLC_WIN64_IMAGE` value (quotes removed) to stdout, exit 0; exit 1 if missing or not under `registry.videolan.org/`.

- [ ] **Step 1: Write the failing test**

`tests/test-read-image.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
. tests/lib.sh
tmp="$(mktemp -d)"
img=registry.videolan.org/vlc-debian-win64-posix:20260611225331

# Same shape as the top of VLC's extras/ci/gitlab-ci.yml.
cat > "$tmp/real.yml" <<EOF
variables:
    VLC_WIN64_IMAGE: $img
    VLC_WIN_LLVM_MSVCRT_IMAGE: registry.videolan.org/vlc-debian-llvm-msvcrt:20260611225331
EOF
cat > "$tmp/quoted.yml" <<EOF
variables:
    VLC_WIN64_IMAGE: "$img"
EOF
cat > "$tmp/missing.yml" <<EOF
variables:
    VLC_DEBIAN_IMAGE: registry.videolan.org/vlc-debian-unstable:20260611225331
EOF
cat > "$tmp/elsewhere.yml" <<EOF
variables:
    VLC_WIN64_IMAGE: docker.io/someone/vlc:latest
EOF

expect_output "reads the image" "$img" scripts/read-image.sh "$tmp/real.yml"
expect_output "strips quotes" "$img" scripts/read-image.sh "$tmp/quoted.yml"
expect_fail "missing variable: fails" scripts/read-image.sh "$tmp/missing.yml"
expect_output_contains "missing variable: says so" "no VLC_WIN64_IMAGE" scripts/read-image.sh "$tmp/missing.yml"
expect_fail "image outside registry.videolan.org: fails" scripts/read-image.sh "$tmp/elsewhere.yml"
expect_fail "missing file: fails" scripts/read-image.sh "$tmp/nope.yml"

rm -rf "$tmp"
finish
```

- [ ] **Step 2: Run it to see it fail**

Run: `tests/run-all.sh`
Expected: `test-read-image.sh` FAIL lines, exit 1.

- [ ] **Step 3: Write `scripts/read-image.sh`**

```bash
#!/usr/bin/env bash
# Print the Windows x86_64 build image VLC's own CI uses, read from its gitlab-ci.yml.
set -euo pipefail
ci="${1:?usage: read-image.sh path/to/gitlab-ci.yml}"
if [ ! -f "$ci" ]; then
  echo "read-image: $ci not found" >&2
  exit 1
fi
img="$(sed -n 's/^[[:space:]]*VLC_WIN64_IMAGE:[[:space:]]*//p' "$ci" | head -n 1 | tr -d "\"'[:space:]")"
if [ -z "$img" ]; then
  echo "read-image: no VLC_WIN64_IMAGE in $ci" >&2
  exit 1
fi
case "$img" in
  registry.videolan.org/*) echo "$img" ;;
  *) echo "read-image: unexpected image '$img', expected one from registry.videolan.org" >&2; exit 1 ;;
esac
```

```bash
chmod +x scripts/read-image.sh tests/test-read-image.sh
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `tests/run-all.sh`
Expected: all `ok`, exit 0.

- [ ] **Step 5: Check it against VLC's real file**

```bash
curl -sS https://raw.githubusercontent.com/videolan/vlc/9e59d4b38f804b33491b332df7643c1f80cc0b57/extras/ci/gitlab-ci.yml -o /tmp/vlc-ci.yml
scripts/read-image.sh /tmp/vlc-ci.yml
```

Expected: `registry.videolan.org/vlc-debian-win64-posix:20260611225331`

- [ ] **Step 6: Commit and push**

```bash
git add -A && git commit -m "Add read-image.sh" && git push
```

---

### Task 4: `check-package.sh`

**Files:**
- Create: `scripts/check-package.sh`, `tests/test-check-package.sh`

**Interfaces:**
- Produces: `scripts/check-package.sh ZIP`: exit 0 and prints `check-package: ok (N files)` if every required file is present exactly one folder below the zip root; else exit 1 with one `missing: <path>` line per absent file.

- [ ] **Step 1: Write the failing test**

`tests/test-check-package.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
. tests/lib.sh
tmp="$(mktemp -d)"

# make_zip OUT TOPDIR FILE...: a zip holding empty files under TOPDIR/.
make_zip() {
  python3 - "$@" <<'PY'
import sys, zipfile
out, top, files = sys.argv[1], sys.argv[2], sys.argv[3:]
with zipfile.ZipFile(out, "w") as z:
    for f in files:
        z.writestr(f"{top}/{f}", b"")
PY
}
all=(vlc.exe libvlc.dll libvlccore.dll plugins/gui/libqt_plugin.dll plugins/codec/libavcodec_plugin.dll lua/intf/http.lua)

make_zip "$tmp/good.zip" vlc-4.0.0-dev "${all[@]}"
make_zip "$tmp/othertop.zip" vlc-4.1.0-dev "${all[@]}"
make_zip "$tmp/noqt.zip" vlc-4.0.0-dev vlc.exe libvlc.dll libvlccore.dll plugins/codec/libavcodec_plugin.dll
make_zip "$tmp/deep.zip" vlc-4.0.0-dev/extra "${all[@]}"
make_zip "$tmp/wrongplace.zip" vlc-4.0.0-dev plugins/vlc.exe libvlc.dll libvlccore.dll \
  plugins/gui/libqt_plugin.dll plugins/codec/libavcodec_plugin.dll
echo "not a zip" > "$tmp/fake.zip"

expect_ok "complete zip: passes" scripts/check-package.sh "$tmp/good.zip"
expect_ok "any top folder name: passes" scripts/check-package.sh "$tmp/othertop.zip"
expect_fail "no Qt interface: fails" scripts/check-package.sh "$tmp/noqt.zip"
expect_output_contains "no Qt interface: names it" "missing: plugins/gui/libqt_plugin.dll" \
  scripts/check-package.sh "$tmp/noqt.zip"
expect_fail "files two folders down: fails" scripts/check-package.sh "$tmp/deep.zip"
expect_fail "vlc.exe in the wrong folder: fails" scripts/check-package.sh "$tmp/wrongplace.zip"
expect_fail "not a zip: fails" scripts/check-package.sh "$tmp/fake.zip"
expect_fail "missing file: fails" scripts/check-package.sh "$tmp/nope.zip"

rm -rf "$tmp"
finish
```

- [ ] **Step 2: Run it to see it fail**

Run: `tests/run-all.sh`
Expected: `test-check-package.sh` FAIL lines, exit 1.

- [ ] **Step 3: Write `scripts/check-package.sh`**

```bash
#!/usr/bin/env bash
# Check a VLC Windows zip holds the files a working player needs.
set -euo pipefail
zip="${1:?usage: check-package.sh vlc-VERSION-win64.zip}"
if [ ! -f "$zip" ]; then
  echo "check-package: $zip not found" >&2
  exit 1
fi
if ! list="$(unzip -Z1 "$zip" 2>/dev/null)"; then
  echo "check-package: $zip is not a readable zip" >&2
  exit 1
fi
required=(
  vlc.exe
  libvlc.dll
  libvlccore.dll
  plugins/gui/libqt_plugin.dll
  plugins/codec/libavcodec_plugin.dll
)
missing=0
for f in "${required[@]}"; do
  # Each file must sit exactly one folder below the zip root, e.g. vlc-4.0.0-dev/vlc.exe.
  if ! printf '%s\n' "$list" | grep -qxE "[^/]+/${f//./\\.}"; then
    echo "missing: $f" >&2
    missing=$((missing + 1))
  fi
done
if [ "$missing" -gt 0 ]; then
  echo "check-package: $zip is missing $missing required file(s)" >&2
  exit 1
fi
echo "check-package: ok ($(printf '%s\n' "$list" | wc -l) files)"
```

```bash
chmod +x scripts/check-package.sh tests/test-check-package.sh
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `tests/run-all.sh`
Expected: all `ok`, exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "Add check-package.sh" && git push
```

---

### Task 5: The build workflow, and the first real build

**Files:**
- Create: `scripts/container-build.sh`, `.github/workflows/build-win64.yml`

**Interfaces:**
- Consumes: `read-commit.sh`, `apply-patches.sh`, `read-image.sh`, `check-package.sh` exactly as above.
- Produces: a GitHub release tagged `build-<first 9 of sha>-run<run number>`, marked pre-release, with one asset `vlc-<VERSION>-win64-<first 9 of sha>.zip`.

- [ ] **Step 1: Write `scripts/container-build.sh`**

```bash
#!/usr/bin/env bash
# Runs inside VLC's Windows build image, with the VLC source as the current folder.
# build.sh -r builds in release mode and runs `make package-win32`, which writes
# win64/vlc-<VERSION>-win64.zip (plus a .7z and an installer we don't publish).
set -euo pipefail
# The source is owned by the runner's user, not root; let git work on it anyway.
git config --global --add safe.directory '*'
extras/package/win32/build.sh -a x86_64 -r -p
ls -l win64/vlc-*-win64.zip
```

```bash
chmod +x scripts/container-build.sh
```

- [ ] **Step 2: Write `.github/workflows/build-win64.yml`**

```yaml
name: Build VLC for Windows
on:
  workflow_dispatch:
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 300
    steps:
      - uses: actions/checkout@v4

      - name: Unit tests
        run: tests/run-all.sh

      - name: Free disk space
        run: |
          sudo rm -rf /usr/share/dotnet /usr/local/lib/android /opt/ghc /opt/hostedtoolcache/CodeQL
          df -h /

      - name: Read pinned VLC commit
        id: pin
        run: |
          sha="$(scripts/read-commit.sh VLC_COMMIT)"
          echo "sha=$sha" >> "$GITHUB_OUTPUT"
          echo "short=${sha:0:9}" >> "$GITHUB_OUTPUT"

      - name: Download VLC source
        run: |
          git init -q vlc
          git -C vlc remote add origin https://github.com/videolan/vlc.git
          git -C vlc fetch -q --depth 1 origin "${{ steps.pin.outputs.sha }}"
          git -C vlc checkout -q FETCH_HEAD

      - name: Apply patches
        run: scripts/apply-patches.sh vlc patches

      - name: Pick VLC's build image
        id: image
        run: |
          name="$(scripts/read-image.sh vlc/extras/ci/gitlab-ci.yml)"
          echo "name=$name" >> "$GITHUB_OUTPUT"

      - name: Build inside VLC's image
        run: |
          docker run --rm --user root \
            -v "$PWD/vlc:/vlc" -v "$PWD/scripts:/scripts:ro" -w /vlc \
            "${{ steps.image.outputs.name }}" /scripts/container-build.sh

      - name: Check the zip
        id: zip
        run: |
          src="$(ls vlc/win64/vlc-*-win64.zip)"
          scripts/check-package.sh "$src"
          out="$(basename "$src" .zip)-${{ steps.pin.outputs.short }}.zip"
          cp "$src" "$out"
          echo "file=$out" >> "$GITHUB_OUTPUT"

      - name: Publish release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "build-${{ steps.pin.outputs.short }}-run${{ github.run_number }}" \
            "${{ steps.zip.outputs.file }}" \
            --prerelease \
            --title "VLC 4 build ${{ steps.pin.outputs.short }} (run ${{ github.run_number }})" \
            --notes "VLC commit ${{ steps.pin.outputs.sha }}. Unzip and run vlc.exe."
```

- [ ] **Step 3: Check the tests still pass, then commit and push**

```bash
tests/run-all.sh
git add -A && git commit -m "Add the Windows build workflow" && git push
```

- [ ] **Step 4: Start the first build**

Use the GitHub MCP tool `actions_run_trigger` on `build-win64.yml`, ref `main`. Note the run ID.

- [ ] **Step 5: Wait for it, then read the result**

Don't poll in a loop. Schedule a `send_later` check-in 60 minutes out, end the turn, and on wake use `actions_get` for the run's status. On failure, read the failing step's log with `get_job_logs`.

Expected failures to recognise and their fixes (fix, push, re-run; each fix gets its own commit):
- **"Download VLC source" fails fetching by hash:** the mirror refused a fetch by commit. Fix: fetch `master` with `--depth 200` and `git checkout <sha>`.
- **"Build inside VLC's image" can't pull the image:** GitHub runners can't reach `registry.videolan.org`. This is a spec risk; stop and tell Nathan. Fallback to propose: build the image from VLC's Dockerfile in the `videolan/docker-images` repo.
- **`build.sh` rebuilds all the contribs from source** (log shows long contrib compiles, "prebuilt" failed): no prebuilt package exists for this commit. Fix: move `VLC_COMMIT` to a slightly older master commit whose prebuilt exists, or let it run (hours, within the 300-minute limit).
- **Out of disk** ("No space left on device"): add more removals to "Free disk space" (`/usr/local/share/boost`, `/usr/local/lib/node_modules`, `docker image prune -af` before the build).
- **Packaging fails inside `build.sh` (`make package-win32`), for example a missing `7z` or `makensis`:** read the log. The zip is all we need, so the fix is to stop `build.sh` packaging (drop `-r`, pass `--disable-debug` another way) and run `make package-win32-zip` in `container-build.sh`.
- **`check-package.sh` reports a missing file:** list the zip (`unzip -Z1`) in the log to see the real layout. If the file simply moved upstream, update `required` in `check-package.sh` and its test together. If the Qt plugin really is missing, the build is broken: find out why from the configure output.

- [ ] **Step 6: Record the result**

Once green: note the run time and the zip size from the run and release pages.

---

### Task 6: Nathan's test on the Surface, and the vault

**Files (vault repo `the-beasts-brain`):**
- Modify: `04 - Resources/VLC build pipeline.md`, `04 - Resources/Building VLC for Windows.md`, `04 - Resources/04 - Resources.md`, `Active Priorities.md`, today's daily note

- [ ] **Step 1: Hand over to Nathan**

Send him: the release link, and the three install steps from the repo README. Ask him to open it and play a video.

- [ ] **Step 2: If it crashes too**

Same checks as on 2026-09-25: Windows crash log (`Get-WinEvent -FilterHashtable @{LogName='Application'; Id=1000} -MaxEvents 3`), `$env:QSG_RHI_BACKEND="d3d11"` then `"opengl"`, and a missing Intel graphics driver. If the old installer crashed for the same reason, the fix is on the Surface, not in the build.

- [ ] **Step 3: Update the vault once it works**

- [[VLC build pipeline]]: status line "Built and verified <date>", the run time, and the repo link.
- [[Building VLC for Windows]]: a callout at the top: "Retired 2026-09-xx. VLC is now built by [[VLC build pipeline]]. This note is kept for the history and the MSYS2 fixes."
- `04 - Resources` index: update both entries.
- [[Active Priorities]]: tick the rebuild item and add sub-project 2 (swipe to seek) as the next open item.
- Today's daily note: a session with what was built and verified.

- [ ] **Step 4: Commit and push the vault**

Per [[Vault backup]].
