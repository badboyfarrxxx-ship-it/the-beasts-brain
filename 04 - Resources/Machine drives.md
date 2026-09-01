---
status: active
project: meta
type: reference
---
# Machine drives

The machine (MajesticBeast) runs one internal NVMe SSD (`C:`, 119 GB) plus a stack
of USB drives hanging off a USB hub. As of 2026-09-02 the USB storage is in a bad
way: drives dropping out, a Storage Space degraded, drive letters reshuffling on
reboot. **Do not trust a drive letter to mean the same thing between reboots. Do
not write to `D:` or `G:` while the Storage Space is Incomplete.**

## The machine itself is fine

Windows is on `C:\WINDOWS`, profile `C:\Users\badbo`, `C:\msys64` present, `C:` healthy
with ~34 GB free. The vault and `my-agent` live on `C:` and are also in private GitHub
repos ([[Vault backup]]). The runnable VLC build is on `C:` (`C:\Users\badbo\Builds\VLC\vlc.exe`)
and works.

## Timeline

- **2026-09-01 11:50 PM** the volume then lettered `G:` (on the "Generic STORAGE DEVICE"
  USB drive, which also held `E:`) began logging NTFS structure corruption. ~4,000
  corruption events plus "Delayed Write Failed, data has been lost" warnings over the
  next few hours. That `G:` held `G:\vlc` (the VLC source tree, ~6.8 GB, with the two
  local source patches) and `G:\Builds\installer\` (~306 MB).
- A power-cycle of that drive did not help. It kept corrupting (578 events in 10 minutes).
- **2026-09-02 ~1:51 AM** Nathan restarted the machine.
- After the reboot the drive letters reshuffled and several USB devices did not come back.

## State after the reboot (2026-09-02 ~2 AM)

**Connected and working:**
- `C:` internal NVMe. Fine.
- `D:` and `G:` are now the **Storage Space** (a 2 TB Windows Storage Spaces virtual
  disk, two partitions 242 GB and 1051 GB). `D:` (~48 GB used: `torrents`, `FromOneDrive`,
  an old `msys64`, `WpSystem`, relocated Store-app folders) and `G:` (empty). The Space
  is **`{Degraded, Incomplete}` / Warning**: its 932 GB member "USB3.0 high speed" is
  `Warning / {Split, OK}`, its 466 GB member "ST500DM0" (Seagate Barracuda) is healthy.
  Readable right now, but Incomplete means writes are unsafe.

**Present in the registry but NOT enumerating (Status "Unknown"):**
- **"Generic STORAGE DEVICE"** (999 GB USB) which held the old `E:` and the corrupted
  old `G:` (the VLC source). Currently not connected as a working disk.
- **"Seagate Expansion Desk"** (4 TB USB) which before the reboot held the old `D:`,
  `H:`, and `F:` and was healthy. Now not enumerating.
- Several USB hubs and "Unknown USB Device (Device Descriptor Request Failed)" entries;
  `\Driver\WudfRd failed to load` warnings at boot. Points at a USB hub with power or
  enumeration problems.

## What is at risk

- **VLC source tree (`old G:\vlc`)**: on the "Generic STORAGE DEVICE" drive, which was
  corrupting and is now offline. Treat as lost. Rebuildable: the two patches are in
  [[Building VLC for Windows]], the runnable build is safe on `C:`, roughly one session
  to re-clone and re-patch.
- **The 4 TB "Seagate Expansion Desk"**: was healthy, now missing. Contents unknown.
  Needs Nathan to check its power and cable.
- **The Storage Space (`D:` / `G:`)**: running Incomplete. If it is a simple (non-redundant)
  Space, some data may already be inaccessible and any write risks loss. Do not write
  to it until its 932 GB member is healthy.

## What Nathan needs to decide / check

1. Physically: is there a powered USB hub or multi-bay dock? Check its power. Reseat
   the "Seagate Expansion Desk" (4 TB) and the "Generic STORAGE DEVICE" on a direct
   port. Report what comes back.
2. What is on the 4 TB Seagate, and is any of it the only copy?
3. Is the Storage Space meant to hold anything important, or is it scratch (torrents,
   caches, OneDrive overflow)? That decides how hard to work to repair it.
4. Whether the old VLC-source drive ("Generic STORAGE DEVICE") is worth any recovery
   effort, or written off.

## Not yet known

Full contents of every drive. This note should be completed once the storage is stable.
