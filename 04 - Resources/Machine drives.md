---
status: active
project: meta
type: reference
---
# Machine drives

The machine (MajesticBeast) runs one internal SSD and a stack of USB drives. As of
2026-09-02 several of the USB drives are failing. Diagnosis below.

## Drive map (2026-09-02)

| letter | disk | bus | size | holds | state |
|--------|------|-----|------|-------|-------|
| `C:` | 0, KIOXIA KBG40ZNS128G NVMe | internal | 119 GB (30 free) | Windows, `my-agent`, the vault, `C:\Users\badbo\Builds\VLC` (runnable VLC) | healthy |
| `D:` | 4, Seagate Expansion Desk | USB | 1618 GB (1063 free) | (Nathan to confirm contents) | healthy |
| `E:` | 2, "Generic STORAGE DEVICE" | USB | 196 GB (148 free) | (unknown) | **dirty, chkdsk needed** |
| `F:` | 4, Seagate Expansion Desk | USB | 1863 GB (577 free) | (Nathan to confirm) | healthy |
| `G:` | 2, "Generic STORAGE DEVICE" | USB | 803 GB | `G:\vlc` (VLC source tree + 2 local patches, ~6.8 GB), `G:\Builds\installer\` (~306 MB) | **NTFS corrupted, will not mount** |
| `H:` | 4, Seagate Expansion Desk | USB | 245 GB (245 free) | empty | healthy, usable as a recovery/backup target |
| (none) | 3, "Storage space" virtual | Storage Spaces | 2048 GB, two partitions 242 + 1051 GB | (unknown) | **offline, {Degraded, Incomplete}** |

## What is wrong

**G: (and E:) are on one failing USB enclosure ("Generic STORAGE DEVICE", disk 2).**
G: began logging NTFS structure corruption at **2026-09-01 11:50 PM** and had logged
**3,981 corruption events in 24 hours** plus repeated "Delayed Write Failed, data has
been lost" warnings. `Test-Path G:\` fails, the volume reports filesystem type
"Unknown". E: on the same physical disk carries a dirty bit.

**A Windows Storage Spaces pool is degraded.** The pool ("Storage pool", 1396 GB)
is built from a 500 GB Seagate Barracuda (ST500DM0, USB, healthy) plus a 932 GB
"USB3.0 high speed" drive that is now in **"Lost Communication"** state. With that
member gone the Storage Space (disk 3, the 242 + 1051 GB letter-less partitions) is
**Incomplete** and offline.

Nothing this agent did touched G: or the Storage Space. This is USB hardware or
connection failure.

## What is safe

- The **runnable VLC build** is on `C:` (`C:\Users\badbo\Builds\VLC\vlc.exe`), not affected.
- The **two VLC source patches** (`src/win32/plugin.c`, `bin/winvlc.c`) are written out
  in full in [[Building VLC for Windows]], so the source tree is re-clonable and
  re-patchable even if `G:\vlc` is lost. The `.exe` installer is rebuildable.
- The Obsidian vault and `my-agent` are on `C:` and now also in private GitHub repos
  ([[Vault backup]]).

## Recovery options for G: (Nathan's call, some are risky)

1. **Power-cycle the enclosure first.** Unplug the "Generic STORAGE DEVICE" USB drive,
   reconnect it to a different port with a different cable, ideally not through a hub.
   A flaky connection produces exactly this failure pattern and a clean reconnect
   sometimes brings the volume back readable. Non-destructive, try this before anything else.
2. If it mounts read-only after a reconnect, **copy `G:\vlc` and `G:\Builds` off to
   `H:` or `D:` immediately**, before any repair.
3. `chkdsk G: /f` attempts an in-place repair. On a drive that is actively failing this
   can also make recovery harder. Only after option 2, or if the data is judged not
   worth a recovery-tool effort.
4. If the data matters and chkdsk is too risky, image the partition read-only first
   (ddrescue or similar) and recover from the image.

The Storage Space returns only when its missing 932 GB member is reconnected and
communicating.

## Not yet known

What is on `D:`, `E:`, `F:`, and the offline Storage Space partitions. Nathan knows;
this note should be filled in.
