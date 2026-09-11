---
status: active
project: meta
type: plan
---
# Active Priorities

The single queue of open work across everything. Tag each item with its project where it isn't obvious. Add an item when work is parked; delete it when it's actually done (don't let it rot). This is the system of record for "what's still open" — a daily note's "In Progress" is a frozen snapshot that goes stale the moment something closes, so never treat an old daily note's open items as current truth.

### Open Tasks
- [ ] Get this computer set up as a machine for building programs.
- [ ] Start making money from the programs I build.
- [ ] **tiny11: boot the second computer from the stick and install.** The image is built, verified, and written to the 14.9 GB USB stick (`G:` while attached), which has also been verified part by part. The stick carries `ChromeSetup.exe` and the instructions. Two things to know before booting: it is **UEFI-only**, so a BIOS-only or CSM machine will not see it and it would need redoing with Rufus; and keep the new machine offline or metered, because 21H2 will pull several GB of catch-up updates. Check the target's network adapter is covered by in-box drivers before wiping it. See [[Building tiny11 images]].
- [ ] Decide whether the broken 693 MB tiny11 ISO gets deleted. It is parked at `E:\windows images-iso recovery\tiny11 iso - BROKEN DO NOT USE\` pending an OK.
- [ ] **Reboot the Surface.** Three reasons at once: `Surface UEFI` and `Surface ME` are both Code 14 asking for a restart, `Surface Serial Hub Driver` is Code 10 which is why Windows cannot see the battery, and the per-device USB power settings applied on 09-12 only take effect on re-enumeration. If the Serial Hub is still Code 10 afterwards, the repair is a Surface Pro 7+ driver and firmware pack from Microsoft, which is a real download to plan around the data situation. See [[Machine drives]].
- [ ] **Get `Program Files` and `Users` off a USB enclosure.** `D:` is a SanDisk SSD in a no-name ASMedia case on the same hub tree that drops out, and Windows currently cannot see the battery, so an unplug is an instant hard power cut mid-write. This is the combination that corrupted a drive on 09-01. See [[Machine drives]].
- [ ] Replace the daisy-chained Genesys hubs with one powered USB 3 hub into the USB-C port.

### Completed Tasks
