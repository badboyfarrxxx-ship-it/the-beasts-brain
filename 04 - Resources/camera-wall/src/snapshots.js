import { spawn } from 'node:child_process';
import { locate, snapshotArgs } from './ffmpeg.js';
import { fetchWithAuth } from './http-auth.js';
import { logger } from './log.js';

const log = logger('snapshot');
const cache = new Map(); // camId -> { body, at, contentType }
const inFlight = new Map();

export async function getSnapshot(config, cam, manager, { maxAgeMs } = {}) {
  const ttl = maxAgeMs ?? (config.defaults.snapshotCacheSec ?? 5) * 1000;

  const live = manager?.snapshotOf(cam.id);
  if (live && Date.now() - live.at < ttl) return { body: live.body, contentType: 'image/jpeg', source: 'live' };

  const hit = cache.get(cam.id);
  if (hit && Date.now() - hit.at < ttl) return hit;

  if (inFlight.has(cam.id)) return inFlight.get(cam.id);

  const job = capture(config, cam)
    .then((result) => {
      if (result) cache.set(cam.id, result);
      return result;
    })
    .finally(() => inFlight.delete(cam.id));

  inFlight.set(cam.id, job);
  return job;
}

async function capture(config, cam) {
  if (cam.urls?.snapshot) {
    try {
      const res = await fetchWithAuth(cam.urls.snapshot, { username: cam.username, password: cam.password });
      const type = String(res.headers['content-type'] || '');
      if (res.status === 200 && res.body.length > 512 && type.startsWith('image/')) {
        return { body: res.body, contentType: type, at: Date.now(), source: 'http' };
      }
      log.debug(`${cam.id} snapshot url gave ${res.status} ${type}`);
    } catch (e) {
      log.debug(`${cam.id} snapshot url failed: ${e.message}`);
    }
  }
  return grabFrame(config, cam);
}

// Last resort: pull one frame out of the RTSP stream. Costs a connection and a
// second or two, which is why it sits behind the cache.
function grabFrame(config, cam) {
  return locate(config).then(({ ffmpeg }) => {
    if (!ffmpeg) return null;
    const url = cam.urls.sub || cam.urls.main;
    return new Promise((resolve) => {
      const child = spawn(ffmpeg, snapshotArgs(cam, url), { windowsHide: true });
      const chunks = [];
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
      child.stdout.on('data', (c) => chunks.push(c));
      child.stderr.on('data', (c) => { stderr = (stderr + c).slice(-500); });
      child.on('error', () => { clearTimeout(timer); resolve(null); });
      child.on('close', () => {
        clearTimeout(timer);
        const body = Buffer.concat(chunks);
        if (body.length < 512) {
          log.debug(`${cam.id} frame grab empty: ${stderr.trim()}`);
          return resolve(null);
        }
        resolve({ body, contentType: 'image/jpeg', at: Date.now(), source: 'ffmpeg' });
      });
    });
  });
}

export function cachedSnapshot(camId) {
  return cache.get(camId) || null;
}
