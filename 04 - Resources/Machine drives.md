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

> **What the machine actually is (confirmed 2026-09-12): a Microsoft Surface Pro 7+.**
> Intel Tiger Lake, 8 GB RAM, 128 GB KIOXIA BG4A NVMe, chassis type 9 (laptop).
> **It has one USB-A port and one USB-C port.** Every other storage device on this machine
> therefore hangs off a chain of hubs, not because anyone chose that but because there is
> nowhere else to plug them. That single fact explains most of this note.
>
> **Current state (checked 2026-09-22, after the 09-15 rebuild onto tiny11 25H2).**
> Windows sees the battery again (`Win32_Battery` returns `SurfaceBattery`), so the
> invisible-battery fault went with the old install. `Program Files` and `Users` are back on
> the internal `C:` (profile `C:\Users\Fredy 2`), not on a USB drive. Mounted: `C:`, plus
> external `D:`, `F:`, `H:` on the hub tree. `E:` has no drive letter but is **not offline**
> (see "`E:` is deliberately dismounted" at the bottom). Disk numbers change between reboots:
> the Seagate was disk 3 before the 8:06 AM reboot on 09-22 and disk 1 after, so identify
> volumes by their volume ID, never by disk number. Everything else in this note up to "2026-09-16: after the rebuild" describes the
> pre-rebuild machine and is history, including the `badbo` paths.

> **Check what a drive letter actually is before writing to it, every single time.** `D:`
> meant three different things in ten days before the rebuild: a degraded Storage Space
> partition (09-02), a Lexar USB flash drive (09-04), and a single-SSD Storage Space holding
> `Program Files` and `Users` (09-12).

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
The drive reports healthy because the drive **is** healthy.

### The actual diagnosis (2026-09-12 02:54)

**It was never "twice". The drive re-enumerates constantly, and always has.** The System
event log tells the story: `Microsoft-Windows-Ntfs` event 98 ("Volume X is healthy") fires
on every *mount*, and the `\Device\HarddiskVolumeNNN` number climbs by one each time. Between
01:01 and 02:51 that number went from **173 to 254**, with `E:`, `F:` and `H:` remounting
together roughly **28 times in under two hours**, at intervals from 80 seconds to 20 minutes.
The `disk` error at 01:54:47 names `\Device\Harddisk2\DR102`, and that DR counter tracks the
same re-enumeration.

The two failures that were actually noticed only got noticed because they happened to land on
a file operation. The remounts at 02:15:04 and 02:39:33 are the recoveries from them.

**The decisive clue is when it does NOT drop.** There are zero remounts during the 7-minute
robocopy (01:50 to 01:57) and zero during the 11-minute DISM split (02:01 to 02:12). It only
drops when idle. A loose cable fails under vibration and load; **this fails at rest, which is
the signature of power management, not a connector.**

Confirmed: **USB selective suspend was enabled** (index 1, AC and DC) and **hard disk idle
spindown was set to 30 minutes**. Windows was suspending the bridge, the bridge was not
resuming cleanly, so Windows tore the device down and re-enumerated it.

### The USB tree, as it really is

```
Intel USB 3.10 xHCI (DEV_9A13)
└── USB Root Hub (USB 3.0)
    └── Generic SuperSpeed USB Hub   [Genesys Logic 05E3:0626]
        └── USB Attached SCSI (UAS)  [Seagate 0BC2:331A, serial MSFT30NAABXV2R]
            └── Seagate Expansion Desk  ->  E:, F:, H:
```

The Seagate is genuine and uses UAS. It sits **behind a Genesys Logic hub**, not on the
machine directly.

### Correction: `D:` is not an internal SSD

The 09-12 entry above called `D:` a "single-SSD Storage Space" and implied it was internal.
**It is not.** The pool's only member is a **SanDisk SD7SB6S256G1122 enumerated as
`USBSTOR`**, sitting behind a cheap **ASMedia bridge (`USB\VID_174C&PID_55AA`) with the
fake serial `12345678934A`**. So `Program Files`, `Program Files (x86)`, `Users`,
`ProgramData` and `WindowsApps` live on a bare SSD in a no-name USB enclosure, on the same
hub tree that has been dropping out all night. That is considerably worse than "no
redundancy": if it drops out the way the Seagate does, software dies mid-execution.

### What was changed, 2026-09-12 02:54 (all reversible)

Applied from an elevated shell, verified by reading the settings back:

- **USB selective suspend: disabled**, AC and DC (`0x00000000` both).
- **Hard disk idle spindown: never**, AC and DC (`0x00000000` both, was `0x1e` = 30 min).
- Set `EnhancedPowerManagementEnabled`, `SelectiveSuspendEnabled`, `AllowIdleIrpInD3` and
  `DeviceSelectiveSuspended` to `0` under `Device Parameters` for: both USB 3.0 Root Hubs,
  the Genesys SuperSpeed hub, the Genesys USB2 hub, the Seagate UAS device, and the SanDisk
  bridge. These need a replug or a reboot to take effect; the powercfg changes were live
  immediately.

