// Per-brand RTSP and snapshot URL shapes for the cameras people normally only
// watch through a phone app. Anything not listed here still works: set `url`
// on the camera by hand.
//
// Placeholders: {user} {pass} {host} {port} {channel}
// `main` is the full-resolution stream, `sub` the low-resolution one. The wall
// uses `sub` for grid tiles and `main` when a tile is opened full size.

export const BRANDS = {
  generic: {
    label: 'Generic ONVIF / RTSP',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/onvif1',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/onvif2',
  },
  tapo: {
    label: 'TP-Link Tapo',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/stream1',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/stream2',
    note: 'Needs a Camera Account created in the Tapo app (Device Settings > Advanced Settings > Camera Account). That username/password is not your TP-Link login.',
  },
  kasa: {
    label: 'TP-Link Kasa (KC series)',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/stream1',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/stream2',
    note: 'Turn on "Local Stream/RTSP" in the Kasa app first.',
  },
  reolink: {
    label: 'Reolink',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/h264Preview_{channel2}_main',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/h264Preview_{channel2}_sub',
    snapshot: 'http://{host}/cgi-bin/api.cgi?cmd=Snap&channel={channel0}&user={user}&password={pass}',
    note: 'Battery models (Argus, Go) sleep and only stream when awake. H.265 models use Preview_ instead of h264Preview_ — set `url` by hand if the h264 path fails.',
  },
  hikvision: {
    label: 'Hikvision',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/Streaming/Channels/{channel}01',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/Streaming/Channels/{channel}02',
    snapshot: 'http://{host}/ISAPI/Streaming/channels/{channel}01/picture',
    snapshotAuth: 'digest',
  },
  annke: { alias: 'hikvision', label: 'Annke (Hikvision OEM)' },
  smartlife: { alias: 'tuya', label: 'Smart Life (Tuya app)' },
  smarthome: { alias: 'tuya', label: 'Smart Home (Tuya app)' },
  yiiot: { alias: 'yi', label: 'Yi IoT' },
  kami: { alias: 'yi', label: 'Kami (YI brand)' },
  lorex: { alias: 'hikvision', label: 'Lorex (Hikvision OEM; some models are Dahua OEM)' },
  dahua: {
    label: 'Dahua',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/cam/realmonitor?channel={channel}&subtype=0',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/cam/realmonitor?channel={channel}&subtype=1',
    snapshot: 'http://{host}/cgi-bin/snapshot.cgi?channel={channel}',
    snapshotAuth: 'digest',
  },
  amcrest: { alias: 'dahua', label: 'Amcrest (Dahua OEM)' },
  imou: { alias: 'dahua', label: 'Imou (Dahua consumer brand)' },
  ezviz: {
    label: 'EZVIZ',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/H.264',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/H.264',
    note: 'RTSP must be enabled in the EZVIZ app; the password is the camera verification code printed on the body, not the account password.',
  },
  foscam: {
    label: 'Foscam',
    port: 88,
    main: 'rtsp://{user}:{pass}@{host}:554/videoMain',
    sub: 'rtsp://{user}:{pass}@{host}:554/videoSub',
    snapshot: 'http://{host}:{port}/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr={user}&pwd={pass}',
  },
  swann: {
    label: 'Swann',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/ch{channel2}/0',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/ch{channel2}/1',
  },
  axis: {
    label: 'Axis',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/axis-media/media.amp',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/axis-media/media.amp?resolution=640x480',
  },
  vivotek: {
    label: 'Vivotek',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/live.sdp',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/live2.sdp',
  },
  unifi: {
    label: 'Ubiquiti UniFi Protect',
    port: 7447,
    main: 'rtsps://{host}:{port}/{path}?enableSrtp',
    note: 'Enable RTSP per camera in UniFi Protect, then paste the rtsps:// URL it gives you into `url`. {path} is the per-camera token from that screen.',
  },
  wyze: {
    label: 'Wyze',
    port: 8554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/{path}',
    note: 'Either flash the official RTSP firmware (v2/Pan v1 only) or run docker-wyze-bridge and point `host` at the bridge. Wyze cameras have no RTSP out of the box.',
  },
  eufy: {
    label: 'Eufy / Anker',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/live0',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/live1',
    note: 'Turn on RTSP per camera in the eufy app (camera Settings > General/Advanced > RTSP or NVR Mode); it prints the URL and you set the username and password there. Wired indoor cams stream from the camera IP; HomeBase-paired cams stream from the HomeBase IP. Battery models that offer no RTSP toggle need eufy-security-ws or Scrypted.',
  },
  yi: {
    label: 'YI / Yi IoT / Kami',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/ch0_0.h264',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/ch0_1.h264',
    note: 'Stock YI IoT firmware has no RTSP on most models: it needs the yi-hack firmware (yi-hack-v4 / yi-hack-MStar / yi-hack-allwinner, chosen by chipset) on an SD card, which then serves this path. A few YI IoT rebadges do have an RTSP toggle in the app. Run "probe" against the camera before assuming either way.',
  },
  tuya: {
    label: 'Tuya / Smart Life / Smart Home',
    port: 554,
    main: 'rtsp://{user}:{pass}@{host}:{port}/stream1',
    sub: 'rtsp://{user}:{pass}@{host}:{port}/stream2',
    note: 'The Tuya platform sells the same hardware under hundreds of names. Most are cloud P2P only, but a fair number answer RTSP or ONVIF on the LAN, sometimes after an "ONVIF" or "Local RTSP" switch in the app. Run "probe" — it settles it in a minute. If nothing answers, tuya-ipc-terminal (local P2P to RTSP) or Home Assistant is the bridge.',
  },
  vicohome: {
    cloudOnly: true,
    label: 'VicoHome / Vicoo',
    appUrl: 'https://www.vicohome.io/',
    bridge: 'No local stream: the video only comes back through the VicoHome app.',
  },
  // Cloud-only: these brands deliberately expose no local stream. Listed so the
  // app can say why instead of failing silently.
  ring:  { cloudOnly: true, label: 'Ring',  appUrl: 'https://account.ring.com/',            bridge: 'Scrypted or go2rtc (unofficial, breaks when Ring changes its API)' },
  blink: { cloudOnly: true, label: 'Blink', appUrl: 'https://immedia-semi.com/',            bridge: 'blinkpy via Home Assistant, still stills-and-clips only' },
  nest:  { cloudOnly: true, label: 'Google Nest', appUrl: 'https://home.google.com/',       bridge: 'Nest Device Access API ($5 one-off) into Scrypted or Home Assistant' },
  arlo:  { cloudOnly: true, label: 'Arlo',  appUrl: 'https://my.arlo.com/',                 bridge: 'Scrypted plugin; wire-free models still sleep between events' },
};

