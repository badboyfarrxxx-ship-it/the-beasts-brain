# Camera Wall

Every IP camera in the house on one page, served from your own machine. No
vendor cloud, no account, no subscription, nothing leaves the network.

It is one Node process with no npm dependencies. The only outside thing it
needs is `ffmpeg`, which does the actual video work.

```
npm run check        # is ffmpeg here, and can it reach each camera?
npm run discover     # find cameras on this network, write discovered.json
npm start            # run the wall, then open http://127.0.0.1:8480
```

## How it works

```
camera ──RTSP──> ffmpeg ──fragmented MP4──> WebSocket ──> browser (Media Source Extensions)
                    └────JPEG frames──────> <img> fallback and stills mode
```

- **Video is not re-encoded** when the camera sends H.264: ffmpeg repackages it,
  which costs almost no CPU. H.265 cameras are detected on connect and
  re-encoded to H.264, because browsers will not reliably play H.265.
- **Streams start when someone is watching** and stop about 20 seconds after the
  last viewer closes the tab. A grid of twelve cameras costs nothing while
  nobody is looking at it.
- **Grid tiles use the camera's sub-stream** (the low-resolution one every
  camera has). Opening a tile switches that camera to the full-resolution
  stream, and switches it back on close.
- **Each camera has exactly one ffmpeg per quality**, shared by every viewer, so
  three phones watching the front door is still one connection to the camera.

## Setting it up

1. **Install ffmpeg.** On Windows: `winget install Gyan.FFmpeg`, then open a new
   terminal so PATH picks it up. `npm run check` confirms it.
2. **Turn RTSP on in the camera's app.** Nearly every "app camera" ships with
   the local stream disabled. `npm run brands` lists what each brand calls it.
3. **Find the cameras:** `npm run discover`. It asks every ONVIF device on the
   network to identify itself, then sweeps the camera ports for the ones that
   stay quiet, and writes `discovered.json` with brands guessed from MAC
   addresses.
4. **Write `cameras.json`.** Copy `cameras.example.json`, paste in the
   discovered entries, add usernames and passwords.
5. **`npm run check`** tells you, per camera, whether it answers and what codec
   it sends. For any camera it cannot reach, `npm run probe -- --host <ip>
   --user <u> --pass <p>` tries 32 known stream paths and prints the ones that
   work, with a config entry ready to paste.
6. **`npm start`**, open the address, set a password on first run.

## cameras.json

```json
{
  "server": { "host": "127.0.0.1", "port": 8480 },
  "auth": { "enabled": true, "passwordHash": null },
  "defaults": { "transport": "tcp", "mode": "auto", "idleTimeoutSec": 20 },
  "cameras": [
    { "id": "front-door", "name": "Front Door", "brand": "tapo",
      "host": "192.168.1.51", "username": "camerawall", "password": "env:TAPO_PASS" }
  ]
}
```

| field | what it does |
|---|---|
| `brand` | picks the RTSP URL shape. `npm run brands` lists them. |
| `host` | the camera's IP. Give it a DHCP reservation in the router or it will move. |
| `url` / `subUrl` | full RTSP URLs, for a camera no brand template fits. Overrides `brand`. |
| `url: "auto"` | find the stream by probing the camera, remember it, and find it again if it moves. Needs `host`. This is the right setting for Tuya. |
| `snapshotUrl` | still-image URL, used for stills mode. Basic and Digest auth both work. |
| `mode` | `auto` (default, probes the codec), `copy` (never re-encode), `transcode` (always). |
| `player` | `auto`, or `mjpeg` to pin a camera to server-side JPEG. |
| `audio` | `true` to carry sound. Off by default; the wall is muted anyway. |
| `channel` | for NVRs: which channel this tile is. |
| `type: "link"` | a cloud-only camera. The tile links to the vendor app instead of pretending. |
| `enabled: false` | keep the entry, drop it from the wall. |

Any secret can be written as `"env:VARIABLE_NAME"` and read from the
environment instead of sitting in the file.

## The four app ecosystems in this house

| app | what actually happens |
|---|---|
| **eufy** | Works locally. Switch RTSP on per camera in the eufy app (camera Settings > General or Advanced > RTSP / NVR Mode) and set a username and password there — that screen prints the URL. Wired indoor cams stream from the camera's own IP; cams paired to a HomeBase stream from the HomeBase IP. Battery models with no RTSP toggle need eufy-security-ws or Scrypted. |
| **Yi IoT** | Usually needs firmware. Stock YI IoT has no RTSP on most models; the yi-hack firmware (yi-hack-v4, yi-hack-MStar or yi-hack-allwinner, picked by chipset) on an SD card adds it, and then `/ch0_0.h264` is the stream. A few YI IoT rebadges do have an RTSP switch in the app. `probe` settles which one you have. |
| **Smart Life (Tuya)** | Depends on the model, and it is worth five minutes to find out. In the app: camera Settings → **ONVIF** (sometimes "Onvif Switch") → turn it on → **Reset Password** and set one containing a capital letter. The username is then always `admin`, never your Smart Life login. Port is usually **6554**, sometimes 8554 or 554, and the path differs by manufacturer — so set `"url": "auto"` and let the app find it. No ONVIF switch in the app means that model is cloud-only: bridge it with go2rtc (below). |
| **VicoHome** | Almost certainly not. The battery models send video to VicoHome's cloud and it comes back only through their app; there is no published local API. Run `probe` once in case yours is a mains-powered rebadge, then give it a link tile. |

