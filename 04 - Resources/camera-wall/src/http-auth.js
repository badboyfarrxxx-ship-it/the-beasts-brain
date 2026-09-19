// HTTP GET with Basic and Digest auth. Hikvision, Dahua and Amcrest snapshot
// endpoints all speak Digest, which node's fetch does not do for you.

import http from 'node:http';
import https from 'node:https';
import { createHash, randomBytes } from 'node:crypto';

function hash(algorithm, text) {
  const name = /sha-?256/i.test(algorithm || '') ? 'sha256' : 'md5';
  return createHash(name).update(text).digest('hex');
}

function parseChallenge(header) {
  const out = {};
  const body = header.replace(/^\s*Digest\s+/i, '');
  const re = /([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|([^,\s]+))/gi;
  let m;
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = m[2] ?? m[3];
  return out;
}

function digestHeader(challenge, { username, password, method, uri }) {
  const algorithm = challenge.algorithm || 'MD5';
  const cnonce = randomBytes(8).toString('hex');
  const nc = '00000001';
  let ha1 = hash(algorithm, `${username}:${challenge.realm}:${password}`);
  if (/-sess$/i.test(algorithm)) ha1 = hash(algorithm, `${ha1}:${challenge.nonce}:${cnonce}`);
  const ha2 = hash(algorithm, `${method}:${uri}`);
  const qop = (challenge.qop || '').split(',').map((s) => s.trim()).includes('auth') ? 'auth' : null;
  const response = qop
    ? hash(algorithm, `${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`)
    : hash(algorithm, `${ha1}:${challenge.nonce}:${ha2}`);

  const parts = [
    `username="${username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);
  if (challenge.algorithm) parts.push(`algorithm=${challenge.algorithm}`);
  if (qop) parts.push(`qop=auth`, `nc=${nc}`, `cnonce="${cnonce}"`);
  return `Digest ${parts.join(', ')}`;
}

function request(url, { headers = {}, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(
      target,
      {
        method: 'GET',
        headers,
        // Cameras ship self-signed certificates; this request never leaves the LAN.
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.end();
  });
}

export async function fetchWithAuth(url, { username, password, timeoutMs = 8000 } = {}) {
  const target = new URL(url);
  const user = username || decodeURIComponent(target.username || '');
  const pass = password || decodeURIComponent(target.password || '');
  target.username = '';
  target.password = '';
  const clean = target.toString();
  const uri = `${target.pathname}${target.search}`;

  let res = await request(clean, { timeoutMs });
  if (res.status !== 401 || !user) return res;

  const challengeHeader = res.headers['www-authenticate'] || '';
  if (/^\s*digest/i.test(challengeHeader)) {
    const challenge = parseChallenge(challengeHeader);
    res = await request(clean, {
      timeoutMs,
      headers: { Authorization: digestHeader(challenge, { username: user, password: pass, method: 'GET', uri }) },
    });
    return res;
  }
  const basic = Buffer.from(`${user}:${pass}`).toString('base64');
  return request(clean, { timeoutMs, headers: { Authorization: `Basic ${basic}` } });
}
