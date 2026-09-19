import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { APP_ROOT, loadConfig, saveConfig } from './config.js';
import { StreamManager } from './streams.js';
import { getSnapshot } from './snapshots.js';
import { Sessions, verifyPassword, hashPassword, sessionCookie, clearCookie, readCookie, COOKIE } from './auth.js';
import { isWebSocketUpgrade, accept, reject } from './ws.js';
import { locate, version } from './ffmpeg.js';
import { logger } from './log.js';

const log = logger('server');
const PUBLIC_DIR = join(APP_ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; " +
    "script-src 'self'; style-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'",
};

export async function startServer({ configPath, host, port } = {}) {
  let config = loadConfig(configPath);
  if (host) config.server.host = host;
  if (port) config.server.port = Number(port);

  const manager = new StreamManager(config);
  const sessions = new Sessions(config);

  const { ffmpeg } = await locate(config);
  if (!ffmpeg) log.warn('ffmpeg is not installed or not on PATH — video will not start. Run: winget install Gyan.FFmpeg');

  const listenHost = config.server.host || '127.0.0.1';
  if (listenHost !== '127.0.0.1' && listenHost !== 'localhost' && sessions.enabled === false) {
    log.warn(`listening on ${listenHost} with auth disabled — anyone on this network can watch your cameras`);
  }

  const server = http.createServer((req, res) => {
    handle(req, res, { config, manager, sessions }).catch((err) => {
      log.error('request failed', err);
      send(res, 500, { error: 'internal error' });
    });
  });

  server.on('upgrade', (req, socket, head) => {
    if (!isWebSocketUpgrade(req)) return reject(socket);
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws') return reject(socket, 404, 'Not Found');
    if (!sessions.authenticate(req)) return reject(socket, 401, 'Unauthorized');
    const ws = accept(req, socket, head);
    attachViewer(ws, { config, manager });
  });

  // Config reload on demand, so adding a camera does not mean a restart.
  server.reload = () => {
    const next = loadConfig(configPath);
    Object.assign(config, next);
    manager.config = config;
    sessions.config = config;
    return config;
  };

  await new Promise((resolve, reject2) => {
    server.once('error', reject2);
    server.listen(config.server.port, listenHost, resolve);
  });

  const shutdown = () => {
    log.info('shutting down');
    manager.stopAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // A dropped viewer or a camera yanking its cable must never take the wall
  // down. Anything else still crashes loudly, because it is a real bug.
  process.on('uncaughtException', (err) => {
    if (['EPIPE', 'ECONNRESET', 'ECONNABORTED'].includes(err.code)) {
      log.debug('ignored socket error', err.message);
      return;
    }
    log.error('fatal', err);
    process.exit(1);
  });

  return { server, config, manager, sessions };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const type = Buffer.isBuffer(body)
    ? headers['Content-Type'] || 'application/octet-stream'
    : typeof body === 'string'
      ? headers['Content-Type'] || 'text/plain; charset=utf-8'
      : 'application/json; charset=utf-8';
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers, 'Content-Type': type, 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readJson(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function publicCamera(cam) {
  return {
    id: cam.id,
    name: cam.name,
    type: cam.type,
    group: cam.group || null,
    brand: cam.brand || null,
    brandLabel: cam.brandLabel,
    enabled: cam.enabled,
    audio: !!cam.audio,
    player: cam.player || 'auto',
    appUrl: cam.appUrl || null,
    note: cam.note || cam.bridgeNote || null,
    configError: cam.configError || null,
    hasSnapshotUrl: !!cam.urls?.snapshot,
  };
}

async function handle(req, res, ctx) {
  const { config, manager, sessions } = ctx;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  if (path === '/api/health') {
    return send(res, 200, { ok: true, cameras: config.cameras.length });
  }

  // --- auth ---------------------------------------------------------------
  const needsSetup = sessions.enabled && !sessions.configured;

  if (path === '/api/setup' && req.method === 'POST') {
    if (!needsSetup) return send(res, 409, { error: 'password already set' });
    const { password } = await readJson(req);
    if (typeof password !== 'string' || password.length < 8) {
      return send(res, 400, { error: 'password must be at least 8 characters' });
    }
    config.auth.passwordHash = hashPassword(password);
    saveConfig(config);
    const token = sessions.issue();
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(token) });
  }

  if (path === '/api/login' && req.method === 'POST') {
    const ip = clientIp(req);
    const wait = sessions.throttled(ip);
    if (wait) return send(res, 429, { error: `too many attempts — wait ${wait}s` });
    const { password } = await readJson(req);
    if (!sessions.configured || !verifyPassword(String(password || ''), config.auth.passwordHash)) {
      sessions.recordFailure(ip);
      log.warn(`failed login from ${ip}`);
      return send(res, 401, { error: 'wrong password' });
    }
    sessions.recordSuccess(ip);
    const token = sessions.issue();
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(token) });
  }

  if (path === '/api/logout' && req.method === 'POST') {
    sessions.revoke(readCookie(req, COOKIE));
    return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
  }

  const authed = sessions.authenticate(req) && !needsSetup;

  if (path === '/' || path === '/index.html') {
    if (needsSetup) return serveFile(res, join(PUBLIC_DIR, 'setup.html'));
    if (!authed) return serveFile(res, join(PUBLIC_DIR, 'login.html'));
    return serveFile(res, join(PUBLIC_DIR, 'index.html'));
  }

  if (!authed && path.startsWith('/api/')) return send(res, 401, { error: 'not signed in' });

  // --- api ----------------------------------------------------------------
  if (path === '/api/state') {
    const ff = await locate(config);
    return send(res, 200, {
      cameras: config.cameras.filter((c) => c.enabled).map(publicCamera),
      ffmpeg: { found: !!ff.ffmpeg, version: ff.ffmpeg ? await version(config) : null },
      defaults: {
        idleTimeoutSec: config.defaults.idleTimeoutSec,
        snapshotCacheSec: config.defaults.snapshotCacheSec,
      },
    });
  }

  const camMatch = path.match(/^\/api\/cameras\/([a-z0-9-]+)\/(snapshot|mjpeg)$/);
  if (camMatch) {
    const cam = config.cameras.find((c) => c.id === camMatch[1] && c.enabled);
    if (!cam) return send(res, 404, { error: 'no such camera' });
    if (cam.type === 'link') return send(res, 409, { error: 'cloud-only camera has no local stream' });
    if (cam.type === 'broken') return send(res, 409, { error: cam.configError });
    if (camMatch[2] === 'snapshot') return serveSnapshot(req, res, cam, ctx);
    return serveMjpeg(req, res, cam, ctx, url);
  }

  // --- static -------------------------------------------------------------
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
  if (!authed && !isPublicAsset(path)) return serveFile(res, join(PUBLIC_DIR, 'login.html'));

  const safe = normalize(path).replace(/^([/\\])+/, '');
  if (safe.includes(`..${sep}`) || safe.includes('../')) return send(res, 403, { error: 'no' });
  return serveFile(res, join(PUBLIC_DIR, safe));
}

