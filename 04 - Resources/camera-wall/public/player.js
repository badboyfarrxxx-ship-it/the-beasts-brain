// Feeds fragmented MP4 from the WebSocket into a <video> through Media Source
// Extensions, and keeps the picture pinned to the live edge. Without the
// catch-up logic, a tile that stutters once stays a few seconds behind forever.

const TARGET_LATENCY = 1.5; // seconds of buffer we are happy to sit on
const MAX_LATENCY = 4;      // beyond this, jump forward
const KEEP_BEHIND = 12;     // seconds of played video to hold on to

export function codecFromInit(bytes) {
  const at = find(bytes, 'avcC');
  if (at !== -1 && bytes.length > at + 7) {
    return `avc1.${hex(bytes[at + 5])}${hex(bytes[at + 6])}${hex(bytes[at + 7])}`;
  }
  const hv = find(bytes, 'hvcC');
  if (hv !== -1 && bytes.length > hv + 16) {
    const body = bytes.subarray(hv + 4);
    const profileSpace = (body[1] >> 6) & 3;
    const tier = (body[1] >> 5) & 1 ? 'H' : 'L';
    const profile = body[1] & 0x1f;
    let compat = (body[2] << 24) | (body[3] << 16) | (body[4] << 8) | body[5];
    let reversed = 0;
    for (let i = 0; i < 32; i += 1) reversed = (reversed << 1) | ((compat >>> i) & 1);
    const compatHex = ((reversed >>> 0).toString(16).replace(/0+$/, '') || '0');
    return `hvc1.${['', 'A', 'B', 'C'][profileSpace]}${profile}.${compatHex}.${tier}${body[12]}`;
  }
  return 'avc1.640029';
}

function hex(n) {
  return n.toString(16).padStart(2, '0');
}

function find(bytes, fourcc) {
  const a = fourcc.charCodeAt(0);
  const b = fourcc.charCodeAt(1);
  const c = fourcc.charCodeAt(2);
  const d = fourcc.charCodeAt(3);
  for (let i = 0; i + 3 < bytes.length; i += 1) {
    if (bytes[i] === a && bytes[i + 1] === b && bytes[i + 2] === c && bytes[i + 3] === d) return i;
  }
  return -1;
}

export const supportsMse =
  typeof window !== 'undefined' && ('MediaSource' in window || 'ManagedMediaSource' in window);

export class Fmp4Player {
  constructor(video, { onError } = {}) {
    this.video = video;
    this.onError = onError || (() => {});
    this.queue = [];
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.codec = null;
    this.destroyed = false;
    this.waitingForInit = true;

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'none';
  }

  feed(kind, bytes) {
    if (this.destroyed) return;
    if (kind === 'init') {
      const codec = codecFromInit(bytes);
      if (codec !== this.codec) this.#openSource(codec);
      this.waitingForInit = false;
    } else if (this.waitingForInit) {
      return; // segment before init: useless, wait for the next init
    }
    this.queue.push(bytes);
    if (this.queue.length > 60) this.queue.splice(0, this.queue.length - 30);
    this.#drain();
  }

  #openSource(codec) {
    this.#teardownSource();
    this.codec = codec;
    const type = `video/mp4; codecs="${codec}"`;
    const Source = window.ManagedMediaSource || window.MediaSource;
    if (Source.isTypeSupported && !Source.isTypeSupported(type)) {
      this.onError(`this browser will not play ${codec}`);
      return;
    }
    const mediaSource = new Source();
    this.mediaSource = mediaSource;
    this.video.disableRemotePlayback = true;
    this.video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener(
      'sourceopen',
      () => {
        URL.revokeObjectURL(this.video.src);
        try {
          const sb = mediaSource.addSourceBuffer(type);
          sb.mode = 'segments';
          sb.addEventListener('updateend', () => this.#drain());
          sb.addEventListener('error', () => this.onError('decoder rejected the stream'));
          this.sourceBuffer = sb;
          this.#drain();
        } catch (e) {
          this.onError(`could not start the decoder: ${e.message}`);
        }
      },
      { once: true },
    );
  }

  #drain() {
    const sb = this.sourceBuffer;
    if (!sb || sb.updating || !this.queue.length) return;
    if (this.mediaSource.readyState !== 'open') return;
    const chunk = this.queue.shift();
    try {
      sb.appendBuffer(chunk);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        this.#trim(true);
        this.queue.unshift(chunk);
        return;
      }
      this.onError(`decoder error: ${e.message}`);
      return;
    }
    this.#trim(false);
    this.#catchUp();
  }

  #trim(aggressive) {
    const sb = this.sourceBuffer;
    const video = this.video;
    if (!sb || sb.updating || !sb.buffered.length) return;
    const start = sb.buffered.start(0);
    const cutoff = video.currentTime - (aggressive ? 2 : KEEP_BEHIND);
    if (cutoff > start + 1) {
      try {
        sb.remove(start, cutoff);
      } catch {
        /* removal races with append; the next pass gets it */
      }
    }
  }

  #catchUp() {
    const video = this.video;
    const sb = this.sourceBuffer;
    if (!sb || !sb.buffered.length) return;
    const end = sb.buffered.end(sb.buffered.length - 1);

    if (video.readyState >= 2 && video.paused) video.play().catch(() => {});
    if (video.currentTime === 0 || video.currentTime < sb.buffered.start(0)) {
      video.currentTime = Math.max(sb.buffered.start(0), end - TARGET_LATENCY);
      return;
    }
    const behind = end - video.currentTime;
    if (behind > MAX_LATENCY) {
      video.currentTime = end - TARGET_LATENCY; // a jump beats drifting further back
      video.playbackRate = 1;
    } else if (behind > TARGET_LATENCY + 0.6) {
      video.playbackRate = 1.05; // sneak back to the edge
    } else if (video.playbackRate !== 1) {
      video.playbackRate = 1;
    }
  }

  #teardownSource() {
    if (this.sourceBuffer && this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      } catch { /* already gone */ }
    }
    if (this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch { /* already ended */ }
    }
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.queue = [];
  }

  reset() {
    this.waitingForInit = true;
    this.queue = [];
  }

  destroy() {
    this.destroyed = true;
    this.#teardownSource();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
