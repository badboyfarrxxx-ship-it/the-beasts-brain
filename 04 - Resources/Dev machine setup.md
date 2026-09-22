---
status: active
project: meta
type: plan
created: 2026-09-22
---
# Dev machine setup

Master note for the [[Active Priorities]] item "get this computer set up as a machine for
building programs": what is installed on the Surface Pro 7+ (tiny11 25H2, 8 GB RAM), what is
missing, and what gets installed next. The Surface was wiped and rebuilt on 2026-09-15, so
anything from before that (the MSYS2 + Qt toolchain in [[Building VLC for Windows]], for
example) is gone unless listed below.

## Installed (checked 2026-09-22)

| Tool | Version | Notes |
|---|---|---|
| Git | 2.55.0 | `C:\Program Files\Git` |
| Node.js / npm | 24.19.0 / 11.17.0 | `C:\Program Files\nodejs` |
| Python | 3.12.10 | per-user install; `py` launcher too |
| uv | 0.12.15 | winget |
| winget | 1.29.290 | |
| Claude Code | 2.1.278 | `C:\Users\Fredy 2\.local\bin\claude.exe` |
| Codex CLI | 0.155.1 | |
| Windows Terminal | | `wt` |
| WSL | 2.7.14 | Ubuntu 26.04 registered again 2026-09-22 (see below) |
| VS Code | 1.138.0 | installed 2026-09-22, winget, user scope (`%LOCALAPPDATA%\Programs\Microsoft VS Code`) |
| GitHub CLI (`gh`) | 2.101.0 | installed 2026-09-22, winget, `C:\Program Files\GitHub CLI`. Signed in 2026-09-22 (see Plan) |
| ffmpeg / ffprobe | 9.0.2 (gyan.dev full build) | installed 2026-09-22, winget portable, on PATH via the WinGet package folder |
| 7-Zip | 26.03 | installed 2026-09-22, winget, `C:\Program Files\7-Zip`. Its installer does not add itself to PATH, so that folder was added to the user PATH by hand |

All four verified by running them from a fresh PATH. A shell that was already open before the
install won't see them until it is restarted.

## Missing (checked 2026-09-22)

PowerShell 7, MSYS2 / gcc / cmake / make, Visual Studio Build Tools, .NET, Java, Rust, Go,
Docker, pnpm/yarn/bun. None needed for web work; add when a project calls for one.

Disk: 56 GB free on `C:`. RAM is the real constraint (8 GB); see the note in `my-agent\CLAUDE.md`.

## WSL: Ubuntu registration lost and restored

The Ubuntu disk lives at `C:\Users\Fredy 2\WSL\Ubuntu\ext4.vhdx` (1.5 GB, from 2026-09-13),
on local storage on purpose. It was registered with `wsl --import-in-place` on 2026-09-16,
but on 2026-09-22 `wsl -l -v` showed no distributions at all, although the disk was intact.
Cause not known (there was a reboot at 8:06 AM that day). Fixed the same way, no admin needed:

```
wsl --import-in-place Ubuntu "C:\Users\Fredy 2\WSL\Ubuntu\ext4.vhdx"
```

Verified: `Ubuntu`, WSL version 2, boots, Ubuntu 26.04 LTS, default user `badboy`. If it
vanishes again after a reboot, that points at the registration itself not persisting, which
would need a proper look rather than re-importing every time.

## Programs already on `F:` (checked 2026-09-22)

`F:` ("F: Private", 1.3 TB used) is the Emby media library (`1 Entertainment`) plus private
media (`ACT`, not looked into). The only software is in `F:\New folder\`, copied off the old
install around 2026-09-16:

| Item | What it is | Verdict |
|---|---|---|
| `aaaaamy builds\VLC 4.0 dev setup\VLC-4.0-dev-setup.exe` | Nathan's own VLC 4.0 dev installer (unsigned, self-built) | SHA-256 matches the value recorded on 09-02 (`447a9601...`), so it is the verified build. Second copy of the one on `E:`. Installable as is. |
| `Microsoft Visual Studio\2022\BuildTools` (3.4 GB) + `Installer` | A copy of an *installed* Visual Studio 2022 Build Tools from the old `C:` | Not usable: a copied install has no registry or installer registration, and it came off the compromised machine. Reinstall fresh if needed. |
| `OllamaSetup.exe` (2 GB, 2026-05-09) | Ollama, runs AI models locally | Signature valid (Ollama Inc.). Four months old, and 8 GB RAM only runs small models. |
| `GlassWireSetup.exe` (84 MB) | Network monitor (who is using the connection) | Signature valid (Domotz Inc.). |
| `spacedesk_driver_Win_11_64_v2229...msi` (5 MB) | Use a phone or tablet as a second screen | Signature valid (Datronicsoft Inc.). |
| `platform-tools_r31.0.3-windows...zip` (11 MB) | Android `adb`/`fastboot` | From 2021, very old; get the current one from Google if needed. |
| `android-studio-panda4-patch1-windows.zip.crdownload` (829 MB) | An Android Studio download | Incomplete (`.crdownload`), unusable. |
| `fsa.zip` | | Empty (0 bytes). |

Signatures were checked with `Get-AuthenticodeSignature`; "Valid" means signed by that
company and unmodified since. Defender is on with signatures from 2026-09-22.

## Plan

**Decided 2026-09-22: web first.** Nathan's two most finished projects are web ([[camera-wall]],
Node + ffmpeg; Undermoot in [[colony-game]], three.js + Vite), Undermoot is the one meant for
sale, and web is the lightest stack on 8 GB. Heavy toolchains are added only when a real project
needs one.

- [x] VS Code, GitHub CLI, ffmpeg, 7-Zip (2026-09-22).
- [x] GitHub CLI signed in (2026-09-22, by Nathan with `gh auth login`, browser sign-in; the
  agent never handles the credentials). Account `badboyfarrxxx-ship-it`, token in the Windows
  keyring. Verified by reading jaredrhod/backtalk#54 through `gh`. GitHub work no longer needs
  the prefilled-link-in-Firefox workaround.
- [ ] Later, per project: the other items under "Missing".

Browsers here: **Firefox is the only real browser** (Microsoft Store version,
`%LOCALAPPDATA%\Microsoft\WindowsApps\firefox.exe`). Edge is not installed (tiny11 removes it,
checked 2026-09-22) although Windows still lists it as the default for web links, and there
is no Chrome. So launch Firefox by path rather than just "opening a link". The Claude app's
built-in browser pane is Chromium, but it caps WebGL pages at 30 fps: don't use it to measure
game performance.