To undo: `powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3
48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1` (and `/setdcvalueindex`), then
`powercfg /setactive SCHEME_CURRENT`, plus `powercfg /change disk-timeout-ac 30`.

**How to check whether it worked**, at any time, without guessing:

```powershell
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Ntfs'; Id=98; StartTime=(Get-Date).AddHours(-1)} |
  Where-Object { $_.Message -match 'Volume (E|F|H):' } | Measure-Object
```

Zero over an idle hour means fixed. Anything repeating means it is the hub or the cabling
after all, and the next step is a powered hub or fewer devices in the chain.

**Result, measured at 03:21 on 2026-09-12:**

| Window | Length | Remounts of `E:`/`F:`/`H:` | `disk` controller errors |
|---|---|---|---|
| 01:00 to 02:54 (before the fix) | 114 min | **81** | 1 |
| 02:54 to 03:21 (after the fix) | 26 min | **0** | **0** |

At the pre-fix rate of 0.71 events per minute, twenty-six idle minutes should have produced
about eighteen. It produced none, and no controller errors either. **Power management was
the cause, and the fix works.** Confirmed twice: a live count at 03:11 and a separate
25-minute idle watch that ran to completion independently.

Worth noting that this was achieved by the `powercfg` half alone. The per-device registry
values have still not taken effect, because nothing has been replugged or rebooted since
they were written, so there is more headroom here once the machine restarts.

### The battery is invisible, and it matters for the drives (2026-09-12)

Nathan confirmed the Surface has a battery. Windows cannot see it. `Win32_Battery`,
`Win32_PortableBattery` and `root\WMI BatteryStatus` all return nothing or "invalid class".
`Get-PnpDevice -Class Battery` explains why:

- **Surface Battery** is `Present: False`, **Code 45**, "this hardware device is not
  connected to the computer".

And the cause is one level down, in the devices currently reporting errors:

- **Surface Serial Hub Driver: Code 10, "This device cannot start."**
- **Surface UEFI: Code 14**, "cannot work properly until you restart your computer"
- **Surface ME: Code 14**, same

The Surface Serial Hub is the bus carrying the Surface Aggregator Module, the embedded
controller that presents the battery, the keyboard cover and the thermal sensors to Windows.
**With that bus failing to start, the battery cannot enumerate, which is exactly the Code 45.**
Two firmware devices simultaneously asking for a restart says a Surface firmware or driver
update is staged and the machine has not been rebooted since.

**Why this belongs in a note about drives:** if Windows cannot see the battery, it believes
it is on permanent mains, so there is no low-battery warning and no graceful shutdown. Pull
the charger and the machine stops dead. With a 4 TB drive and the SSD that holds
`Program Files` both hanging off USB, an abrupt power cut mid-write is precisely how the
09-01 NTFS corruption happened. This is a live risk, not a cosmetic driver complaint.

**Next step: reboot the Surface.** It is needed three times over: to clear the two Code 14
firmware devices, to give the Surface Serial Hub a chance to start and bring the battery
back, and because the per-device USB power settings applied above only take effect on
re-enumeration. If the Serial Hub is still Code 10 after a restart, the repair is a Surface
driver and firmware pack (MSI) from Microsoft for the Pro 7+, which is a real download and
needs planning around Nathan's data.

Not done unilaterally at first: he was mid-job and a reboot reshuffles drive letters, which is
its own documented hazard on this machine. **Nathan asked for the restart at 03:24 on
2026-09-12 and it was carried out.**

#### State captured immediately before that restart (03:24:57)

Compare against this after the machine comes back. Both repos were clean and pushed first,
and there were no pending file-rename operations staged, so no half-applied update was in
flight.

- **Drive letters:** `C D E F H`. (`G:` absent because Nathan had unplugged the tiny11
  install stick.)
- **Devices in error:**
  - `Surface UEFI`, Firmware, **Code 14**, needs restart
  - `Surface ME`, Firmware, **Code 14**, needs restart
  - `Surface Serial Hub Driver`, System, **Code 10**, cannot start
  - `LogMeIn Hamachi Virtual Ethernet Adapter`, Net, **Code 22**, disabled (deliberate, ignore)
- **Surface Battery:** `Present: False`, **Code 45**
- USB fix holding: 0 remounts and 0 `disk` controller errors in the 26 minutes since 02:54,
  against 81 and 1 in the 114 minutes before.

#### What to check once it is back

