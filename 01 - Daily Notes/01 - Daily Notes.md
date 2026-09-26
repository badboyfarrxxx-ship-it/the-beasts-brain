---
status: active
project: personal
type: index
---
# 01 - Daily Notes

One file per day, `YYYY-MM-DD.md`, sorted into monthly subfolders (`08 - August 2026`, etc.). Every daily note is created from `Daily Note Template.md` in this folder, never hand-rolled.

## Months
- [[2026-08-28]]: first entry, the full stack build.
- [[2026-08-29]]: native VLC-for-Windows build box set up, VLC compiling.
- [[2026-09-01]]: freed ~4.5 GB on C: and moved the VLC dev build off the G: HDD back to the SSD. Booted as The Beast and ran a full stack health check (all four tools green).
- [[2026-09-02]]: vault backup to private GitHub, now live. Finished `CLAUDE.md` (the "Make it yours" hard lines plus the back-up-every-checkpoint rule).
- [[2026-09-04]]: tiny11 Windows 11 image build staged on `H:`, clean source ISO identified, build made fully offline, install instructions written to the `D:` stick.
- [[2026-09-11]]: the tiny11 build ran and succeeded, from a fresh download rather than the staged folder; and the Command Console React artifact was built (58 seeded commands, 8 platforms). Both sessions reconstructed from forensics, not live.
- [[2026-09-12]]: verified the tiny11 ISO and wrote the USB stick; fixed the USB dropouts; found, contained and began remediating an infostealer and remote-access tool (see [[Security incident 2026-09-12]]).
- [[2026-09-13]]: Surface rebuild prep. Backup to H: and the E: scan relaunched as standalone processes; data cost of a stock Windows reinstall priced.
- [[2026-09-15]]: held off re-signing GitHub on the compromised Surface; E: scan results recorded (ransomware among the cracks); tiny11 install on the HP started.
- [[2026-09-16]]: restore from H: finished and verified (WSL back after DISM-enabling the virtualization features); both repos pushed to GitHub by hand; the dead Claude shell diagnosed as a missing Git Bash; D: scanned and one confirmed trojan found.
- [[2026-09-19]]: built [[camera-wall]], a local Node + ffmpeg web app that shows every IP camera in the house on one page. Tested end to end against fake cameras; real cameras still to come.
- [[2026-09-21]]: `uv` and the backtalk `.venv` restored after the rebuild, my-agent docs corrected, backtalk's local patches verified present; Obsidian installed, vault not opened yet.
- [[2026-09-22]]: a long day of cleanup and progress. E: isolated and the malware quarantine deleted, the vault opened in Obsidian, the voice line running (Whisper loop fixed and reported upstream as jaredrhod/backtalk#54), web dev tools installed, and Undermoot researched for sale, tested on real hardware (60 fps Surface, 90 fps phone) and given a missing-graphics-driver notice.
- [[2026-09-23]]: the Undermoot free demo designed and specced (ends after zone 4, progress carries over by save code, cut at build time).
- [[2026-09-25]]: VLC dev build crashing on launch (checks given, cause unknown); rebuild split into four sub-projects and the build pipeline specced ([[VLC build pipeline]]) and its implementation plan written; the first build finished on GitHub, waiting on the Surface test.
- [[2026-09-26]]: VLC 4 build verified on the Surface, opens and plays video (the "won't start" was a stale skins2 setting); added a boot-config rule to always name the terminal for command blocks.
