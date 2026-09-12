---
status: active
project: meta
type: reference
created: 2026-09-12
---
# Security incident 2026-09-12: infostealer and remote-access tool

**Status as of 08:05 on 2026-09-12: CONTAINED, not clean.** The process was already gone at
07:42, the Startup shortcut and every dropped file are in
`C:\Users\badbo\QUARANTINE-2026-09-12-malware\` (moved, not deleted; never run anything in it),
and there are no connections to the control server. Defender checked at 08:05: real-time
protection, behaviour monitoring and Tamper Protection all on, quick scan finished 07:28.
**08:11:24: Nathan removed all four exclusions and all five Allow entries** from an admin
shell. Verified from Defender's event 5007 log, with protection still on afterwards.
**Still open:** credentials are unrotated, and the install still needs wiping.

**Allowed-threat list at 08:05, before removal** (all set to Allow, action 6). Someone removed three older Allow
entries at 07:24 (2147890949, 2147968251, 2147593794); the log doesn't say who. Five remain:
- `2147814523` Trojan:Win32/Wacatac.H!ml: **this incident**, allowed at 01:01:49.
- `242420` PUA:Win32/Presenoker: `OneDrive\Desktop\New folder\Patch.exe`, 2026-05-26.
- `452397` PUABundler BitTorrent: `D:\btweb_installer.exe`, 2026-06-05.
- `326563` PUABundler Yandex: an Internet Download Accelerator keygen installer on G:, 2026-06-12.
- `311958` PUABundler uTorrent: a cracked uTorrent Pro installer on G:, 2026-07-01.

**Older exclusions still active after 08:11** (from replaying every event 5007 back to 2026-05-14,
where the log starts; anything added before that date can only be seen from an admin shell):
- `G:\` and `H:\`, **whole drives**, added 2026-07-27 04:29. Nothing on either drive is scanned,
  and both hold cracks and activators. Scan them before anything on them touches the rebuilt
  machine.
- `Downloads\[FTUApps.com] - AOMEI Partition Assistant Technician Edition v10.3.0 [RePack]` and
  `Downloads\MRA.Auto.Updater`, added 2026-05-25.
- Legitimate, leave alone: `.gradle`, the Android SDK, Android Studio, and the three
  `AndroidStudioProjects\TVRecorderSwitch*` folders (Android Studio adds these itself).
- **Nathan removed all four at 08:21:47** (verified from event 5007). No exclusions from cracks
  or malware remain in the log's range.

**Drive letters drift, so those exclusions pointed at whatever held the letter in July.** At
08:25 on 09-12, `E:`, `F:` and `H:` are three partitions of the 4 TB Seagate, and `G:` (the old
160 GB drive the July crack installers came from) is not attached.
- `H:` (245 GB) holds only `CCCOMA_X64FRE_EN-US_DV9`, an unpacked Windows 11 21H2 installer.
  **Checked genuine:** `setup.exe`, `sources\setup.exe`, `setuphost.exe`, `bootx64.efi` and
  `bootmgr.efi` all carry valid Microsoft signatures, and `install.wim` is the standard
  11-edition image, build 22000.318. Unpacked 09-08, before the infection.
- **The crack stash is on `E:`**: `E:\margrat` (Dr.Fone and ReiBoot keygens and cracks, HEU KMS
  Activator), `E:\programs installs`, `E:\tools`, `E:\torrents`, and a
  `Download Latest Cracks and Apps.url` shortcut at the root. Never copy anything from these
  onto the rebuilt machine.
- `F:` is media only.

**Defender scans of the drives (report-only, `-DisableRemediation`: nothing moved or deleted):**
- `H:\`: clean, 1 h 53 m.
- `E:\margrat`: **8 threats** (one is in `GlassWireSetup.exe`; names pending a full-output rescan).
- `E:\tools`: **2 threats** (one is `Patch.exe`, the crack patch Defender flagged in May).
- Counts come from `%TEMP%\MpCmdRun.log`. Report-only scans log counts but no names and write
  no Defender events, so the per-threat detail only exists in MpCmdRun's console output.
- `E:\torrents`, `E:\ziped folders`: clean.
- The first run was cut off when the Claude Code session ended. Resumed for the rest of `E:`
  (`New folder*`, `New f(2)`, `programs installs`, the root files); results to be added here.

All times are local (MajesticBeast, the Surface Pro 7+). Nothing in this note is a secret: no
passwords, tokens or cookie values were read out or recorded. The stealer's log was read with
every value withheld; only its key names were looked at.

## Verdict

**Reinstall Windows on the Surface.** Malware loaded a kernel driver and used it to kill
Defender. Nothing on this install can be trusted after that, and cleaning is not enough. The
reinstall also fixes the Serial Hub and battery problem, because a clean install plus
Microsoft's Surface Pro 7+ driver pack puts the correct UART driver back (see [[Machine drives]]).

## What happened

Nathan downloaded what looked like a mobile-device tool. It was a malware lure.

| Time | Event |
|---|---|
| 00:36:04 | `Downloads\Mobile Devices\Launch_App_Setuper_Latest_11_14.rar` (33.8 MB) arrives |
| 00:42:13 | WinRAR 5.71 installed to `D:\winRAR` (genuine, signed by win.rar GmbH; not the culprit) |
| 00:48:42 | Extracted to `FullApp_Pack_v9.11.14.exe` (46.4 MB, unsigned) and run, with admin rights |
| **00:51:09 to 00:51:27** | **Adds Defender exclusions** for `Windows Helper.exe` and `Stablewin.exe`, by path and by process name, before either file exists |
| 00:51:34 | Drops `Temp\vulndriver.sys` |
| **00:51:35** | **Loads it as kernel driver service `MalDriver`** |
| **00:51:36** | **Defender service killed** ("terminated unexpectedly", 1 second later) |
| 00:51:39 to 00:51:46 | Drops `Temp\stage2.exe`, `Temp\Windows Helper.exe`, `Temp\Stablewin.exe` |
| **00:51:47 to 00:51:49** | `Temp\Log.txt` plus `pwd_4568.db`, `pwd_2944.db`: **browser password databases copied** |
| 00:51:57 / 00:51:58 | `MalDriver` loaded again; Defender killed again |
| 00:55:23 / 00:55:24 | `MalDriver` loaded again; Defender killed again |
| 00:59:48 | Same `.rar` downloaded again from `https://gitlab.com/browncarpet2464-group/project-4/-/raw/main/other/Launch_App_Setuper_Latest_11_14.rar` |
| 01:01:22 | **Defender catches it** in `Temp\Rar$EXb4308.1232\` as `Trojan:Win32/Wacatac.H!ml` (threat 2147814523) |
| **01:01:49** | **Threat 2147814523 set to Allow** (`ThreatIDDefaultAction = 6`). This is what "Allow on device" in Windows Security writes |
| **01:01:58** | **Real-time protection switched off** (event 5001) |
| 01:02:17 | A copy lands in `Downloads\FullApp_Pack_v9.11.14.exe` and is run again |
| **01:02:50 / 01:02:52 / 01:02:55** | `MalDriver` loaded; Defender killed; **second password harvest** (`pwd_3564.db`, `pwd_14064.db`) |
| 01:04:30 | Tamper Protection reverts a programmatic attempt to disable real-time protection |
| 01:04:50 | Real-time protection back on |
| **01:06:57 / 01:07:00 / 01:07:03** | `MalDriver` loaded; Defender killed; **third password harvest** (`pwd_7852.db`, `pwd_13100.db`) |
| 01:38 | This Claude Code session starts, on an already-compromised machine |
| 02:08:16 | Defender self-diagnoses its platform health as BAD and rolls itself back |
| 03:28 | Surface restarted (for the Serial Hub investigation) |
| 03:29:33 | `Windows Helper.exe` starts at login from the Startup folder (parent `explorer.exe`) |
| 03:59, 04:09, 04:19 | It rewrites its own Startup shortcut every ~10 minutes (self-healing persistence) |
| 04:09:43 | Live HTTPS connection to its control server, plus a listening port 19745 |

The 01:01:49 Allow and the 01:01:58 real-time-protection switch-off match what a person does in
Windows Security after a detection pops up, and lures like this usually ship an instructions file
telling the victim to do exactly that. The log cannot say whether it was Nathan or the malware.
Either way, Defender was overruled and the next run took two more rounds of passwords.

## Indicators

- **Control server:** `global-stash.beer`, resolving to `2405:6e00:64::9e5e:d337` and
  `158.94.211.55`. Proven: the process's live connection went to exactly that IPv6 address.
  A sibling domain on the same pattern, `clip-stash.beer`, is flagged Dangerous by Kaspersky.
- **Exfiltration channel:** Telegram. The stealer's log has a `tg http_status` entry.
- **Lure host:** `gitlab.com/browncarpet2464-group/project-4` (raw file hosting abused for
  malware, a known pattern for fake "cracked app" downloads).
- **`Windows Helper.exe`** (the persistent remote-access tool): 7,275,520 bytes, unsigned, 64-bit
  native, compiled 2026-09-10 18:40 UTC. Fake version info ("Windows Helper" everywhere, original
  filename `Windows Helper.dll`). Contains VNC strings: likely hidden remote desktop.
  SHA256 `BF0A9E543AB32A49938AC26EDCA057C02FE0FC8C48DE09319BD4F5C82D5D5F8D`,
  MD5 `7BAFF844F8547162FE9609A1EF4157A1`.
- **`Stablewin.exe`:** 5,114,368 bytes, unsigned, no version info.
  SHA256 `83DA80B21106A390108E26D70EF688DD33ECB9736DFA6B5B440B8E67F206F70E`.
- **`stage2.exe`:** 163,328 bytes, unsigned, no version info.
  SHA256 `8F1DA0DB0E75362157BA7134728C1876F3D1A524EFF3EEBC8230B1B513560DF4`.
- **`vulndriver.sys`:** really **`wsftprm.sys` from Topaz OFD** (Brazilian bank anti-fraud
  software), 38,816 bytes, validly signed by TPZ SOLUCOES DIGITAIS LTDA.
  SHA256 `FF5DBDCF6D7AE5D97B6F3EF412DF0B977BA4A844C45B30CA78C0EEB2653D69A8`.
  This is **CVE-2023-52271**: it exposes an IOCTL that terminates any process, including
  protected antivirus processes, and it is **not on Microsoft's vulnerable driver blocklist**,
  which is why memory integrity (HVCI) and the blocklist, both on, did not stop it.
- **Kernel service `MalDriver`:** installed five times, then removed each time. **Proven to have
  loaded**: each install is followed 1 to 3 seconds later by the Defender service being killed,
  five out of five.
- **Defender exclusions added by the malware, still in place:**
  `Exclusions\Paths\C:\Users\badbo\AppData\Local\Temp\Windows Helper.exe`,
  `Exclusions\Paths\C:\Users\badbo\AppData\Local\Temp\Stablewin.exe`,
  `Exclusions\Processes\Windows Helper.exe`, `Exclusions\Processes\Stablewin.exe`.
  Plus threat 2147814523 set to Allow.
- **Persistence:** only the Startup folder shortcut
  `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Windows Helper.lnk`. Checked and
  clean: Run and RunOnce keys, scheduled tasks, services, Winlogon, IFEO, WMI subscriptions,
  browser extension force-install policies, and new browser extensions.

## What is exposed (assume all of it is gone)

- **Chrome and Edge saved passwords.** The stealer's own log reports `cred_result Chrome ok` and
  `cred_result Edge ok`. It read each browser's `Local State` to recover the encryption key, and
  used the COM route that gets around Chrome's app-bound encryption. The stolen `pwd_*.db` copies
  match Chrome `Login Data` (40,960 bytes) and Edge `Login Data For Account` (57,344 bytes)
  exactly.
- **Browser cookies** for both. Stolen cookies let an attacker walk into logged-in sessions
  **without the password and without 2FA**.
- **Autofill and saved payment details** (Edge keeps a Payments `Web Data`).
- **Windows Credential Manager** entries, readable by anything running as the user: the Microsoft
  account (`badboyfarrxxx@gmail.com`), **GitHub** (`gh` CLI and Git Credential Manager for
  `badboyfarrxxx-ship-it`, the account that owns the vault backup repos), Windows Live token,
  OneDrive Personal Vault info.
- **Claude desktop** session data is present on the machine.
- **Anything on screen since 03:29**, including this session, if the VNC capability was used.
- Not present, so not exposed: Discord, Telegram, Steam, crypto wallets, wallet extensions.

**Gmail password changed and all other devices signed out on 09-12, from the phone.**
2-Step Verification confirmed on.
**Gmail settings checked clean on 09-12, from the phone:** no forwarding address, no filters,
no delegated access. Auto-Expunge was off, which is harmless (a mail app likely set it; it
doesn't send or hide mail). Nathan confirmed he never set up any rules, so anything found
there later is not his.

**GitHub checked clean at 04:22:** GitHub matches the local copies for `the-beasts-brain` and
`the-beast-agent`, every recent commit is ours, and `CLAUDE.md` is untouched. Account events
show nothing foreign. Clones leave no event, so read access cannot be ruled out.

## Remediation plan

1. **Stop it.** End `Windows Helper.exe` (Task Manager, Details tab), then delete the Startup
   shortcut above. Remove the four Defender exclusions and the Allowed-threat entry (Windows
   Security, Virus and threat protection). Quarantine the dropped files and lure copies.
2. **Rotate credentials from a clean device (the phone), never from the Surface**, in this order:
   Gmail (password, sign out of all sessions, check 2FA, recovery options, forwarding rules and
   filters), Microsoft account (sign out everywhere), GitHub (revoke sessions, tokens and
   authorised OAuth apps, review the security log), Anthropic/Claude (sign out all sessions),
   anything with a saved card, then every other site in the Chrome and Edge password lists.
3. **Reinstall Windows on the Surface.** Back up only data files (documents, the vault is already
   on GitHub), never programs or anything from `Downloads` or `Temp`.
4. Keep IObit (Advanced SystemCare, Driver Booster) off the rebuilt machine. It caused the
   Serial Hub failure on 2026-08-28 and is still installed today.
5. No cracked software, keygens or activators on the rebuilt machine.

## Root cause and the pattern behind it

Defender's own history on this machine is a run of cracked software and activators: a KeyGen on
08-28, an activator on 09-04, a Microsoft Toolkit activator and an iMazing patch on 09-08, plus
uTorrent and IDA cracks in June, including three severe trojans (`Wacatac`, `Phonzy`,
`Kepavll`). Defender caught those. This one got through because it ran with admin rights,
excluded its own payloads, loaded a signed driver that is not on the blocklist to kill Defender,
and when Defender did catch a later copy, that detection was overridden.

## Sources

- CVE-2023-52271, `wsftprm.sys`: GitHub advisory GHSA-r67f-8hjg-55w3; LOLDrivers entry
  30e8d598-2c60-49e4-953b-a6f620da1371; TopazTerminator proof of concept.
- `clip-stash.beer` flagged Dangerous: Kaspersky Threat Intelligence Portal.

## Related

- [[Machine drives]]: the Surface's hardware, drives and the Serial Hub fault.
- [[Building tiny11 images]]: the second computer's install media.
- [[Vault backup]]: the GitHub repos whose credentials are exposed.