1. **Drive letters first, before writing anything anywhere.** They move on this machine.
   `Get-Volume | Where-Object DriveLetter | Sort-Object DriveLetter`
2. **Did the two Code 14 firmware devices clear?**
   `Get-PnpDevice -PresentOnly | Where-Object Status -ne 'OK'`
   Hamachi at Code 22 is expected and fine.
3. **Did `Surface Serial Hub Driver` start?** If it is still Code 10, the battery will still
   be invisible and the repair is a Surface Pro 7+ driver and firmware pack (MSI) from
   Microsoft, which is a real download to plan around the data situation.
4. **Is the battery back?** `Get-PnpDevice -Class Battery` should show `Present: True`, and
   `Get-CimInstance Win32_Battery` should return something. Until it does, treat an unplug as
   an instant hard power cut with two USB drives mounted.
5. **Is the USB fix still holding, now that the per-device registry values have finally had a
   re-enumeration to take effect on?** Use the one-liner in the section above. Expect zero.

#### Result of the restart (checked 03:31 to 04:00, 2026-09-12)

- Restarted at 03:28:25. Drive letters came back identical: `C D E F H`.
- **The USB fix held through the reboot:** 3 mounts at boot (one each for E, F, H), both power
  settings still zero, and all six devices' registry values survived re-enumeration.
- **The restart fixed nothing else.** `Surface UEFI` and `Surface ME` are still Code 14, the
  Serial Hub is still Code 10, and the battery is still Code 45.
- **Why the firmware will not flash:** the UEFI capsule status for both reads `0xC00002DE`,
  which `certutil` decodes as `STATUS_INSUFFICIENT_POWER`. The running firmware is still UEFI
  32.103.143 and ME 15.0.2751.1; the staged 33.105.143 and 15.0.2834.2 were attempted and refused.

#### Root cause of the Serial Hub fault: IObit Driver Booster, 2026-08-28 19:23

- Every device on the Serial Hub (the battery, the Type Cover's `Surface Hid Mini Driver`,
  Surface Integration, the SMF clients) was last seen on 2026-08-21 and was **removed at 19:23 on
  2026-08-28.**
- The archived setup log `C:\Windows\INF\setupapi.dev.20260911_182232.log` shows **IObit
  Driver Booster 13.6.0** (`DpInstX64.exe`, extracting to `%TEMP%\Dbz*`) force-installing
  generic Intel drivers from 19:20 to 19:26 that evening, including **`iaLPSS2_UART2.inf`
  5.123.1.1030 onto the Serial IO UART at 19:23:26**. Windows itself ranked that driver
  "Outranked"; Driver Booster forced it in anyway.
- Before that, the UART was bound to `oem100.inf` (`tigerlakepch-lpsystemlpss.inf`), which for
  this device is a **null driver (`Needs_NO_DRV`)**. The Serial Hub worked with the UART left
  driverless from 2026-05-14 to 2026-08-28. A real UART driver taking the port away from it
  fits the Serial Hub's `STATUS_INVALID_DEVICE_REQUEST`.
- Driver Booster ran again on 2026-09-11 (eight `%TEMP%\Dbz*` folders, 17:28 to 19:36), and
  IObit Advanced SystemCare 19.5 is still installed and starts at every login.
- **The fix** is to put the UART back on `oem100.inf`, which is still in the driver store, as is
  Microsoft's `ialpss2_uart2_tgl.inf` (`oem2`). Not done: it was parked when the security
  incident was found, and this machine is going to be reinstalled anyway. See
  [[Security incident 2026-09-12]].

### What is still wrong even if the fix holds

A Surface Pro 7+ with two ports is carrying a 4 TB drive, a USB SSD holding the programs
directory, and a card reader, through daisy-chained no-name hubs. Power management was the
trigger, but the architecture is the underlying problem. In rough order of value:

1. Get `Program Files` and `Users` off a USB enclosure. That is the one that can corrupt
   running software rather than merely annoy.
2. A single **powered** (mains-adapter) USB 3 hub, straight into the USB-C port, replacing
   the daisy chain.
3. Retire the Genesys chain rather than adding to it.

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

## 2026-09-16: after the rebuild

The Surface was wiped and rebuilt onto tiny11 25H2 on 2026-09-15 (see
[[Security incident 2026-09-12]]). The Windows account is now `Fredy 2`, so the profile is
`C:\Users\Fredy 2`. **Everything above this section describes the old install.** Checked on
09-16 with `Get-Disk`, `Get-Partition`, `Get-Volume`, `mountvol`, `powercfg` and
`Get-PnpDevice`:

| Disk | Device | Size | Bus | Letters |
|---|---|---|---|---|
| 0 | KIOXIA KBG40ZNS128G NVMe | 119 GB | NVMe | `C:` |
| 1 | Seagate Expansion Desk | 3726 GB | USB | `E:` (no letter; see below), `H:`, `F:` |