Rule of thumb for all four: if `probe` finds nothing, the camera is not being
stubborn, it genuinely has no local stream — and the fix is a bridge or a
different camera.

### Bridging a cloud-only Tuya camera with go2rtc

[go2rtc](https://github.com/AlexxIT/go2rtc) has a native Tuya source that logs
in with your Smart Life account and pulls the camera's stream without the ONVIF
switch. It is a single .exe on Windows, and it re-serves anything it can reach
as ordinary RTSP, which is exactly what this app wants.

`go2rtc.yaml` next to the exe:

```yaml
streams:
  back_door: tuya://m1.tuyaeu.com?device_id=DEVICE_ID&email=YOU@EXAMPLE.COM&password=YOUR_SMART_LIFE_PASSWORD
```

Use the regional host your account is on (`m1.tuyaeu.com`, `m1.tuyaus.com`,
`m1.tuyacn.com`). The device id comes from the Smart Life app under the
camera's Device Information. Then point a camera here at the bridge:

```json
{ "id": "back-door", "name": "Back Door", "url": "rtsp://127.0.0.1:8554/back_door" }
```

go2rtc also has an `onvif://` source that asks a camera for its current stream
path, which is another way at the models whose path moves.

## The cameras that cannot be shown

Ring, Blink, Nest and Arlo have no local stream at all — the video goes to the
vendor's cloud and comes back only through their app. No amount of code on this
machine changes that. Those get a `type: "link"` tile that opens the vendor app,
and the app names the bridge (Scrypted, go2rtc, Home Assistant) that can pull
them in if you want to go that far. Everything else — Tapo, Reolink, Hikvision,
Dahua, Amcrest, Imou, EZVIZ, Foscam, Swann, Axis, UniFi, most no-name ONVIF
cameras — streams directly once RTSP is switched on.

## Keeping it locked down

- It listens on `127.0.0.1` by default: this machine only.
- The page is password-gated (scrypt hash in `cameras.json`, five wrong guesses
  buys a one-minute lockout). Set it on first run or with `npm run set-password`.
- `cameras.json` holds camera passwords, is `chmod 600`, and is gitignored.
  Nothing in it is ever sent to the browser — the page only receives names,
  brands and status.
- Logs redact credentials in URLs.
- To reach it from a phone, set `server.host` to `0.0.0.0` **and keep the
  password on**. Better: leave it on localhost and reach it over Tailscale or
  WireGuard rather than opening a port.

## Commands

| command | what it does |
|---|---|
| `npm start` | run the wall. `-- --port 9000 --host 0.0.0.0 --verbose` are accepted. |
| `npm run check` | test ffmpeg and every camera, and explain each failure. |
| `npm run discover` | find cameras on the network, write `discovered.json`. |
| `npm run probe -- --host 192.168.1.60 --user admin --pass x` | try every known stream path against one camera and print the ones that answer. This is how you identify a rebadged camera. |
| `npm run set-password` | change the web password. |
| `node bin/camera-wall.js brands` | list brands, their quirks, and which are cloud-only. |
| `node bin/camera-wall.js url --brand reolink --host 192.168.1.50 --user admin --pass x` | print the URLs for a brand. |

## On the page

Click a tile to open it full size. `1`-`9` jump to a camera, `F` fullscreen,
`M` audio, `S` saves a still, `Esc` goes back. **Stills only** mode swaps live
video for one JPEG every few seconds — the right setting for a laptop on
battery or a phone on mobile data. **Cameras** hides tiles on this device
without touching the config.

## When something is wrong

| what you see | what it means |
|---|---|
| "camera rejected the username or password" | Tapo and Reolink want a separate camera account, not the app login. |
| "connection refused" | RTSP is off in the vendor app, or the port is not 554. |
| "wrong stream path for this model" | set `"url": "auto"`, or run `probe` and paste what it finds into `url`. |
| "no stream found on this camera" | an `auto` camera whose every known path came back empty. Check the ONVIF switch and password in the vendor app, then bridge it. |
| "camera did not answer" | wrong IP, or the camera is on a different wifi (guest/IoT network). |
| tile says `re-encoded` | the camera sends H.265. Working as intended, but it costs CPU — switch the camera to H.264 in its app if you can. |
| "ffmpeg not found" | `winget install Gyan.FFmpeg`, then a new terminal. |
| everything is slow with many cameras | use the sub-stream (default), drop to stills mode, or lower `maxTranscodeHeight`. |

## What it does not do

No recording, no motion detection, no alerts. It is a wall of live pictures. If
you want recording and events, this is the wrong tool and Frigate or Blue Iris
is the right one.
