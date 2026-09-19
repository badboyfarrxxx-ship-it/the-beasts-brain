import { Fmp4Player, supportsMse } from '/player.js';

const STORE_KEY = 'camera-wall.prefs.v1';
const grid = document.getElementById('grid');
const strip = document.getElementById('status-strip');
const focusPanel = document.getElementById('focus');
const focusSlot = document.getElementById('focus-slot');
const focusName = document.getElementById('focus-name');

const prefs = loadPrefs();
const tiles = new Map();
let socket = null;
let socketRetry = 0;
let focused = null;

function loadPrefs() {
  const base = { layout: 'auto', mode: 'live', muted: true, hidden: [], stillsIntervalSec: 6 };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
  } catch {
    return base;
  }
}

function savePrefs() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch { /* private window: preferences just do not stick */ }
}

function note(message, kind = 'info') {
  strip.textContent = message;
  strip.className = kind;
  strip.hidden = !message;
}

// --- a single camera tile ---------------------------------------------------

class Tile {
  constructor(camera) {
    this.camera = camera;
    this.quality = 'sub';
    this.state = 'idle';
    this.usingMjpeg = camera.type === 'stream' && (camera.player === 'mjpeg' || !supportsMse);

    const el = document.createElement('article');
    el.className = 'tile';
    el.dataset.id = camera.id;
    el.tabIndex = 0;

    const surface = document.createElement('div');
    surface.className = 'surface';

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.img = document.createElement('img');
    this.img.alt = camera.name;
    this.img.decoding = 'async';
    surface.append(this.video, this.img);

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    surface.append(this.overlay);

    const label = document.createElement('div');
    label.className = 'label';
    this.dot = document.createElement('span');
    this.dot.className = 'dot';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = camera.name;
    this.badge = document.createElement('span');
    this.badge.className = 'badge';
    label.append(this.dot, name, this.badge);

    el.append(surface, label);
    el.addEventListener('click', () => openFocus(camera.id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFocus(camera.id);
      }
    });

    this.el = el;
    this.player = null;

