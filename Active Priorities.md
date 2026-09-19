---
status: active
project: meta
type: plan
---
# Active Priorities

The single queue of open work across everything. Tag each item with its project where it isn't obvious. Add an item when work is parked; delete it when it's actually done (don't let it rot). This is the system of record for "what's still open": a daily note's "In Progress" is a frozen snapshot that goes stale the moment something closes, so never treat an old daily note's open items as current truth.

### Open Tasks
- [ ] **SECURITY: rotate credentials from the phone, never the Surface.** Done and verified 09-12: Gmail, Microsoft account, GitHub (both stolen OAuth logins confirmed dead). Left: anything with a saved card, then every site in the Chrome and Edge password lists, then **Anthropic/Claude last** (logging out everywhere kills the Claude Code session on this Surface, so it's the final step before the wipe). See [[Security incident 2026-09-12]].
- [ ] **SECURITY: reinstall Windows on the Surface.** Malware loaded a kernel driver and used it to kill Defender, so this install can't be trusted. Back up data files only. The reinstall also fixes the Serial Hub and invisible battery: the 03:28 restart did not clear them, and the root cause is IObit Driver Booster forcing the wrong UART driver on 2026-08-28, which a clean install plus the Surface Pro 7+ driver pack undoes. Keep IObit off the rebuilt machine. See [[Security incident 2026-09-12]] and [[Machine drives]].
- [ ] Get this computer set up as a machine for building programs.
- [ ] Start making money from the programs I build.
- [ ] **tiny11: boot the second computer from the stick and install.** The image is built, verified, and written to the 14.9 GB USB stick (`G:` while attached), which has also been verified part by part. The stick carries `ChromeSetup.exe` and the instructions. Two things to know before booting: it is **UEFI-only**, so a BIOS-only or CSM machine will not see it and it would need redoing with Rufus; and keep the new machine offline or metered, because 21H2 will pull several GB of catch-up updates. Check the target's network adapter is covered by in-box drivers before wiping it. See [[Building tiny11 images]].
- [ ] **Point [[camera-wall]] at the real cameras.** The app is built and tested against fake
  cameras; these steps are all on the camera side. First `winget install Gyan.FFmpeg`, then
  `npm run discover` to get the IPs, then per app:
    - [ ] **eufy** — switch RTSP on per camera in the app (Settings > General/Advanced > RTSP or
      NVR Mode), set a username and password there. This one should just work.
    - [ ] **Smart home (likely Tuya/Smart Life)** — `npm run probe -- --host <ip>` to find out
      whether it has a local stream at all. If not, `tuya-ipc-terminal` is the bridge.
    - [ ] **Yi IoT** — probe first; if nothing answers it needs yi-hack firmware on an SD card
      (`yi-hack-v4` / `-MStar` / `-allwinner`, by chipset) before it will serve RTSP.
    - [ ] **VicoHome** — almost certainly cloud-only; give it a link tile after one probe run.
  Then `npm run check` to confirm, and fill in `cameras.json`.
- [ ] Decide whether the broken 693 MB tiny11 ISO gets deleted. It is parked at `E:\windows images-iso recovery\tiny11 iso - BROKEN DO NOT USE\` pending an OK.
- [ ] **Get `Program Files` and `Users` off a USB enclosure.** `D:` is a SanDisk SSD in a no-name ASMedia case on the same hub tree that drops out, and Windows currently cannot see the battery, so an unplug is an instant hard power cut mid-write. This is the combination that corrupted a drive on 09-01. See [[Machine drives]].
- [ ] Replace the daisy-chained Genesys hubs with one powered USB 3 hub into the USB-C port.
- [ ] Delete the stray duplicate `01 - Daily Notes\2026-09-11.md` (vault root, old frontmatter
  format, superseded; its content is now merged into [[2026-09-11]]). It came back read-only
  when staged, likely open in another app; close that first.

### Completed Tasks
