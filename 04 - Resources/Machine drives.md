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
- **2026-09-02 ~1:51 AM** Nathan restarted the machine. The letters reshuffled and
  several USB devices did not come back.
- Nathan then found the physical cause: **loose USB connections**. He reseated the
  4 TB Seagate and another drive, and they came back.

## State after the reseating (2026-09-02 ~2:30 AM)

**Connected and working:**
- `C:` internal NVMe. Fine.
- **4 TB "Seagate Expansion Desk" is back and healthy**, now lettered `E:` (1618 GB),
  `F:` (1863 GB), `H:` (245 GB). Different letters than before the reboot, drive is fine.
  `E:` holds the VLC installer package and File History.
- `D:` and `G:` are the **Storage Space** (2 TB, two partitions 242 + 1051 GB). `D:`
  (~48 GB used: `torrents`, `FromOneDrive`, an old `msys64`, relocated Store-app folders),
  `G:` empty. Still **`{Degraded, Incomplete}` / Warning**: its 932 GB member
  "USB3.0 high speed" is `Warning / {Split, OK}`, its 466 GB member "ST500DM0" is healthy.
  Readable, but do not write to `D:` or `G:` while it is Incomplete.

**Connected but dead:**
- **"Generic STORAGE DEVICE"** (999 GB USB, old `E:` + the corrupted VLC-source `G:`).
  Reconnected as disk 5, lettered `I:` and `J:`, but both partitions read "Unknown"
  filesystem / 0 bytes and it resumed logging NTFS corruption on contact (25 events in
  3 minutes). **Unplug it.** Not recoverable through Windows; any real recovery needs
  read-only imaging, done separately.
- USB hubs logged "Device Descriptor Request Failed" and `WudfRd failed to load` at
  boot. Likely a hub or a loose hub connection was the root cause of the whole episode.

## What is at risk

- **VLC source tree (`old G:\vlc`, 6.8 GB)**: on the "Generic STORAGE DEVICE" drive,
  which corrupted and is unrecoverable through Windows. **Lost.** Everything valuable
  off it survived: the runnable build is on `C:`, the installer package is on `E:`
  (see [[Building VLC for Windows]]), and the two source patches were captured by File
  History and are saved at [[vlc-source-patches]]. Rebuilding the tree is a re-clone
  plus re-patch, roughly one session, only needed to modify VLC further.
- **The Storage Space (`D:` / `G:`)**: running Incomplete. If it is a simple (non-redundant)
  Space, some data may already be inaccessible and any write risks loss. Do not write
  to it until its 932 GB member is healthy.

## Backups that already exist

- **Windows File History** runs to `E:\FileHistory\badbo\MAJESTICBEAST\`, backing up
  `C:\Users\badbo` (including the vault, `my-agent`, `Builds`, and the old `vlc` tree).
  Snapshots are timestamped, e.g. `vlc\src\win32\plugin (2026_08_29 02_24_57 UTC).c`.
  This is how the VLC patches were recovered. It only runs when `E:` (the 4 TB Seagate)
  is connected.
- The vault and `my-agent` are also in private GitHub repos ([[Vault backup]]).

## 2026-09-02 ~3 AM: D: copied to H:

At Nathan's request, `robocopy D:\ H:\` (copy, not move): 89,229 files / 49.8 GB,
verified matching (`torrents` 22.4 GB, `FromOneDrive` 11.2 GB, `WpSystem` 9.6 GB,
`msys64` 3.1 GB). `D:` was not cleared afterward (the bulk delete was blocked by a
safety classifier; Nathan to clear it manually or leave it, since the data is now
duplicated on the healthy `H:`).

Copying `D:\WpSystem` (which holds EFS-encrypted Store-app data) made Windows
auto-create an EFS certificate for the account and prompt to back it up. Nathan
exported it to `C:\Users\badbo\efs-recovery-badbo.pfx` (PKCS#12, AES256, his own
password, private key kept in the store). That `.pfx` still needs a copy off the
machine.

## Still open

1. **Unplug the "Generic STORAGE DEVICE"** (I:/J:). It is dead and corrupts on contact.
2. **The Storage Space** is still Degraded/Incomplete. Its 932 GB member is faulted
   (`{Split, OK}`, which usually means it was pulled while the pool was live). Options:
   reseat that member if it is also loose; if it is genuinely faulty, decide whether to
   repair the Space or retire it. `D:` looks like scratch (torrents, OneDrive overflow,
   an old msys64), so probably not worth much effort, and it is now copied to `H:` anyway.
3. **AOMEI Partition Assistant Technician 10.3.0** (installed 2026-09-01) was left with
   a Disk Clone Wizard open at the confirm screen. Not an AI action. Close it unless a
   clone is deliberately planned, and check source and destination first if it is.
4. Copy `C:\Users\badbo\efs-recovery-badbo.pfx` off the machine.
5. The whole USB setup is fragile: loose connections took down four drives at once.
   Worth getting the hub or dock sorted and keeping anything important off it.

## Not yet known

Full contents of `E:`, `F:`, `H:`, and the Storage Space. Fill in once stable.
