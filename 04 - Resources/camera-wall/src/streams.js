import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Fmp4Splitter } from './mp4.js';
import { locate, probe, fmp4Args, mjpegArgs } from './ffmpeg.js';
import { logger } from './log.js';

const log = logger('stream');

const BACKOFF_SECONDS = [1, 2, 4, 8, 15, 30, 30, 60];
const NO_DATA_TIMEOUT_MS = 20000;  // a running camera went quiet
const FIRST_DATA_TIMEOUT_MS = 12000; // a camera that never answered at all

class BaseStream extends EventEmitter {
  constructor(manager, cam, quality) {
    super();
    this.setMaxListeners(0);
    this.manager = manager;
    this.cam = cam;
    this.quality = quality;
    this.key = `${cam.id}:${quality}:${this.kind}`;
    this.subscribers = new Set();
    this.state = 'idle';
    this.error = null;
    this.child = null;
    this.failures = 0;
    this.retryTimer = null;
    this.idleTimer = null;
    this.watchdog = null;
    this.startedAt = null;
    this.bytes = 0;
  }

  get url() {
    return this.quality === 'main' ? this.cam.urls.main : this.cam.urls.sub || this.cam.urls.main;
  }

  subscribe(subscriber) {
    this.subscribers.add(subscriber);
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    if (this.state === 'idle' || this.state === 'error') this.start();
    else this.primeSubscriber(subscriber);
    this.emitStatus();
    return () => this.unsubscribe(subscriber);
  }

  unsubscribe(subscriber) {
    if (!this.subscribers.delete(subscriber)) return;
    if (this.subscribers.size) return;
    const idleMs = (this.manager.config.defaults.idleTimeoutSec ?? 20) * 1000;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.stop('idle'), idleMs);
    this.idleTimer.unref?.();
  }

  // eslint-disable-next-line no-unused-vars
  primeSubscriber(_subscriber) {}

  setState(state, error = null) {
    this.state = state;
    this.error = error;
    this.emitStatus();
  }

  emitStatus() {
    this.emit('status', this.status());
  }

  status() {
    return {
      id: this.cam.id,
      quality: this.quality,
      kind: this.kind,
      state: this.state,
      error: this.error,
      viewers: this.subscribers.size,
      since: this.startedAt,
    };
  }

  async start() {
    if (this.child || this.retryTimer) return;
    const { ffmpeg } = await locate(this.manager.config);
    if (!ffmpeg) {
      this.setState('error', 'ffmpeg not found — run: winget install Gyan.FFmpeg');
      return;
    }
    let args;
    try {
      args = await this.buildArgs();
    } catch (e) {
      this.setState('error', e.message);
      return;
    }
    if (!this.subscribers.size && this.state !== 'starting') {
      // Everyone left while we were probing.
      return;
    }

    this.setState('starting');
    log.info(`${this.key} starting`, this.url);
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.child = child;
    this.startedAt = Date.now();

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-2000);
    });
    child.stdout.on('data', (chunk) => {
      this.bytes += chunk.length;
      this.touch(true);
      try {
        this.consume(chunk);
      } catch (e) {
        log.warn(`${this.key} parse error`, e.message);
        this.restart('stream parse error');
      }
    });
    child.on('error', (err) => {
      this.child = null;
      this.fail(`could not run ffmpeg: ${err.message}`);
    });
    child.on('close', (code, signal) => {
      if (this.child !== child) return;
      this.child = null;
      clearTimeout(this.watchdog);
      if (this.stopping) {
        this.stopping = false;
        return;
      }
      const why = firstUsefulLine(stderr) || `ffmpeg exited (${signal || code})`;
      this.fail(why);
    });

    this.touch();
  }

  touch(firstByte = false) {
    clearTimeout(this.watchdog);
    const wait = firstByte || this.state === 'live' ? NO_DATA_TIMEOUT_MS : FIRST_DATA_TIMEOUT_MS;
    this.watchdog = setTimeout(() => {
      log.warn(`${this.key} no data for ${wait / 1000}s`);
      this.restart(this.state === 'live' ? 'camera stopped sending' : 'camera never sent anything');
    }, wait);
    this.watchdog.unref?.();
  }

  fail(message) {
    this.reset();
    this.setState('error', message);
    log.warn(`${this.key} ${message}`);
    if (!this.subscribers.size) return;
    const wait = BACKOFF_SECONDS[Math.min(this.failures, BACKOFF_SECONDS.length - 1)] * 1000;
    this.failures += 1;
    this.setState('retrying', message);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.subscribers.size) this.start();
      else this.setState('idle');
    }, wait);
    this.retryTimer.unref?.();
  }

  restart(reason) {
    this.kill();
    this.fail(reason);
  }

  kill() {
    clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.child) {
      this.stopping = true;
      const child = this.child;
      this.child = null;
      child.kill('SIGKILL');
    }
  }

  stop(reason = 'stopped') {
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.kill();
    this.reset();
    this.failures = 0;
    this.setState('idle');
    log.info(`${this.key} ${reason}`);
    this.manager.forget(this);
  }

  reset() {}
}

// Live video for the browser: fragmented MP4 pushed down a WebSocket.
export class Fmp4Stream extends BaseStream {
  get kind() { return 'fmp4'; }

  constructor(manager, cam, quality) {
    super(manager, cam, quality);
    this.init = null;
    this.codec = null;
    this.splitter = null;
  }

