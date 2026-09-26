---
status: active
project: meta
type: plan
---
# Active Priorities

The single queue of open work across everything. Tag each item with its project where it isn't obvious. Add an item when work is parked; delete it when it's actually done (don't let it rot). This is the system of record for "what's still open": a daily note's "In Progress" is a frozen snapshot that goes stale the moment something closes, so never treat an old daily note's open items as current truth.

### Open Tasks
- [ ] **SECURITY: finish rotating credentials, from the phone.** Done and verified 09-12: Gmail, Microsoft account, GitHub (both stolen OAuth logins confirmed dead). Left: anything with a saved card, then every site in the Chrome and Edge password lists, working down `H:\Surface backup 2026-09-12\sites-to-rotate-PRIORITISED.txt` (banks first). The Surface has since been wiped (09-15), so the old "Claude last, right before the wipe" ordering no longer applies. Whether Claude "log out everywhere" was done before the wipe is not recorded; do it if unsure. Also still open: whether to put an Equifax credit ban on. See [[Security incident 2026-09-12]].
- [ ] **Start making money from the programs I build.** First candidate: Undermoot. Researched 09-22: recommended plan is real-hardware testing first, then an itch.io free demo plus paid full game (about US$4.99), building an email list, and Steam only if itch.io shows interest. Waiting on Nathan's decisions. See [[Selling Undermoot]].
- [ ] **Point [[camera-wall]] at the real cameras.** The app is built and tested against fake
  cameras; these steps are all on the camera side. ffmpeg is installed on the Surface as of
  09-22 (it had none that morning, although [[camera-wall]] records an ffmpeg install and Node
  22 on 09-19, and the Surface has Node 24: the wall may have run on another machine; unconfirmed).
  Then `npm run discover` to get the IPs, then per app:
    - [x] **eufy** — done 2026-09-19, live on the wall. This proved the whole chain (ffmpeg,
      server, browser) on real hardware.
    - [ ] **Smart Life (Tuya)** — in the app: camera Settings > ONVIF ("Onvif Switch") > on,
      then Reset Password (needs a capital letter). Username is then `admin`, port usually 6554.
      Set the camera to `"url": "auto"` in `cameras.json` and it finds the path itself. No ONVIF
      switch on that model means it is cloud-only: bridge it with go2rtc's `tuya://` source.
    - [ ] **Yi IoT** — probe first; if nothing answers it needs yi-hack firmware on an SD card
      (`yi-hack-v4` / `-MStar` / `-allwinner`, by chipset) before it will serve RTSP.
    - [ ] **VicoHome** — almost certainly cloud-only; give it a link tile after one probe run.
  Then `npm run check` to confirm, and fill in `cameras.json`.
- [ ] **Replace the daisy-chained Genesys hubs with one powered USB 3 hub into the USB-C port.** The external drives (`D:`, `E:`, `F:`, `H:`) still hang off the hub tree that dropped out and corrupted a drive on 09-01. Less urgent since the rebuild, because Windows sees the battery again and `Program Files`/`Users` are now on the internal `C:` (both checked 09-22). See [[Machine drives]].
- [ ] **(Parked 09-22 by Nathan) HP: install the NVIDIA graphics driver.** The HP (GeForce 710A) has no GPU driver, so Chrome falls back to Windows' software renderer (confirmed 09-22). It needs NVIDIA's R470 branch (a few hundred MB download). Before that, run the new Undermoot test file (`Documents/undermoot-bench.html`, rebuilt 09-22 with the missing-driver notice) once, to see the notice on real hardware; then install the driver and run it again. See [[Building tiny11 images]] and [[colony-game]].
- [ ] **VLC sub-project 2: swipe to seek, test on the Surface.** Built 09-26 as a patch (build run 3, https://github.com/badboyfarrxxx-ship-it/vlc-build/releases/tag/build-9e59d4b38-run3-a1): time bubble while dragging sideways, jump on release, speed follows the swipe (full width = 5 min). Nathan to test; the 5-minute figure is a guess to tune after. Later: camera wall in VLC, then video editing. See [[VLC build pipeline]].

### Completed Tasks
- [x] **Rebuild VLC 4 through the new build pipeline.** Done 09-26: built on GitHub (repo `vlc-build`), opens and plays video on the Surface. The old "won't start" was a stale skins2 interface setting. See [[VLC build pipeline]].
- [x] **SECURITY: reinstall Windows on the Surface.** Wiped and rebuilt onto tiny11 25H2 on 2026-09-15. Checked 09-22: Windows sees the battery again (`SurfaceBattery`), which confirms the Serial Hub fault went with the old install. Keep IObit off this machine. See [[Security incident 2026-09-12]].
- [x] **Get `Program Files` and `Users` off a USB enclosure.** Solved by the rebuild; both are on the internal `C:` (checked 09-22).
- [x] **Delete the stray duplicate `2026-09-11.md`.** Gone; only the proper copy in `09 - September 2026` remains (checked 09-22).
- [x] **Delete the duplicate `Active Priorities-1.md`.** It was an older copy of this note; its one extra detail (hubs before drives) was merged into the hub item above. Sent to the Recycle Bin 09-22 (also in the vault's git history).
- [x] **my-agent: back up backtalk's local commits** (`0b9cec7`, `8190423`). Done 09-22 as `tool-configs\backtalk-local.bundle` plus `backtalk-local.patch`, both tested to restore; steps in `tool-configs\README.md`. See [[backtalk voice - operating notes]].
- [x] **SECURITY: isolate `E:` and clear out the malware.** Done 09-22. `E:` dismounted with `mountvol E: /P`; after a reboot it comes back with no drive letter (reachable only by volume ID), which Nathan accepted. The quarantine folder on `C:` (every confirmed threat from 09-16, 8.7 GB) and the `Download Latest Cracks and Apps.url` lure are permanently deleted. Nathan chose to keep the rest of `E:`, including the pirated-software stash in `programs installs`. See [[Security incident 2026-09-12]].
- [x] **my-agent: open The Beasts Brain in Obsidian.** Done 09-22: registered in `%APPDATA%\obsidian\obsidian.json` as the vault that opens on launch, and confirmed open (window title "Active Priorities - The Beasts Brain - Obsidian 1.13.7").
- [x] **my-agent: run the voice line once end to end.** Done 09-22 on the rebuilt machine: brain connected, turns transcribed, replies heard through the speakers (Nathan confirmed). Along the way: wake bar set to 0.76, debug logging off, and a Whisper repetition loop fixed with local patch `cd7198b`. Rebuild banner removed from `CLAUDE.md`. See [[backtalk voice - operating notes]].
- [x] **Post the backtalk Whisper-loop issue upstream.** Posted 09-22 by Nathan as [jaredrhod/backtalk#54](https://github.com/jaredrhod/backtalk/issues/54), from the draft in `my-agent/drafts/`. See [[backtalk voice - operating notes]].
- [x] **tiny11: install the HP from the stick.** Done; Nathan confirmed on 09-22 that the install (started 09-15) finished. See [[Building tiny11 images]].
- [x] **Delete the broken tiny11 ISO.** Deleted on Nathan's OK on 09-22: the `tiny11 iso - BROKEN DO NOT USE` folder on `E:` (946 files, 1.38 GB, including the 208-byte stub `install.wim`). The working ISO and its instructions stay. See [[Building tiny11 images]].
- [x] **Get this computer set up as a machine for building programs.** Done 09-22 for web work (Nathan's choice): VS Code, GitHub CLI (signed in), ffmpeg and 7-Zip on top of Git, Node 24 and Python 3.12, and WSL Ubuntu re-registered. Heavier toolchains get added when a project needs one. See [[Dev machine setup]].
