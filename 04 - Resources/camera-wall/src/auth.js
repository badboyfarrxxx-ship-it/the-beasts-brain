// The wall holds every camera in the house behind one URL, so it gets a lock on
// it. Default bind is 127.0.0.1; if you widen that, the password is the only
// thing between the internet and your living room.

import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE = 'camera_wall_session';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, N, r, p, salt, key] = stored.split('$');
  const expected = Buffer.from(key, 'base64');
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class Sessions {
  constructor(config) {
    this.config = config;
    this.tokens = new Map(); // token -> expiry
    this.attempts = new Map(); // ip -> { count, until }
  }

  get enabled() {
    return this.config.auth?.enabled !== false;
  }

  get configured() {
    return !!this.config.auth?.passwordHash;
  }

  issue() {
    const token = randomUUID().replaceAll('-', '') + randomBytes(16).toString('hex');
    this.tokens.set(token, Date.now() + SESSION_TTL_MS);
    return token;
  }

  valid(token) {
    if (!token) return false;
    const expiry = this.tokens.get(token);
    if (!expiry) return false;
    if (expiry < Date.now()) {
      this.tokens.delete(token);
      return false;
    }
    return true;
  }

  revoke(token) {
    this.tokens.delete(token);
  }

  // Five wrong passwords buys a one-minute wait. Enough to make a script useless
  // without locking Nathan out of his own cameras.
  throttled(ip) {
    const entry = this.attempts.get(ip);
    if (!entry) return 0;
    if (entry.until > Date.now()) return Math.ceil((entry.until - Date.now()) / 1000);
    if (entry.until) this.attempts.delete(ip);
    return 0;
  }

  recordFailure(ip) {
    const entry = this.attempts.get(ip) || { count: 0, until: 0 };
    entry.count += 1;
    if (entry.count >= 5) {
      entry.until = Date.now() + 60000;
      entry.count = 0;
    }
    this.attempts.set(ip, entry);
  }

  recordSuccess(ip) {
    this.attempts.delete(ip);
  }

  authenticate(req) {
    if (!this.enabled) return true;
    if (!this.configured) return true; // first run: the setup page takes over
    return this.valid(readCookie(req, COOKIE));
  }
}

export function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token, { secure = false } = {}) {
  const bits = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { COOKIE };
