---
status: completed
project: personal
type: guide
created: 2026-09-04
updated: 2026-09-22
wikilinks: [[Machine drives]]
---
# Building tiny11 images

Master note for building a debloated Windows 11 install image with
[tiny11builder](https://github.com/ntdevlabs/tiny11builder) on this machine.

**Status as of 2026-09-22: done.** The image was built, verified and written to a bootable
USB stick (2026-09-12), and the HP Pavilion TouchSmart was installed from it (steps given
2026-09-15; Nathan confirmed on 2026-09-22 that the install finished). See
"Writing the stick without Rufus" below for how the stick was made and the one trap in it.

## The finished image

`E:\windows images-iso recovery\tiny11_Win11Pro_21H2_22000.318.iso`, 5,144,289,280 bytes
(4.79 GB), built 2026-09-11 02:45.

Verified from inside the ISO on 2026-09-12 by mounting it and parsing the WIM header and
XML directly (`Get-WindowsImage` needs elevation, reading the header does not):

- `sources\install.wim` holds **exactly one** image, not the source ISO's eleven, so the
  DISM export worked.
- `DISPLAYNAME` Windows 11 Pro, `EDITIONID` Professional. The `NAME` field reads
  "Windows 10 Pro", which is the legacy internal string on 21H2 images and is normal.
  Setup shows the display name.
- Version 10.0.**22000**.318, branch `co_release`, which is Windows 11 21H2.
- `IMAGESTATE` is `IMAGE_STATE_GENERALIZE_RESEAL_TO_OOBE`, the correct sysprep state.
- 95,943 files across 21,851 directories, down from stock.
- `autounattend.xml` (2,000 bytes) present at the ISO root, plus `bootmgr`, `bootmgr.efi`
  and `efi\microsoft\boot\efisys.bin`, so it is bootable on UEFI.

Instructions for Nathan, rewritten to match reality, live beside it at
`E:\windows images-iso recovery\TINY11 - FULL INSTRUCTIONS.txt`.

## Two warnings that will bite if forgotten

**1. There is a second, dead tiny11 ISO on `E:`.** An earlier attempt around 2026-09-08 to
09-10 left `E:\windows images-iso recovery\tiny11 iso\`, an extracted ISO tree whose
`sources\install.wim` is a **208 byte stub**, and a 693 MB `tiny11.iso` built from it on
09-10 at 21:50. That ISO boots into Setup and then fails with no image to apply. The folder
was renamed on 2026-09-12 to **`tiny11 iso - BROKEN DO NOT USE`**. Delete it when Nathan
says so; until then the name is the guard.

**2. `D:` is no longer the USB stick.** The 2026-09-04 instructions told Nathan to point
Rufus at `D:` because `D:` was then a 28.9 GB Lexar flash drive. As of 2026-09-12 `D:` is a
238 GB Storage Space holding `Program Files`, `Program Files (x86)`, `Users`, `ProgramData`
and `WindowsApps` (Git itself is installed there). **Rufus against `D:` would destroy all of
it.** Identify the stick by size and label in Rufus, never by a remembered letter. See
[[Machine drives]].

## How the build actually ran (2026-09-11)

Not from the `H:\tiny11builder\` folder staged on 09-04. That folder is gone, recycled at
some point before 09-10; a copy of its contents survives in the recycle-bin recovery set at
`D:\downloads\C_Local Disk_2026-09-10_232719\Recycle Bin\C\tiny11builder\`.

The successful run used a **freshly downloaded** `tiny11.-.nov24.zip`
(`C:\Users\badbo\Downloads\`, 2026-09-11 00:00), extracted to
`C:\Users\badbo\Downloads\tiny11.-.nov24\tiny11builder-main\`. That fresh copy had intact
files, unlike the scrambled extraction that caused the confusion on 09-04.

- Elevated Windows PowerShell 5.1, transcript at `C:\tiny11.log` (11,878 bytes).
- Source ISO mounted at `G:`, image index **6** (Windows 11 Pro).
- Ran 02:29:24 to 02:45:44, sixteen minutes.
- Scratch went to `C:\tiny11` and `C:\scratchdir`; both were cleaned up by the script.
- It re-downloaded `oscdimg.exe` (143,360 bytes) because the pre-staged offline copy was on
  `H:`, not next to this script. So the "fully offline" work from 09-04 was wasted: about
  140 KB of data, not worth caring about, but the lesson is that the offline copy has to sit
  in **the same folder as the script actually being run**.

Two removal steps logged errors, both harmless: `Microsoft-Edge-Webview` and
`OneDriveSetup.exe` were "not found" under `C:\scratchdir\Windows\System32\`. Those paths
only exist on builds later than 22000, so there was nothing to delete. Everything else
reported `The operation completed successfully`, the image cleanup returned
`ImageHealthState : Healthy`, and the export, boot.wim pass and ISO creation all completed.

## Why the ISO is 4.79 GB and not the ~3.5 GB tiny11 advertises

This release exports the image to `install.wim` with max compression rather than converting
it to `install.esd` with recovery compression. The single edition strips to 13.69 GB
uncompressed (from 16.20 GB for stock Windows 11 Pro) and lands at 4.11 GB compressed.
Shrinking it further would mean a `/compress:recovery` re-export, which needs elevation and
another long DISM pass for no practical gain. Not worth it.

The one real consequence: `install.wim` at 4.11 GB is over the **4 GB FAT32 file limit**, so
Rufus will either format the stick NTFS or split the WIM. Take whatever Rufus picks by
default, both work on UEFI.

## Picking a source ISO

Read the ISO's volume label from the primary volume descriptor rather than trusting the
filename: open the file, seek to byte 32768, and the 32-byte volume identifier is at offset
40 within that sector, with the creation timestamp at offset 813. A genuine Microsoft
consumer Windows 11 ISO reads `CCCOMA_X64FRE_EN-US_DV9`.

**Feed tiny11 only a clean Microsoft ISO.** Repacks (pre-activated, "TPM bypassed", Office
slipstreamed) already carry someone else's registry edits and activators; layering DISM
surgery on top produces an image where nothing can be attributed when it misbehaves. Of the
Windows 11 ISOs in `E:\windows images-iso recovery\`, only `Win11_English_x64v1.iso` is
clean. One wears the genuine `CCCOMA` label but is dated 2021-05-31, a week before Windows
11 was announced, so it is the leaked 21996 pre-release. Another has no readable volume
descriptor at all and is likely truncated.

The clean one is 21H2 (build 22000, November 2021), out of support since October 2023. Fine
as a base, but the resulting machine has four years of updates to catch up on, which matters
because Nathan is rationing internet data. Keep the target machine offline or set its
connection as metered.

## Which script

- **`tiny11maker.ps1`** is the normal one, and the one that was used. Removes Edge, OneDrive,
  Teams, Copilot, Xbox, Clipchamp, Maps, Mail and the rest, disables telemetry and sponsored
  apps, and bypasses the TPM, Secure Boot and RAM checks in both the setup image and the
  installed system. Updates and features still work afterwards.
- **`tiny11Coremaker.ps1`** additionally strips WinSxS, Defender, Windows Update and WinRE.
  Nothing can ever be added back. VM and testbed only.

## Running it again some day

Needs an **elevated Windows PowerShell 5.1** (not PowerShell 7, the DISM cmdlets misbehave
there) and an execution policy above Restricted. The script auto-elevates by relaunching
itself, but launching an admin shell directly avoids the parameter loss, because the
self-relaunch drops any parameters it was given. It prompts twice: the mounted ISO's drive
letter (letter only, no colon) and the image index for the edition, which it lists first.

Scratch space is roughly 25 to 30 GB and defaults to the script's own drive. `C:` had about
26 to 30 GB free and it fit, but only just. Run it from `E:` or `H:` next time.

If a run dies partway, the image stays mounted and the next run fails on it:

```
Dismount-WindowsImage -Path <scriptfolder>\scratchdir -Discard
```

then delete the `tiny11` and `scratchdir` folders under the script's drive root.

## Writing the stick without Rufus (the method that worked, 2026-09-12)

Rufus is a GUI that needs a human at the keyboard. A UEFI Windows installer stick does not
actually need it: UEFI boots any removable FAT32 partition that has
`\EFI\BOOT\BOOTX64.EFI`, so copying the ISO's contents is enough. The only obstacle is that
`install.wim` is 4.11 GB, over the FAT32 4 GB file limit, so it has to be split into `.swm`
parts, which Windows Setup picks up automatically.

The working sequence, given a stick already FAT32 and empty:

1. Mount the ISO: `Mount-DiskImage -ImagePath <iso> -PassThru`, then read its letter from
   `Get-Volume`. Works unelevated.
2. Copy everything except the oversized file:
   `robocopy <iso>:\ <stick>:\ /E /XF install.wim /R:1 /W:1`. Works unelevated.
3. Split the image onto the stick, **elevated**:
   ```
   dism.exe /English /Split-Image /ImageFile:<iso>:\sources\install.wim ^
            /SWMFile:<stick>:\sources\install.swm /FileSize:3800 ^
            /LogPath:C:\Windows\Temp\split.log
   ```
4. Copy on the extras (browser installer, this job's instructions).

**The trap, and it cost a full diagnosis round: do not use the PowerShell
`Split-WindowsImage` cmdlet. Use `dism.exe /Split-Image`.** The cmdlet fails with a bare
`Access is denied. (0x80070005)` in about one second even from a process holding a genuine
administrator token, verified by checking `IsInRole(Administrator)` returning `True` in the
same process, and with `Get-WindowsImage` reading the very same file successfully one line
earlier. `dism.exe` with identical arguments, same elevated user, same source and
destination, completes normally. It is a cmdlet defect, not a permissions problem, so do not
waste time chasing permissions when it happens.

A second, smaller trap: unelevated, `Split-WindowsImage` fails earlier and differently, with
`Fail to write to the logfile: Access to the path 'C:\WINDOWS\Logs\DISM\dism.log' is denied`.
Passing `-LogPath` gets past that one and straight into the real access-denied above, which
makes the first error look like it was the whole problem. It is not.

Elevation from a Claude Code session works: `Start-Process powershell -Verb RunAs
-ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','<script>'` puts a UAC prompt
on Nathan's screen and runs properly once accepted. Have the script write its result to a
status file so the unelevated session can read the outcome.

### How to check the stick is actually good

Read the WIM header of each part directly, which needs no elevation. Bytes `0x28` and `0x2A`
are the part number and total parts, `0x2C` is the image count:

```
$fs=[System.IO.File]::OpenRead($path); $b=New-Object byte[] 208; $fs.Read($b,0,208); $fs.Close()
[BitConverter]::ToUInt16($b,0x28)   # part number
[BitConverter]::ToUInt16($b,0x2A)   # total parts
[BitConverter]::ToUInt32($b,0x2C)   # image count
```

A correct split reads part 1 of 2 and part 2 of 2, each with 1 image. Then confirm no file on
the stick is 4,294,967,295 bytes or larger, and that `efi\boot\bootx64.efi`, `sources\boot.wim`,
`bootmgr.efi`, `setup.exe` and `autounattend.xml` are all present.

### The one real limitation of doing it this way

**The stick is UEFI-only.** Copying files writes no MBR boot sector, so there is no legacy
BIOS boot path. If the target machine is old enough to be BIOS-only, or is stuck in CSM mode,
the stick will not appear in its boot menu and the job has to be redone with Rufus. The
partition is GPT with a Microsoft Basic Data GUID (`ebd0a0a2-...`), which is exactly what
Rufus creates in GPT/UEFI mode, so firmware compatibility is otherwise the same.

## The target machine: HP Pavilion TouchSmart 23-f200a

Confirmed with Nathan on 2026-09-12. A 2013 all-in-one, shipped with Windows 8 64-bit.

| | |
|---|---|
| CPU | Intel Pentium G2030, 2 cores / 2 threads, 3.0 GHz, 3 MB cache, Ivy Bridge (3rd gen) |
| RAM | 4 GB DDR3-1600, **2 slots, 16 GB maximum** |
| Disk | 500 GB SATA HDD, 7200 RPM |
| Graphics | NVIDIA GeForce 710A, 1 GB DDR3 (Kepler, GK208) |
| Display | 23 inch touchscreen, 1920 x 1080 |
| Network | Gigabit Ethernet (RJ-45) plus 802.11b/g/n Wi-Fi |
| USB | 4 x USB 2.0, 2 x USB 3.0 |

**UEFI is not a risk on this machine.** It shipped with Windows 8 64-bit, and Microsoft's
Windows 8 logo requirements made UEFI with Secure Boot mandatory, so the firmware is UEFI.
HP's own startup-menu documentation for the Pavilion 23 series shows F9 listing both "UEFI
Boot Sources" and "Legacy Boot Sources". The UEFI-only stick will boot.

Keys, tapped repeatedly from the moment it powers on:

- **Esc** opens the HP Startup Menu
- **F9** Boot Device Options (pick the entry prefixed `UEFI:`)
- **F10** BIOS Setup, where Secure Boot lives if it needs turning off

Secure Boot probably does not need turning off: tiny11 modifies `boot.wim`, not the
Microsoft-signed `bootx64.efi`, so the boot chain is still signed. Try it as-is first.

### What will actually be a problem, in order

1. **4 GB of RAM is the binding constraint.** Windows 11 on 4 GB is painful even debloated.
   Two DDR3-1600 slots taking up to 16 GB, and DDR3 is nearly free second-hand, so this is
   the single highest-value fix.
2. **No graphics driver on the image.** Kepler's last NVIDIA branch is R470, end-of-life in
   2024 but it does cover Windows 11. It will not be on a 21H2 image and the machine is
   meant to stay offline, so expect Microsoft Basic Display Adapter: a usable 1080p desktop
   with no acceleration, and rough video. The Ivy Bridge integrated graphics is equally
   unsupported, so there is no better fallback. Fetching the R470 driver is a few hundred MB,
   which matters while Nathan is rationing data.
3. **Use the Ethernet port, not the Wi-Fi.** A 2013 b/g/n card is a coin flip for in-box
   driver coverage on Windows 11; the Gigabit NIC almost certainly works out of the box.
4. **The 7200 RPM spinning disk.** Not fatal, and better than the 5400 RPM drive these
   often shipped with, but a cheap SATA SSD would do more for it than anything except the RAM.
5. **The CPU is the one thing no cheap fix touches.** A 2013 budget dual core with no
   hyperthreading. It is LGA1155, so an i5-3470 or i7-3770 is a theoretical drop-in, but
   that is real surgery on an all-in-one.

Touch should work: HP TouchSmart panels present as HID-compliant touch, which is in-box.

### What it is for, and what that changes (Nathan, 2026-09-12)

**A browsing and media box.** Not a second build machine. That settles two things the
generic advice had wrong:

- **"Keep it offline" does not apply.** A browsing box is online by definition, and 21H2
  left support in October 2023, so it stops getting security patches. Acceptable for a home
  machine behind NAT, but only with Defender left on (tiny11maker keeps it; only the Core
  script strips it) and the browser kept current, because the browser is the real attack
  surface on a machine that only browses. Worth one big update pass to a supported build
  when Nathan has data to spare: the upgrade bypasses are baked into the image and the
  G2030 has the POPCNT and SSE4.2 instructions newer builds require.
- **Video decode is the weak spot, and it is worse than it first looks.** With no NVIDIA
  driver there is no hardware decode at all, so a 2-core 3.0 GHz CPU does everything in
  software. 1080p H.264 is fine; VP9 and AV1 are not, and those are exactly what YouTube
  serves by default. **Forcing H.264 in the browser (h264ify or equivalent) is the single
  biggest difference between unwatchable and fine.** Installing the R470 driver later buys a
  smoother desktop and H.264 hardware decode but still not VP9 or AV1, because the 710A's
  video engine predates both. Force H.264 either way.
- For local files, VLC decodes 1080p H.264 in software comfortably on this CPU. Nathan
  already builds VLC on this machine, see [[Building VLC for Windows]].
- 4 GB of RAM plus Chrome is the daily annoyance. The RAM upgrade matters more for this use
  than for any other.

## Getting it onto another machine

Rufus (`E:\tools\rufus-3.18.exe`) writes the ISO to a USB stick, which **erases the stick**,
so anything staged on it beforehand needs copying back afterwards. Settings: GPT, UEFI (non
CSM), default file system. The image has the hardware-requirement bypasses baked in already,
so Rufus's own bypass checkboxes make no difference.

Two things worth carrying on the stick, because the fresh install cannot fetch them itself:

- **A browser installer.** tiny11 removes Edge, so the new machine has no browser at all.
  `E:\programs installs\programs setups\ChromeSetup.exe` is the 11 MB online stub, so it
  still needs about 100 MB of internet to complete. An offline installer would be better.
- **Network drivers** for the target machine, if its Wi-Fi or ethernet is not covered by the
  generic in-box drivers. Without a network there is no way to fetch them after the fact.

The bundled `autounattend.xml` is copied both to the image's Sysprep folder and to the ISO
root, so Setup reads it automatically: it forces image index 1, installs with `/compact`,
skips the product key prompt, and hides the online-account screens so OOBE goes straight to
a local account.

## Related

- [[Machine drives]] for what each drive letter currently is, and why they should not be
  trusted between reboots.
