---
status: active
project: meta
type: reference
---
# Machine drives

The machine (MajesticBeast) runs one internal NVMe SSD (`C:`, 119 GB) plus a stack
of USB drives hanging off a USB hub. As of 2026-09-02 the USB storage is in a bad
way: drives dropping out, a Storage Space degraded, drive letters reshuffling on
reboot. **Do not trust a drive letter to mean the same thing between reboots.**

> **Read "2026-09-12: a Storage Space is back, and it is now load-bearing" at the bottom
> first. Everything above it about `D:` and `G:` is history.** `D:` has meant three
> different things in ten days: a degraded Storage Space partition (09-02), a Lexar USB
> flash drive (09-04), and now a healthy single-SSD Storage Space holding `Program Files`
> and `Users` (09-12). **Check what a letter actually is before writing to it, every single
> time.**

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

## 2026-09-04: only three disks attached

Checked with `Get-Disk` and `Get-StoragePool`. The picture is much simpler than on
2026-09-02, and much healthier:

| Disk | Device | Size | Bus | Health |
|---|---|---|---|---|
| 0 | KIOXIA KBG40ZNS128G NVMe | 119.2 GB | NVMe | Healthy |
| 1 | Seagate Expansion Desk | 3726 GB | USB | Healthy |
| 2 | Lexar USB Flash Drive | 28.9 GB | USB | Healthy |

Drive letters now:

- `C:` internal NVMe, **16.9 GB free**. Down from ~34 GB on 09-02, so it is getting
  tight. Anything large belongs on `H:` or `E:`.
- `D:` **the Lexar 28.9 GB USB flash drive**, FAT32, effectively empty. This is a
  removable stick (`DriveType 2`), not the old Storage Space partition that used to hold
  this letter. Currently staged as the install USB for [[Building tiny11 images]].
- `E:` 1618 GB Seagate partition, 1062 GB free. Media, ISOs, program installers,
  File History.
- `F:` 1863 GB Seagate partition, 576 GB free.
- `H:` 245 GB Seagate partition, 192 GB free. Holds `H:\tiny11builder\`.

**The Storage Space is gone from the system.** `Get-StoragePool` returns only
`Primordial`, and neither its 932 GB nor its 466 GB member disk is attached. `G:` no
longer exists.

**The dead "Generic STORAGE DEVICE" is also no longer attached**, so open item 1 from
2026-09-02 (unplug it) is resolved. It is not visible to Windows and is not corrupting
anything.

That clears open items 1 and 2 from the list above. The Storage Space still exists as
hardware somewhere and its degraded state was never repaired, so if those disks are
plugged back in, the old warnings apply again and the letters will move again.

## 2026-09-12: a Storage Space is back, and it is now load-bearing

Checked with `Get-Disk`, `Get-Volume`, `Get-StoragePool`, `Get-VirtualDisk` and
`Get-PhysicalDisk`. **The 09-04 picture above is out of date on two counts.**

| Disk | Device | Size | Bus | Letters |
|---|---|---|---|---|
| 0 | KIOXIA KBG40ZNS128G NVMe | 119.2 GB | NVMe | `C:` |
| 1 | Seagate Expansion Desk | 3726 GB | USB | `E:`, `F:`, `H:` |
| 3 | "Storage space" (virtual) | 238 GB | Spaces | `D:` |

- `C:` 117.9 GB, **30.4 GB free** (was 16.9 GB on 09-04; a 4.79 GB ISO was moved off it on
  09-12, and something else freed the rest).
- `D:` **the Storage Space**, 238 GB, 214.8 GB free.
- `E:` 1617.9 GB, 1015.7 GB free. Label "Emby/Plex". Media, ISOs, program installers,
  File History.
- `F:` 1863 GB, 576 GB free. Label "Plex/Emby".
- `H:` 245.1 GB, 239.8 GB free. Effectively empty now. The `H:\tiny11builder\` folder from
  09-04 is **gone**; a copy of its contents survives in a recycle-bin recovery set at
  `D:\downloads\C_Local Disk_2026-09-10_232719\Recycle Bin\C\tiny11builder\`.
- **The Lexar 28.9 GB flash drive is not attached.** No removable drive of any kind is
  attached. The only USB device is the 4 TB Seagate.

**`D:` is not the old degraded pool and not a USB stick.** It is a brand new `Simple`
virtual disk on a single **SanDisk SD7SB6S256G1122** (238.5 GB SSD), pool and disk both
reporting `OK / Healthy`. The old two-member pool with the faulted 932 GB "USB3.0 high
speed" member is gone.

**`D:` now holds installed software**, not scratch: `Program Files`, `Program Files (x86)`,
`Users`, `ProgramData`, `WindowsApps`, `DeliveryOptimization`, `winRAR`, `downloads`. Git
itself lives at `D:\Program Files\Git`.

Two things follow from that, and both matter:

1. **Any instruction that says "the USB stick is `D:`" is now a data-destruction
   instruction.** The 09-04 tiny11 instructions said exactly that and have been corrected.
   See [[Building tiny11 images]]. Identify removable media by size and label, never by a
   remembered letter. This is the third time in ten days that a letter has changed meaning.
2. **`Simple` resiliency means no redundancy.** One SSD, no mirror, no parity, and the
   programs drive sits on it. If that SanDisk fails, everything installed to `D:` is gone
   and has to be reinstalled. File History covers `C:\Users\badbo`, not `D:`. Worth deciding
   deliberately whether that is acceptable rather than discovering it the hard way.

### 2026-09-12: `E:` dropped off the bus TWICE in one session

**02:13** a `Copy-Item` from `E:` failed with `Cannot find drive. A drive with the name 'E'
does not exist.` **02:38** an edit to a file on `E:` failed with
`ENOENT: no such file or directory, lstat 'E:\windows images-iso recovery'`. Both times the
Seagate was back `Online / Healthy` within seconds of checking, with `E:`, `F:` and `H:` all
present, and no intervention of any kind.

Twice in twenty-five minutes, under nothing heavier than small file copies, is not a fluke.
The drive reports healthy because the drive **is** healthy; what is failing is the
connection, exactly as on 09-02.

It took a mounted ISO with it: the tiny11 image mounted at `I:` was gone when `E:` returned,
so anything depending on that mount had to be redone.

**The loose-USB fragility from 09-02 is not fixed, it is just quiet.** The whole 4 TB
Seagate, which is `E:`, `F:` and `H:`, hangs off one USB connection. When it blinks, three
drive letters vanish at once along with any ISO mounted from them. Two practical
consequences: do not leave a long job reading from `E:` unattended and assume it will
survive, and treat a sudden "drive does not exist" as a dropout to re-check rather than as
a missing file.

Item 5 on the 09-02 open list (get the hub or dock sorted) is still open and just earned
itself a fresh piece of evidence.

### Removable media attached 2026-09-12

- Disk 4, USB, 14.91 GB, single GPT partition, `G:`, FAT32, label `CCCOMA_X64F`. No
  manufacturer, model or serial reported, which is normal for a cheap USB controller.
  Written on 09-12 as the tiny11 install stick. See [[Building tiny11 images]].
- Note that `G:` is also the letter the source ISO mounted at during the 09-11 build. The
  same letter meaning two different things inside 24 hours, which is the point of the
  warning at the top of this note.

## Not yet known

Full contents of `E:`, `F:` and `H:`. Fill in once stable.