  async buildArgs() {
    const cam = this.cam;
    let transcode = cam.mode === 'transcode';
    if (cam.mode === 'auto') {
      const info = this.manager.probeCache.get(this.url) || (await probe(this.manager.config, this.url, cam.transport));
      if (info) {
        this.manager.probeCache.set(this.url, info);
        const codec = info.video?.codec;
        // h264 goes through untouched. Anything else (h265 mostly) gets
        // re-encoded, because browsers will not reliably play it.
        transcode = codec !== 'h264';
        if (transcode) log.info(`${this.key} re-encoding ${codec || 'unknown codec'} to h264`);
      }
    }
    this.transcoding = transcode;
    return fmp4Args(cam, this.url, {
      transcode,
      audio: !!cam.audio,
      maxHeight: this.manager.config.defaults.maxTranscodeHeight || 720,
    });
  }

  consume(chunk) {
    if (!this.splitter) {
      this.splitter = new Fmp4Splitter({
        onInit: (init, codec) => {
          this.init = init;
          this.codec = codec || 'avc1.640029';
          this.failures = 0;
          this.setState('live');
          for (const sub of this.subscribers) this.primeSubscriber(sub);
        },
        onSegment: (segment) => {
          for (const sub of this.subscribers) {
            if (!sub.primed) continue;
            sub.send('segment', segment, this);
          }
        },
      });
    }
    this.splitter.push(chunk);
  }

  primeSubscriber(sub) {
    if (!this.init || sub.primed) return;
    sub.send('init', this.init, this);
    sub.primed = true;
  }

  reset() {
    this.splitter = null;
    this.init = null;
    this.codec = null;
    for (const sub of this.subscribers) sub.primed = false;
  }

  status() {
    return { ...super.status(), codec: this.codec, transcoding: !!this.transcoding };
  }
}

// Still-image fallback: one shared ffmpeg, JPEG frames fanned out to any number
// of <img> tags. This is what runs on an iPhone, where MSE does not exist.
export class MjpegStream extends BaseStream {
  get kind() { return 'mjpeg'; }

  constructor(manager, cam, quality) {
    super(manager, cam, quality);
    this.tail = Buffer.alloc(0);
    this.lastFrame = null;
    this.lastFrameAt = 0;
  }

  async buildArgs() {
    return mjpegArgs(this.cam, this.url, {
      fps: this.cam.mjpegFps || 4,
      maxHeight: this.quality === 'main' ? 1080 : 480,
    });
  }

  consume(chunk) {
    this.tail = this.tail.length ? Buffer.concat([this.tail, chunk]) : chunk;
    for (;;) {
      const start = this.tail.indexOf(SOI);
      if (start === -1) {
        if (this.tail.length > 1 << 20) this.tail = Buffer.alloc(0);
        return;
      }
      const end = this.tail.indexOf(EOI, start + 2);
      if (end === -1) {
        if (start > 0) this.tail = this.tail.subarray(start);
        return;
      }
      const frame = this.tail.subarray(start, end + 2);
      this.tail = this.tail.subarray(end + 2);
      this.lastFrame = Buffer.from(frame);
      this.lastFrameAt = Date.now();
      if (this.state !== 'live') {
        this.failures = 0;
        this.setState('live');
      }
      for (const sub of this.subscribers) sub.send('frame', this.lastFrame, this);
    }
  }

  primeSubscriber(sub) {
    if (this.lastFrame) sub.send('frame', this.lastFrame, this);
  }

  reset() {
    this.tail = Buffer.alloc(0);
  }
}

const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

function firstUsefulLine(stderr) {
  const lines = String(stderr)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\s*(frame=|Last message repeated)/.test(l));
  if (!lines.length) return null;
  const line = lines[lines.length - 1];
  if (/401 Unauthorized|authorization failed/i.test(line)) return 'camera rejected the username or password';
  if (/Connection refused/i.test(line)) return 'connection refused — wrong port, or RTSP is off in the camera app';
  if (/No route to host|Network is unreachable|timed out|timeout/i.test(line)) return 'camera did not answer — check the IP address';
  if (/404 Not Found|Not Found/i.test(line)) return 'wrong stream path for this model';
  return line;
}

export class StreamManager {
  constructor(config) {
    this.config = config;
    this.streams = new Map();
    this.probeCache = new Map();
  }

  get(cam, quality = 'sub', kind = 'fmp4') {
    const key = `${cam.id}:${quality}:${kind}`;
    let stream = this.streams.get(key);
    if (!stream) {
      stream = kind === 'mjpeg' ? new MjpegStream(this, cam, quality) : new Fmp4Stream(this, cam, quality);
      this.streams.set(key, stream);
    }
    // Pick up config edits without restarting the server.
    stream.cam = cam;
    return stream;
  }

  peek(cam, quality, kind) {
    return this.streams.get(`${cam.id}:${quality}:${kind}`);
  }

  forget(stream) {
    if (!stream.subscribers.size) this.streams.delete(stream.key);
  }

  stopAll() {
    for (const stream of [...this.streams.values()]) stream.stop('shutting down');
    this.streams.clear();
  }

  snapshotOf(camId) {
    for (const stream of this.streams.values()) {
      if (stream.cam.id === camId && stream.kind === 'mjpeg' && stream.lastFrame) {
        return { body: stream.lastFrame, at: stream.lastFrameAt };
      }
    }
    return null;
  }
}
