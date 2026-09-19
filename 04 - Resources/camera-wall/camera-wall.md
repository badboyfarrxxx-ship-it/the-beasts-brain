---
status: active
project: meta
type: guide
---
# camera-wall

A local web app that puts every IP camera in the house on one page. Built
2026-09-19. Node 22, no npm dependencies, `ffmpeg` does the video work. The code
lives in this folder; `README.md` beside it is the operating manual.

## Why it exists

Each camera brand ships its own phone app, and none of them will show another
brand's cameras. This runs on the machine, reads the cameras' own RTSP streams
directly, and draws them all in one grid in a browser. Nothing goes to a vendor
cloud and there is no subscription.

## How it works

`camera → ffmpeg → fragmented MP4 over a WebSocket → browser`. The browser plays
it through Media Source Extensions. H.264 cameras are repackaged, not
re-encoded, so the CPU cost is near zero; H.265 cameras are detected on connect
and re-encoded, because browsers will not play H.265 reliably. Streams only run
while a tab is watching and stop about 20 seconds after the last viewer leaves.
Grid tiles use each camera's sub-stream; opening a tile switches that one to
full resolution.

There are two fallbacks below that: server-side JPEG frames over a plain
`multipart/x-mixed-replace` response (iPhone Safari has no Media Source
Extensions, and this is also what a browser gets when it refuses the codec), and
a stills-only mode that polls one JPEG every few seconds for a laptop on
battery.

## Getting it running on this machine

1. `winget install Gyan.FFmpeg`, then open a new terminal. This is the only
   prerequisite. See [[Building VLC for Windows]] for the other, unrelated,
   ffmpeg-adjacent build notes on this machine.
2. Turn RTSP on in each camera's phone app. Almost every consumer camera ships
   with it off, and Tapo, Reolink and EZVIZ each want a separate camera account
   or verification code rather than the app login.
3. `npm run discover` — ONVIF multicast probe plus a port sweep, writes
   `discovered.json` with the brand guessed from each MAC address.
4. Fill usernames and passwords into `cameras.json` (gitignored, `chmod 600`).
   Secrets can be written `"env:VAR_NAME"` and kept in the environment instead —
   worth doing here given [[Security incident 2026-09-12]].
5. `npm run check` — says per camera whether it answers, what codec it sends,
   and what is wrong when it does not.
6. `npm start`, open `http://127.0.0.1:8480`, set a password on first run.

## What cannot be shown, and why

Ring, Blink, Nest and Arlo have no local stream. Their video goes to the
vendor's cloud and only comes back through their own app; no code on this
machine changes that. Those cameras get a tile that links to the vendor app and
names the bridge (Scrypted, go2rtc, Home Assistant) that could pull them in.
Everything else — Tapo, Reolink, Hikvision, Dahua, Amcrest, Imou, EZVIZ, Foscam,
Swann, Axis, UniFi, generic ONVIF — streams directly once RTSP is on.

## Security posture

Binds `127.0.0.1` only. The page is password-gated with a scrypt hash, and five
wrong guesses buys a one-minute lockout. Camera credentials never reach the
browser: the page gets names, brands and status, nothing else. Logs redact
passwords out of URLs. To watch from a phone, reach the machine over Tailscale
or WireGuard rather than opening a port.

## What was verified on 2026-09-19

Tested against fake cameras (ffmpeg serving H.264 and H.265 over HTTP), not yet
against real hardware:

- The stream captured over the WebSocket is a valid MP4 — 278 frames, 18.5s,
  640x360 H.264, decodes frame-perfect in ffmpeg.
- An H.265 camera is detected and re-encoded to H.264 automatically.
- Snapshots, the MJPEG fallback, stills mode, the focus view and the camera
  picker all render in a real browser.
- Unplugging a camera mid-stream shows it as unreachable and it comes back by
  itself when plugged back in, with no page reload.
- Password setup, sign-in, sign-out, the rate limit and the WebSocket auth
  rejection all behave.

Not verified: live H.264 playback in the browser, because the headless Chromium
in the build environment has no H.264 decoder. Everything up to the decoder was
verified, and Chrome and Edge on Windows both decode H.264.

## Still open

Real cameras. Nothing here has met one yet.
