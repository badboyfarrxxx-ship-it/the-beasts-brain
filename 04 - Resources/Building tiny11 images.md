---
status: active
project: personal
type: guide
created: 2026-09-04
updated: 2026-09-12
wikilinks: [[Machine drives]]
---
# Building tiny11 images

Master note for building a debloated Windows 11 install image with
[tiny11builder](https://github.com/ntdevlabs/tiny11builder) on this machine.

**Status as of 2026-09-12: the image is BUILT and VERIFIED. What is left is writing it to
a USB stick and installing it on the second computer.** No USB stick is currently attached
to this machine, which is the only thing blocking the next step.

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