    if (camera.type === 'link') this.renderCloudOnly();
    if (camera.type === 'broken') {
      this.el.classList.add('cloud');
      this.setStatus('error', `Check cameras.json: ${camera.configError}`);
    }
  }

  renderCloudOnly() {
    this.el.classList.add('cloud');
    this.setStatus('cloud', this.camera.note || 'Cloud-only camera — no local stream');
    const link = document.createElement('a');
    link.className = 'app-link';
    link.href = this.camera.appUrl || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Open ${this.camera.brandLabel || 'app'}`;
    link.addEventListener('click', (e) => e.stopPropagation());
    if (this.camera.appUrl) this.overlay.append(link);
  }

  setStatus(state, message) {
    this.state = state;
    this.el.dataset.state = state;
    this.dot.title = message || state;
    const showOverlay = state !== 'live';
    this.overlay.classList.toggle('visible', showOverlay);
    if (showOverlay) {
      const text = this.overlay.querySelector('.overlay-text') || document.createElement('p');
      text.className = 'overlay-text';
      text.textContent = message || labelFor(state);
      if (!text.parentNode) this.overlay.prepend(text);
    }
  }

  setBadge(text) {
    this.badge.textContent = text || '';
  }

  // Live video over the WebSocket.
  startLive(quality = 'sub') {
    if (this.camera.type !== 'stream') return;
    this.quality = quality;
    if (this.usingMjpeg) return this.startMjpeg(quality);

    this.img.removeAttribute('src');
    this.el.classList.remove('stills');
    if (!this.player) {
      this.player = new Fmp4Player(this.video, {
        onError: (message) => {
          this.setStatus('error', message);
          // A codec the browser refuses is not going to start working. Fall
          // back to server-side JPEG instead of showing a dead tile.
          this.usingMjpeg = true;
          this.stopLive();
          this.startMjpeg(this.quality);
        },
      });
    }
    this.player.reset();
    send({ t: 'subscribe', id: this.camera.id, quality });
    this.setStatus(this.state === 'live' ? 'live' : 'connecting');
  }

  stopLive() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    send({ t: 'unsubscribe', id: this.camera.id });
  }

  startMjpeg(quality = 'sub') {
    this.el.classList.add('stills');
    this.setBadge('JPEG');
    this.img.src = `/api/cameras/${this.camera.id}/mjpeg?quality=${quality}&t=${Date.now()}`;
    this.img.onload = () => this.setStatus('live');
    this.img.onerror = () => this.setStatus('error', 'stream stopped');
  }

  stopMjpeg() {
    this.img.onload = null;
    this.img.onerror = null;
    this.img.removeAttribute('src');
  }

  // Stills mode: one JPEG every few seconds, near-zero cost.
  startStills() {
    this.el.classList.add('stills');
    this.setBadge('still');
    if (this.state !== 'live') this.setStatus('connecting');
    const tick = () => {
      if (this.stillsTimer === null) return;
      const next = new Image();
      next.onload = () => {
        this.img.src = next.src;
        this.setStatus('live');
      };
      next.onerror = () => this.setStatus('error', 'no still available');
      next.src = `/api/cameras/${this.camera.id}/snapshot?t=${Date.now()}`;
    };
    this.stillsTimer = setInterval(tick, Math.max(2, prefs.stillsIntervalSec) * 1000);
    tick();
  }

  stopStills() {
    clearInterval(this.stillsTimer);
    this.stillsTimer = null;
  }

  stopAll() {
    this.stopStills();
    this.stopMjpeg();
    this.stopLive();
    this.setBadge('');
  }

  feed(kind, bytes) {
    if (!this.player) return;
    this.player.feed(kind, bytes);
    if (this.state !== 'live') this.setStatus('live');
  }

  setMuted(muted) {
    this.video.muted = muted || !this.camera.audio;
  }

  async saveStill() {
    const name = `${this.camera.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    let url;
    if (this.video.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = this.video.videoWidth;
      canvas.height = this.video.videoHeight;
      canvas.getContext('2d').drawImage(this.video, 0, 0);
      url = canvas.toDataURL('image/jpeg', 0.92);
    } else {
      url = `/api/cameras/${this.camera.id}/snapshot?t=${Date.now()}`;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }
}

function labelFor(state) {
  return {
    idle: 'Not connected',
    connecting: 'Connecting…',
    starting: 'Connecting…',
    retrying: 'Camera unreachable — retrying',
    error: 'Camera unreachable',
    cloud: 'Cloud-only camera',
    live: '',
  }[state] || state;
}

// --- websocket --------------------------------------------------------------

function send(message) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function connect() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${scheme}://${location.host}/ws`);
  socket.binaryType = 'arraybuffer';

  socket.addEventListener('open', () => {
    socketRetry = 0;
    note('');
    if (prefs.mode === 'live') {
      for (const tile of visibleTiles()) {
        if (!tile.usingMjpeg && tile.camera.type === 'stream') {
          tile.startLive(focused === tile.camera.id ? 'main' : 'sub');
        }
      }
    }
  });

  socket.addEventListener('message', (event) => {
    if (typeof event.data === 'string') return handleText(event.data);
    const bytes = new Uint8Array(event.data);
    const kind = bytes[0] === 0 ? 'init' : 'segment';
    const idLength = bytes[1];
    const id = new TextDecoder().decode(bytes.subarray(2, 2 + idLength));
    tiles.get(id)?.feed(kind, bytes.subarray(2 + idLength));
  });

  socket.addEventListener('close', () => {
    const wait = Math.min(15000, 500 * 2 ** socketRetry);
    socketRetry += 1;
    note('Lost the connection to the server — reconnecting…', 'warn');
    setTimeout(connect, wait);
  });

  socket.addEventListener('error', () => socket.close());
}

function handleText(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }
  if (message.t !== 'status') return;
  const tile = tiles.get(message.id);
  if (!tile) return;
  if (message.state === 'live') tile.setStatus('live');
  else tile.setStatus(message.state, message.error);
  if (message.transcoding) tile.setBadge('re-encoded');
}

// --- wall -------------------------------------------------------------------

function visibleTiles() {
  return [...tiles.values()].filter((t) => !prefs.hidden.includes(t.camera.id));
}

function applyLayout() {
  const count = visibleTiles().length || 1;
  const columns = prefs.layout === 'auto' ? Math.ceil(Math.sqrt(count)) : Number(prefs.layout);
  grid.style.setProperty('--columns', String(Math.max(1, columns)));
}

function render(cameras) {
  grid.textContent = '';
  tiles.clear();
  for (const camera of cameras) {
    const tile = new Tile(camera);
    tiles.set(camera.id, tile);
    if (!prefs.hidden.includes(camera.id)) grid.append(tile.el);
  }
  document.getElementById('empty').hidden = cameras.length > 0;
  applyLayout();
  startAll();
}

