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
   `discovered.json` with the brand guessed from each MAC address. For any
   camera whose brand is unclear, `npm run probe -- --host <ip> --user <u>
   --pass <p>` finds its stream URL by trying the known ones.
4. Fill usernames and passwords into `cameras.json` (gitignored, `chmod 600`).
   Secrets can be written `"env:VAR_NAME"` and kept in the environment instead —
   worth doing here given [[Security incident 2026-09-12]].
5. `npm run check` — says per camera whether it answers, what codec it sends,
   and what is wrong when it does not.
6. `npm start`, open `http://127.0.0.1:8480`, set a password on first run.

## The four apps in this house

Asked on 2026-09-19: eufy, Yi IoT, "Smart home", and VicoHome. They land in
three different places, and only one of them is easy.

**eufy — works locally.** Switch RTSP on per camera in the eufy app (camera
Settings > General or Advanced > RTSP, sometimes called NVR Mode), and set a
username and password on that screen. The app prints the URL. Wired indoor cams
stream from the camera's own IP; anything paired to a HomeBase streams from the
HomeBase IP instead. Battery models with no RTSP toggle need eufy-security-ws or
Scrypted in front of them. Brand key: `eufy`.

**Yi IoT — usually needs firmware.** Stock YI IoT has no RTSP on most models.
The fix is the yi-hack firmware on an SD card — `yi-hack-v4`, `yi-hack-MStar` or
`yi-hack-allwinner` depending on the chipset — which then serves
`/ch0_0.h264` (main) and `/ch0_1.h264` (sub). A few YI IoT rebadges do have an
RTSP switch in the app, so probe before reflashing anything. Brand key: `yi`.

**Smart Life (Tuya) — depends on the model, and it is worth five minutes to find
out.** Confirmed by Nathan on 2026-09-19 as Tuya Smart Life. In the app: camera
Settings, find **ONVIF** (often labelled "Onvif Switch"), turn it on, then
**Reset Password** and set one containing a capital letter. After that the
username is always `admin` — never the Smart Life login — and the password is
the ONVIF one. The port is usually **6554**, sometimes 8554 or 554, and the path
differs by manufacturer (`/stream0`, `/stream_0`, `/stream1`, `/onvif1`), which
is why Tuya cameras should be configured `"url": "auto"`. A model with no ONVIF
switch is cloud-only and needs go2rtc in front of it. Brand key: `tuya`
(`smartlife` and `smarthome` are aliases).

**VicoHome — almost certainly not.** The battery models send video to VicoHome's
cloud and it only comes back through their app; there is no published local API.
It gets a link tile that says so. Worth one probe run in case a given unit is a
mains-powered rebadge with RTSP underneath. Brand key: `vicohome`.

## Bridging a cloud-only Tuya camera

go2rtc (single .exe on Windows, one YAML file) has a native Tuya source that
signs in with the Smart Life account itself, so it reaches cameras that never
expose ONVIF, and re-serves them as ordinary RTSP:

```yaml
streams:
  back_door: tuya://m1.tuyaeu.com?device_id=DEVICE_ID&email=YOU@EXAMPLE.COM&password=SMART_LIFE_PASSWORD
```

Regional host as appropriate (`m1.tuyaeu.com`, `m1.tuyaus.com`,
`m1.tuyacn.com`); the device id is in the Smart Life app under the camera's
Device Information. The camera entry here then just points at
`rtsp://127.0.0.1:8554/back_door`. go2rtc also has an `onvif://` source, which
is another route to a camera whose path moves.

## "url": "auto"

A camera set to `"url": "auto"` has no URL written down. On first use the app
probes it, remembers the port and path in `.camera-wall-urls.json` beside the
config, and rebuilds the URL from that plus the credentials in `cameras.json` —
so the cache file holds no secrets. After two failures in a row it goes looking
again, which is what covers the Tuya firmwares that move their path after a
reboot.

## Finding the URL when the brand is a dead end

`node bin/camera-wall.js probe --host 192.168.1.60 --user admin --pass secret`

Checks ports 554, 6554 and 8554, then tries 35 known stream paths on whichever
are open, three at a time so a cheap camera does not fall over. Prints every
path that answers with its codec and resolution, and ends with a config entry
ready to paste. This is the answer for
the rebadged half of the market, where the brand on the box tells you nothing
about the firmware inside. When it finds nothing, the camera genuinely has no
local stream and the options are a bridge or a different camera.

Not implemented on purpose: ONVIF `GetStreamUri`, which would ask an ONVIF
camera for its URL directly. It needs WS-Security auth that cannot be verified
here without a real camera on the network, and a wrong implementation would
report false negatives. The path probe covers the same ground by measurement
rather than by protocol, so it is the honest version until there is hardware to
test against.

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
- The path prober finds both streams on a camera, picks main and sub by
  resolution, and prints a paste-ready config entry (tested against a stubbed
  camera, and against a dead host for the nothing-found path).
- `"url": "auto"` resolves cold (tile reports "searching", then starts on the
  found URL), reuses the cache on the next run, and writes no credentials into
  the cache file.

Not verified: live H.264 playback in the browser, because the headless Chromium
in the build environment has no H.264 decoder. Everything up to the decoder was
verified, and Chrome and Edge on Windows both decode H.264.

## Still open

Real cameras. Nothing here has met one yet.