- `C:` is partition 3 of disk 0, 118 GB.
- The Seagate's partitions, in on-disk order: **1 = `E:`** (1618 GB, File History), **2 = `H:`**
  (245 GB, label `H:`, holds `Surface backup 2026-09-12`), **3 = `F:`** (1863 GB, label
  `F: Private`). All three are on one USB cable, so none can be unplugged without the others.
- **`D:` reconnected and scanned 09-16.** The SanDisk case (the Storage Space that held the old
  `Program Files` and `Users`) was unplugged after the rebuild (the "Disk 3 has been surprise
  removed" event at 01:07:01 matches it coming out), then reconnected the same day and given a
  report-only Defender scan. One confirmed trojan and two likely-same-thing hits, all recovered
  copies of already-known-bad AOMEI repacks inside an AOMEI recovery set, plus six near-certain
  false positives on Git and Android Studio files. Full detail in
  [[Security incident 2026-09-12#2026-09-16: D: scanned after the rebuild]]. Quarantine of the
  three real hits is Nathan's call, still open.

### `E:` is deliberately dismounted

`E:` holds a Windows File History mirror of the whole old profile at
`E:\FileHistory\badbo\MAJESTICBEAST\`, including the known-bad
`AOMEI Partition Assistant Technician 10.10.1 Repack` and the
`Download Latest Cracks and Apps.url` lure. It shares a cable with the backup and the media, so
it was isolated in software instead of unplugged: `mountvol E: /P`, run elevated early on
09-16. Verified afterwards: the volume reads "not mountable until a volume mount point is
created", partition 1 has no letter and `IsOffline: True`, and `F:` and `H:` are
`Healthy / OK`.

**Correction, 2026-09-22: `/P` does not fully survive a reboot.** It was remounted on purpose
later on 09-16 for its scan and left mounted until 09-22, when Nathan ran `mountvol E: /P`
again. Straight after, `mountvol` showed "NOT MOUNTABLE UNTIL A VOLUME MOUNT POINT IS
CREATED" (fully offline). After the 8:06 AM reboot it showed "NO MOUNT POINTS" instead: still
no drive letter, but the volume is online and its folders can be listed through
`\\?\Volume{12920787-a58e-11f1-90b0-d4548b588599}\`. So what survives a reboot is "no letter",
not "offline". Nathan accepted that as enough on 09-22, and had the cracks lure on it and the
`C:` quarantine folder deleted instead (see [[Security incident 2026-09-12]]).

To check it, look the volume up by ID (disk numbers move): `mountvol` and find
`{12920787-...}`, or `Get-Volume | ? UniqueId -like '*12920787*'`.

**`E:` missing is intended, not a fault.** To remount it on purpose, from an elevated prompt:

```
mountvol E: \\?\Volume{12920787-a58e-11f1-90b0-d4548b588599}\
```

### The USB power fix, re-applied

The rebuild wiped the 09-12 fix, because power settings live in the Windows install, not on the
drive. Read back on 09-16: USB selective suspend was `1` (on) and disk spindown `0x1e`
(30 minutes), AC and DC, which is the exact pre-fix state. Nathan re-ran the `powercfg` half
from an elevated prompt, and all four values then read `0x00000000`. The per-device registry
values were not re-applied.

**Result:** an idle hour from 01:20:16 to 02:20:16 on 09-16 had **0** remounts and **0** `disk`
controller events. The fix holds on the rebuild. The check is now a saved script:

```
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\beast-jobs\remount-check.ps1" -Minutes 60
```

**For any future reinstall: re-apply this fix as part of setup, before trusting the Seagate.**

### The battery is back

Every Surface device on the rebuild reports `OK`, including `Surface Serial Hub Driver`,
`Surface UEFI`, `Surface ME` and `Surface Hid Mini Driver`. `Surface Battery` is
`Present: True`, and `Win32_Battery` returns a reading (49%, on AC, at the 09-16 check). No
present device of any class is in an error state. That fits the diagnosis above that the
Serial Hub fault was IObit Driver Booster's forced UART driver, which the wipe removed.
Windows can warn before the battery runs out again, so pulling the charger is no longer an
instant hard power cut with the Seagate mounted. **Never install IObit software on this
machine again** (step 16 of the reinstall plan).

### Still true from before

The architecture warning above still stands: a two-port Surface running a 4 TB drive through a
hub chain. The power fix stopped the idle drop-outs; it does nothing for loose cables. The hub
layout was not re-inspected on the rebuild. A single powered USB 3 hub is still the right
upgrade.

## Not yet known

Full contents of `E:`, `F:` and `H:`. Fill in once stable.