function startAll() {
  for (const tile of tiles.values()) {
    tile.stopAll();
    if (prefs.hidden.includes(tile.camera.id) || tile.camera.type !== 'stream') continue;
    if (prefs.mode === 'stills') tile.startStills();
    else if (tile.usingMjpeg) tile.startMjpeg(tile.quality);
    else tile.startLive(focused === tile.camera.id ? 'main' : 'sub');
    tile.setMuted(prefs.muted);
  }
}

function openFocus(id) {
  const tile = tiles.get(id);
  if (!tile || tile.camera.type !== 'stream') return;
  focused = id;
  focusName.textContent = tile.camera.name;
  focusSlot.append(tile.el);
  focusPanel.hidden = false;
  document.body.classList.add('focusing');
  // Full resolution only while it is on screen.
  if (prefs.mode !== 'stills' && !tile.usingMjpeg) tile.startLive('main');
  else if (tile.usingMjpeg) tile.startMjpeg('main');
  tile.setMuted(prefs.muted);
  tile.el.focus();
}

function closeFocus() {
  if (!focused) return;
  const tile = tiles.get(focused);
  focused = null;
  focusPanel.hidden = true;
  document.body.classList.remove('focusing');
  if (!tile) return;
  const position = visibleTiles().indexOf(tile);
  const before = grid.children[position] || null;
  grid.insertBefore(tile.el, before);
  if (prefs.mode !== 'stills' && !tile.usingMjpeg) tile.startLive('sub');
  else if (tile.usingMjpeg) tile.startMjpeg('sub');
}

function buildPicker(cameras) {
  const list = document.getElementById('picker-list');
  list.textContent = '';
  for (const camera of cameras) {
    const row = document.createElement('label');
    row.className = 'picker-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !prefs.hidden.includes(camera.id);
    box.addEventListener('change', () => {
      prefs.hidden = box.checked
        ? prefs.hidden.filter((x) => x !== camera.id)
        : [...prefs.hidden, camera.id];
      savePrefs();
      render(cameras);
    });
    const text = document.createElement('span');
    text.textContent = `${camera.name} — ${camera.brandLabel || 'unknown brand'}`;
    row.append(box, text);
    list.append(row);
  }
}

function wireControls(cameras) {
  const layout = document.getElementById('layout');
  layout.value = prefs.layout;
  layout.addEventListener('change', () => {
    prefs.layout = layout.value;
    savePrefs();
    applyLayout();
  });

  const mode = document.getElementById('mode');
  mode.value = prefs.mode;
  mode.addEventListener('change', () => {
    prefs.mode = mode.value;
    savePrefs();
    startAll();
  });

  const mute = document.getElementById('mute');
  const paintMute = () => {
    mute.textContent = prefs.muted ? 'Muted' : 'Audio on';
    mute.setAttribute('aria-pressed', String(prefs.muted));
    for (const tile of tiles.values()) tile.setMuted(prefs.muted);
  };
  mute.addEventListener('click', () => {
    prefs.muted = !prefs.muted;
    savePrefs();
    paintMute();
  });
  paintMute();

  document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('cameras-btn').addEventListener('click', () => document.getElementById('picker').showModal());
  document.getElementById('focus-close').addEventListener('click', closeFocus);
  document.getElementById('focus-snap').addEventListener('click', () => focused && tiles.get(focused).saveStill());
  document.getElementById('signout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') return closeFocus();
    if (key === 'f') return toggleFullscreen();
    if (key === 'm') return document.getElementById('mute').click();
    if (key === 's' && focused) return tiles.get(focused).saveStill();
    if (/^[1-9]$/.test(key)) {
      const tile = visibleTiles()[Number(key) - 1];
      if (tile) openFocus(tile.camera.id);
    }
  });

  // A hidden tab keeps no cameras awake.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const tile of tiles.values()) tile.stopAll();
    else startAll();
  });

  buildPicker(cameras);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

async function main() {
  const res = await fetch('/api/state');
  if (res.status === 401) {
    location.reload();
    return;
  }
  const state = await res.json();
  if (!state.ffmpeg.found) {
    note('ffmpeg is not installed, so live video cannot start. Install it with: winget install Gyan.FFmpeg', 'warn');
  }
  render(state.cameras);
  wireControls(state.cameras);
  connect();
}

main().catch((err) => note(`Could not load the wall: ${err.message}`, 'warn'));
