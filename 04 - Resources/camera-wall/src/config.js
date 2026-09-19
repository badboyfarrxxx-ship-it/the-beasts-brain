import { readFileSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUrls, resolveBrand } from './brands.js';
import { registerSecret } from './log.js';

export const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  server: { host: '127.0.0.1', port: 8480 },
  auth: { enabled: true, username: 'admin', passwordHash: null },
  ffmpeg: { path: null, ffprobePath: null },
  defaults: {
    transport: 'tcp',        // rtsp over tcp; udp drops frames on wifi
    mode: 'auto',            // auto | copy | transcode
    audio: false,
    idleTimeoutSec: 20,      // kill ffmpeg this long after the last viewer leaves
    snapshotCacheSec: 5,
    maxTranscodeHeight: 720,
  },
  cameras: [],
};

// "env:CAM_PW" pulls the value from the environment instead of the file.
function deref(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('env:')) {
    const name = value.slice(4);
    const found = process.env[name];
    if (found === undefined) throw new Error(`needs the environment variable ${name}, which is not set`);
    return found;
  }
  return value;
}

function merge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base[k] || {}, v) : v;
  }
  return out;
}

function slug(text, index) {
  const s = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || `camera-${index + 1}`;
}

export function configPath(explicit) {
  if (explicit) return resolve(explicit);
  if (process.env.CAMERA_WALL_CONFIG) return resolve(process.env.CAMERA_WALL_CONFIG);
  return join(APP_ROOT, 'cameras.json');
}

export function loadConfig(explicit) {
  const path = configPath(explicit);
  if (!existsSync(path)) {
    const err = new Error(`no config at ${path} — copy cameras.example.json to cameras.json and edit it`);
    err.code = 'ENOCONFIG';
    err.path = path;
    throw err;
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${path} is not valid JSON: ${e.message}`);
  }
  const config = merge(DEFAULTS, raw);
  config.path = path;

  const seen = new Set();
  config.cameras = (config.cameras || []).map((entry, i) => {
    try {
      return prepareCamera(entry, i, config, seen);
    } catch (e) {
      // One broken entry must not cost you the other eleven cameras. The tile
      // stays on the wall and says what is wrong with it.
      const cam = { ...entry };
      cam.id = slug(cam.id || cam.name, i);
      cam.name = cam.name || cam.id;
      cam.type = 'broken';
      cam.brandLabel = resolveBrand(cam.brand)?.label || cam.brand || 'Unknown';
      cam.enabled = true;
      cam.configError = e.message;
      delete cam.username;
      delete cam.password;
      delete cam.url;
      delete cam.subUrl;
      delete cam.snapshotUrl;
      return cam;
    }
  });

  return config;
}

function prepareCamera(entry, i, config, seen) {
    const cam = { ...entry };
    cam.id = slug(cam.id || cam.name, i);
    if (seen.has(cam.id)) throw new Error(`two cameras share the id "${cam.id}" — ids must be unique`);
    seen.add(cam.id);
    cam.name = cam.name || cam.id;
    cam.enabled = cam.enabled !== false;
    cam.username = deref(cam.username);
    cam.password = deref(cam.password);
    cam.url = deref(cam.url);
    cam.subUrl = deref(cam.subUrl);
    cam.snapshotUrl = deref(cam.snapshotUrl);
    registerSecret(cam.password);

    const brand = resolveBrand(cam.brand);
    cam.type = cam.type || (brand?.cloudOnly ? 'link' : 'stream');
    cam.brandLabel = brand?.label || cam.brand || 'Generic';

    if (cam.type === 'link') {
      cam.appUrl = cam.appUrl || brand?.appUrl || null;
      cam.bridgeNote = cam.note || brand?.bridge || null;
      return cam;
    }

    cam.transport = cam.transport || config.defaults.transport;
    cam.mode = cam.mode || config.defaults.mode;
    cam.player = cam.player === 'mjpeg' ? 'mjpeg' : 'auto';
    cam.audio = cam.audio ?? config.defaults.audio;
    if (cam.url === 'auto') {
      // The path is found by probing the camera on first use and remembered.
      if (!cam.host) throw new Error('"url": "auto" needs "host" set to the camera IP');
      cam.autoResolve = true;
      cam.url = null;
      cam.urls = { main: null, sub: null, snapshot: cam.snapshotUrl || null, snapshotAuth: cam.snapshotAuth || 'basic' };
      return cam;
    }

    cam.urls = buildUrls(cam);
    if (!cam.urls.main) {
      throw new Error('no stream URL — set "url", or set "brand" and "host"');
    }
    return cam;
}

export function saveConfig(config, explicit) {
  const path = configPath(explicit || config.path);
  const clone = JSON.parse(JSON.stringify(config));
  delete clone.path;
  for (const cam of clone.cameras || []) {
    delete cam.urls;
    delete cam.brandLabel;
  }
  writeFileSync(path, `${JSON.stringify(clone, null, 2)}\n`, { mode: 0o600 });
  // writeFileSync only applies mode when it creates the file, and this file
  // holds camera passwords, so tighten it every time.
  try {
    chmodSync(path, 0o600);
  } catch { /* Windows ACLs, nothing to do */ }
  return path;
}

export { DEFAULTS };