function isPublicAsset(path) {
  return ['/login.html', '/setup.html', '/login.js', '/setup.js', '/style.css', '/favicon.ico'].includes(path);
}

async function serveFile(res, filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    return send(res, 200, body, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  } catch {
    return send(res, 404, { error: 'not found' });
  }
}

async function serveSnapshot(req, res, cam, { config, manager }) {
  const shot = await getSnapshot(config, cam, manager);
  if (!shot) return send(res, 503, { error: 'no snapshot available' });
  return send(res, 200, shot.body, {
    'Content-Type': shot.contentType || 'image/jpeg',
    'Cache-Control': 'no-store',
  });
}

function serveMjpeg(req, res, cam, { manager }, url) {
  const quality = url.searchParams.get('quality') === 'main' ? 'main' : 'sub';
  const stream = manager.get(cam, quality, 'mjpeg');
  const boundary = 'camerawall';

  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': `multipart/x-mixed-replace; boundary=${boundary}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Connection: 'close',
  });

  const subscriber = {
    primed: true,
    send(kind, frame) {
      if (kind !== 'frame') return;
      if (res.writableLength > 2 * 1024 * 1024) return; // viewer cannot keep up
      res.write(`--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write('\r\n');
    },
  };

  const off = stream.subscribe(subscriber);
  const cleanup = () => {
    off();
    res.end();
  };
  req.on('close', cleanup);
  req.on('error', cleanup);
}

// --- websocket viewer -------------------------------------------------------

function attachViewer(ws, { config, manager }) {
  const subscriptions = new Map(); // camId -> { stream, off, subscriber, onStatus }

  ws.on('error', (err) => log.debug('viewer socket error', err.message));

  const sendStatus = (status) => {
    if (ws.open) ws.sendText({ t: 'status', ...status });
  };

  const drop = (camId) => {
    const entry = subscriptions.get(camId);
    if (!entry) return;
    entry.stream.off('status', entry.onStatus);
    entry.off();
    subscriptions.delete(camId);
  };

  const subscribe = (camId, quality) => {
    const cam = config.cameras.find((c) => c.id === camId && c.enabled);
    if (!cam) return sendStatus({ id: camId, state: 'error', error: 'no such camera' });
    if (cam.type === 'link') return sendStatus({ id: camId, state: 'cloud', error: 'cloud-only camera' });
    if (cam.type === 'broken') return sendStatus({ id: camId, state: 'error', error: cam.configError });

    const existing = subscriptions.get(camId);
    if (existing && existing.quality === quality) return;
    if (existing) drop(camId);

    const idBytes = Buffer.from(camId, 'utf8');
    const subscriber = {
      primed: false,
      send(kind, payload) {
        if (!ws.open) return;
        // Init segments always go; media can be dropped if the socket is behind.
        if (kind !== 'init' && ws.backedUp) return;
        const header = Buffer.alloc(2 + idBytes.length);
        header[0] = kind === 'init' ? 0 : 1;
        header[1] = idBytes.length;
        idBytes.copy(header, 2);
        ws.sendBinary(Buffer.concat([header, payload]));
      },
    };

    const stream = manager.get(cam, quality, 'fmp4');
    const onStatus = (status) => sendStatus(status);
    stream.on('status', onStatus);
    const off = stream.subscribe(subscriber);
    subscriptions.set(camId, { stream, off, subscriber, onStatus, quality });
    sendStatus(stream.status());
  };

  ws.on('text', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.t === 'subscribe') return subscribe(String(msg.id), msg.quality === 'main' ? 'main' : 'sub');
    if (msg.t === 'unsubscribe') return drop(String(msg.id));
    if (msg.t === 'ping') return ws.sendText({ t: 'pong' });
  });

  ws.on('close', () => {
    for (const camId of [...subscriptions.keys()]) drop(camId);
  });

  ws.sendText({ t: 'hello', cameras: config.cameras.filter((c) => c.enabled).map(publicCamera) });
}