export function resolveBrand(name) {
  const key = String(name || 'generic').toLowerCase();
  const brand = BRANDS[key];
  if (!brand) return null;
  if (brand.alias) return { ...BRANDS[brand.alias], ...brand, key: brand.alias };
  return { ...brand, key };
}

function fill(template, cam, brand) {
  const channel = Number(cam.channel || 1);
  return template
    .replaceAll('{user}', encodeURIComponent(cam.username || ''))
    .replaceAll('{pass}', encodeURIComponent(cam.password || ''))
    .replaceAll('{host}', cam.host || '')
    .replaceAll('{port}', String(cam.port || brand.port || 554))
    .replaceAll('{path}', cam.path || '')
    .replaceAll('{channel}', String(channel))
    .replaceAll('{channel0}', String(channel - 1))
    .replaceAll('{channel2}', String(channel).padStart(2, '0'));
}

// Returns { main, sub, snapshot, snapshotAuth } for a camera entry.
// An explicit `url` wins outright: a hand-written URL and a brand template
// filled from a missing host must never end up in the same camera.
export function buildUrls(cam) {
  const brand = resolveBrand(cam.brand) || resolveBrand('generic');
  const out = { snapshotAuth: cam.snapshotAuth || brand.snapshotAuth || 'basic' };
  const fromBrand = (template) => (template && cam.host ? fill(template, cam, brand) : null);

  out.main = cam.url || fromBrand(brand.main);
  out.sub = cam.subUrl || (cam.url ? cam.url : fromBrand(brand.sub)) || out.main;
  out.snapshot = cam.snapshotUrl || (cam.url && !cam.host ? null : fromBrand(brand.snapshot));
  return out;
}

export function brandList() {
  return Object.entries(BRANDS).map(([key, b]) => ({
    key,
    label: b.label,
    cloudOnly: !!b.cloudOnly,
    note: b.note || b.bridge || '',
  }));
}
