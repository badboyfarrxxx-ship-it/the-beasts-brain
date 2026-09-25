---
status: active
project: meta
type: plan
created: 2026-09-25
---

# VLC build pipeline

Design spec, agreed with Nathan on 2026-09-25. It replaces the old method in [[Building VLC for Windows]], which compiled [[VLC]] on the Surface itself with MSYS2. That setup was wiped with the machine on 2026-09-15, and the installer it made crashes on launch on the rebuilt machine (cause not found yet).

Implementation plan: [[VLC build pipeline - implementation plan]] (written 2026-09-25).

## Goal

A newer VLC 4 build for the Surface, made by a repeatable process that needs nothing installed on the Surface. It is also the base for Nathan's own features later.

Done when:
- one click on [[GitHub]] builds VLC 4 at a pinned version and outputs a portable Windows zip
- Nathan unzips it on the Surface, runs `vlc.exe`, and the full interface opens and plays a video

## The larger plan

This is sub-project 1 of 4. Each of the others gets its own spec later, built as patches in the same repo.

1. **Build pipeline** (this note)
2. **Swipe to seek:** drag a finger left or right on the video to rewind or fast-forward
3. **Camera wall in VLC:** a grid of the house cameras' RTSP streams, same cameras as [[camera-wall]]
4. **Video editing:** scope to be agreed first (trimming and cutting is realistic; a full editor is not)

## Design

**Repo:** new private repo `badboyfarrxxx-ship-it/vlc-build`.

| path | what it is |
|------|------------|
| `VLC_COMMIT` | the exact VLC commit to build (from `master`, VLC 4.0 dev). Upgrading means changing this one line. |
| `patches/` | Nathan's changes as numbered patch files, applied in order. Empty at first. |
| `.github/workflows/build-win64.yml` | the build |
| `README.md` | how to run a build, upgrade, and add a patch |

**Build steps** (GitHub Actions, started by hand):
1. Run inside VLC's own Windows build image, `registry.videolan.org/vlc-debian-win64-posix`, at the tag VLC's `extras/ci/gitlab-ci.yml` uses for its pinned commit. This is the image VLC's official nightly Windows builds use.
2. Download VLC at `VLC_COMMIT`.
3. Apply every file in `patches/`. A patch that doesn't apply fails the build.
4. Run VLC's official script: `extras/package/win32/build.sh -a x86_64 -r -p`, which uses VLC's ready-made libraries, then package it as a portable zip.
5. Check the zip holds `vlc.exe`, `libvlc.dll`, `libvlccore.dll` and the Qt interface plugin. If any is missing, the build fails.
6. Publish the zip, named with the VLC version and commit, as a GitHub release: one download page per build, kept until deleted.

**What changes from the old method:**
- Qt is bundled inside VLC the way the official builds do it, so the two DLL-loading patches in [[vlc-source-patches]] should no longer be needed. They stay on file in case they are.
- There is no MSYS2 and no hand-patched Qt headers. The Surface only downloads and unzips.
- The output is a portable zip, not an installer. It doesn't clash with a normal VLC install and doesn't take over file types.

## Limits and risks

- **Build time:** private repos get a monthly allowance of free GitHub Actions minutes. Expected under an hour per build; the first build confirms the real figure. If builds eat the allowance, making the repo public removes the limit. VLC is open source under the GPL, so that is allowed.
- **Runner disk:** GitHub's standard runners have about 14 GB free. A VLC build with ready-made libraries should fit; if it doesn't, the workflow clears unused preinstalled tools first.
- **Registry access:** GitHub's runners have to be able to download VLC's build image from `registry.videolan.org`. The first build checks this.
- **VLC master moves:** a pinned commit keeps builds repeatable. An upgrade can break a patch; the build then fails at step 3 and the patch gets updated.

## Testing

- The build checks its own zip (step 5).
- The real test: Nathan uninstalls the crashing "VLC 4.0 dev", unzips the new build, opens it, and plays a video.

## After it works

- [[Building VLC for Windows]] gets a note at the top pointing here, and its MSYS2 method is marked retired.
- [[Dev machine setup]] needs no change, because nothing is installed on the Surface.
