---
status: active
project: personal
type: job
created: 2026-09-04
---
# Building tiny11 images

Master note for building a debloated Windows 11 install image with
[tiny11builder](https://github.com/ntdevlabs/tiny11builder) on this machine. Status as of
2026-09-04: **staged and ready, build not yet run.**

## Where everything is

- **Build folder: `H:\tiny11builder\`** (scripts, `autounattend.xml`, `oscdimg.exe`, and
  `TINY11 - FULL INSTRUCTIONS.txt`, the master copy of the step-by-step for Nathan).
- **Source zip:** `C:\Users\badbo\Downloads\tiny11builder-6584d2f432b3acf83fc40bfc64da60b453eb9f09.zip`
  (upstream commit `6584d2f`, dated 2025-09-06).
- **Source ISO:** `E:\windows images-iso recovery\Win11_English_x64v1.iso`.
- **Rufus:** `E:\tools\rufus-3.18.exe` (already on disk, no download needed).
- **Output:** `H:\tiny11builder\tiny11.iso`, log at `H:\tiny11builder\tiny11.log`.

## Why H: and not C:

The script's scratch space defaults to `$PSScriptRoot`, the folder the script sits in. The
build copies the whole ISO, mounts the WIM, and exports a new one, so it needs roughly
25 to 30 GB. **C: only has 16.9 GB free**, so running it from a folder on C: would fail
partway and leave a mounted WIM wedged. Keeping the whole folder on `H:` (191 GB free)
makes the default correct and needs no `-ScratchDisk` parameter, which matters because
the script's own admin self-relaunch drops any parameters it was given.

## Picking a source ISO

Read the ISO's volume label from the primary volume descriptor rather than trusting the
filename: open the file, seek to byte 32768, and the 32-byte volume identifier is at
offset 40 within that sector, with the creation timestamp at offset 813. A genuine
Microsoft consumer Windows 11 ISO reads `CCCOMA_X64FRE_EN-US_DV9`.

**Feed tiny11 only a clean Microsoft ISO.** Repacks (pre-activated, "TPM bypassed",
Office slipstreamed) already carry someone else's registry edits and activators; layering
DISM surgery on top produces an image where nothing can be attributed when it misbehaves.
Of the five Windows 11 ISOs in `E:\windows images-iso recovery\`, only
`Win11_English_x64v1.iso` is clean. One of them (`Windows 11 x64 - TheWindowsForum.com.iso`)
wears the genuine `CCCOMA` label but is dated 2021-05-31, a week before Windows 11 was
announced, so it is the leaked 21996 pre-release. `W11.OFF21.ENU.APR2022.ISO` has no
readable volume descriptor at all and is likely truncated.

The clean one is 21H2 (build 22000, November 2021), out of support since October 2023.
Fine as a base, but the resulting machine has four years of updates to catch up on.

## Internet use: effectively zero

The whole of `tiny11maker.ps1` makes exactly one network call, at line 329: it downloads
`oscdimg.exe` (143,360 bytes) from Microsoft's symbol server to build the final ISO, and
only if that file is not already sitting next to the script. **It has been pre-downloaded
into `H:\tiny11builder\`, so the build is now fully offline.** Everything else is local
DISM work. (The .NET 3.5 prompt that can pull from Windows Update is in
`tiny11Coremaker.ps1`, not the normal script.)

The real data cost comes later: a 21H2 image going online will pull several GB of
cumulative updates. Set the target machine's connection as metered, or keep it offline.

## Which script

- **`tiny11maker.ps1`** is the normal one. Removes Edge, OneDrive, Teams, Copilot, Xbox,
  Clipchamp, Maps, Mail and the rest, disables telemetry and sponsored apps, and bypasses
  the TPM, Secure Boot and RAM checks in both the setup image and the installed system.
  Updates and features still work afterwards.
- **`tiny11Coremaker.ps1`** additionally strips WinSxS, Defender, Windows Update and WinRE.
  Nothing can ever be added back. VM and testbed only.

## Running it

Needs an **elevated Windows PowerShell 5.1** (not PowerShell 7, the DISM cmdlets misbehave
there) and an execution policy above Restricted. The script auto-elevates by relaunching
itself, but launching an admin shell directly avoids the parameter loss. It prompts twice:
the mounted ISO's drive letter (letter only, no colon) and the image index for the edition,
which it lists first.

If a run dies partway, the image stays mounted and the next run fails on it:

```
Dismount-WindowsImage -Path H:\tiny11builder\scratchdir -Discard
```

then delete `H:\tiny11builder\tiny11` and `H:\tiny11builder\scratchdir`.

## Getting it onto another machine

Rufus writes `tiny11.iso` to a USB stick, which **erases the stick**, so anything staged on
it beforehand needs copying back afterwards. The image has the hardware-requirement
bypasses baked in already, so Rufus's own bypass checkboxes make no difference.

Two things worth carrying on the stick, because the fresh install cannot fetch them itself:

- **A browser installer.** tiny11 removes Edge, so the new machine has no browser at all.
  `E:\programs installs\programs setups\ChromeSetup.exe` is the 11 MB online stub, so it
  still needs about 100 MB of internet to complete. An offline installer would be better.
- **Network drivers** for the target machine, if its Wi-Fi or ethernet is not covered by
  the generic in-box drivers. Without a network there is no way to fetch them after the fact.

The bundled `autounattend.xml` is copied both to the image's Sysprep folder and to the ISO
root, so Setup reads it automatically: it forces image index 1, installs with `/compact`,
skips the product key prompt, and hides the online-account screens so OOBE goes straight to
a local account.

## Related

- [[Machine drives]] for what each drive letter currently is, and why they should not be
  trusted between reboots.
