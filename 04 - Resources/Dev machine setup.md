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

## Missing (checked 2026-09-22)

`gh` (GitHub CLI), an editor (no VS Code or Cursor), `ffmpeg` (the [[camera-wall]] needs it),
7-Zip, PowerShell 7, MSYS2 / gcc / cmake / make, Visual Studio Build Tools, .NET, Java, Rust,
Go, Docker, pnpm/yarn/bun.

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

## Plan

Not decided yet. Waiting on what kinds of programs Nathan wants to build, which decides the
heavy installs (Visual Studio Build Tools, MSYS2, Android tooling, Docker).
