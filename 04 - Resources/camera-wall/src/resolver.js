// Some cameras — Tuya-based ones especially — do not have a fixed stream path.
// The path differs between models sold under the same name, and on a few
// firmwares it changes after a reboot. A camera set to "url": "auto" gets its
// path found by measurement and remembered, and found again if it moves.

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { probeHost, pickStreams } from './probe.js';
import { logger } from './log.js';

const log = logger('resolver');
const inFlight = new Map();

function cachePath(config) {
  return join(dirname(config.path || '.'), '.camera-wall-urls.json');
}

function readCache(config) {
  const path = cachePath(config);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(config, cache) {
  const path = cachePath(config);
  try {
    writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
    chmodSync(path, 0o600);
  } catch (e) {
    log.warn(`could not save resolved URLs: ${e.message}`);
  }
}

function key(cam) {
  return `${cam.id}@${cam.host}`;
}

// Only the port and path are cached. Credentials stay in the config and are
// pasted back on at use time, so this file is not a second place they leak from.
function toUrl(cam, port, path) {
  const credentials = cam.username
    ? `${encodeURIComponent(cam.username)}:${encodeURIComponent(cam.password || '')}@`
    : '';
  return `rtsp://${credentials}${cam.host}:${port}${path}`;
}

export function cachedUrls(config, cam) {
  const entry = readCache(config)[key(cam)];
  if (!entry) return null;
  return {
    main: toUrl(cam, entry.port, entry.mainPath),
    sub: entry.subPath ? toUrl(cam, entry.port, entry.subPath) : toUrl(cam, entry.port, entry.mainPath),
    snapshot: cam.urls?.snapshot || null,
    snapshotAuth: cam.urls?.snapshotAuth || 'basic',
    foundAt: entry.foundAt,
  };
}

export async function resolveCamera(config, cam, { force = false, onProgress } = {}) {
  if (!cam.host) throw new Error(`camera "${cam.id}" is set to auto but has no host`);

  if (!force) {
    const hit = cachedUrls(config, cam);
    if (hit) return hit;
  }

  const existing = inFlight.get(cam.id);
  if (existing) return existing;

  const job = (async () => {
    log.info(`${cam.id}: looking for the stream on ${cam.host}`);
    const hits = await probeHost(config, {
      host: cam.host,
      ports: cam.ports || undefined,
      username: cam.username,
      password: cam.password,
      onResult: onProgress,
    });
    const picked = pickStreams(hits);
    if (!picked) {
      log.warn(`${cam.id}: no stream found on ${cam.host}`);
      return null;
    }

    const cache = readCache(config);
    cache[key(cam)] = {
      port: picked.main.port,
      mainPath: picked.main.path,
      subPath: picked.sub?.path || null,
      foundAt: new Date().toISOString(),
    };
    writeCache(config, cache);
    log.info(`${cam.id}: found ${picked.main.port}${picked.main.path}`);
    return cachedUrls(config, cam);
  })().finally(() => inFlight.delete(cam.id));

  inFlight.set(cam.id, job);
  return job;
}

export function forgetCamera(config, cam) {
  const cache = readCache(config);
  if (!(key(cam) in cache)) return;
  delete cache[key(cam)];
  writeCache(config, cache);
}
