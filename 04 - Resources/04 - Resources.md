---
status: active
project: meta
type: index
---
# 04 - Resources

Cross-project reference material: templates, guides, voice notes, and Jobs (one master note per recurring task).

## Notes in this folder
- [[Marketing]]: Jared Rhodenizer's marketing playbook (principles, funnel, per-channel playbooks). Read before any marketing work.
- [[Building VLC for Windows]]: how this machine compiles VLC from source (MSYS2 + prebuilt contribs), with every off-the-supported-path fix recorded.
- [[backtalk voice - operating notes]]: day-to-day operation of the voice loop, including how to speak text aloud from a typed session (`python -m backtalk.mouth`).
- [[Vault backup]]: the vault and agent config are in private GitHub repos. How to commit, restore, and what is not yet covered.
- [[Machine drives]]: what is on each drive letter, and the 2026-09-02 USB drive failures (G: corrupted, a Storage Space degraded). Updated 2026-09-22: since the 09-15 rebuild, Program Files and Users are back on the internal C: and Windows sees the battery again; the rest of the note is pre-rebuild history. Check what a drive letter is before writing to it.
- [[Security incident 2026-09-12]]: infostealer and remote-access tool found on the Surface on 2026-09-12. Timeline, indicators (hashes, control server, the Defender-killing kernel driver), what was exposed, and the remediation plan. Verdict: reinstall Windows.
- [[Building tiny11 images]]: building a debloated Windows 11 ISO with tiny11builder. Updated 2026-09-22: done; the HP is installed from the stick. Includes which source ISO to trust, and the two warnings (a second broken ISO on E:, and D: is not the stick).
- [[Long-running jobs]]: how to run scans, copies and builds so they survive the Claude Code session ending (launch detached, log to `%TEMP%\beast-jobs\`), plus the OneDrive placeholder and Defender report-only traps.
- [[camera-wall]]: a local web app that shows every IP camera in the house on one page (Node + ffmpeg, no cloud, no dependencies). Setup, what each brand needs switched on, and which brands have no local stream at all.
- [[vlc-source-patches]]: the two patched VLC source files (`plugin.c`, `winvlc.c`), recovered from File History after the source drive died.
- [[colony-game]]: a colony-evolution role-playing game with a 3D world (three.js + Vite), in two builds: *Undermoot* (original, sellable, with a finished ending) and a private *Chrysalis* fan build. Holds both playable files, the source zip, and [[Chrysalis book notes]] (spoilers).
