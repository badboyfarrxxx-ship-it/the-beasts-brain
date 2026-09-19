// A small RFC 6455 server. The whole app is dependency-free on purpose: this
// thing has to still install and run in two years on a freshly wiped Windows
// box, and `npm install` is the part that rots.

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP = { CONT: 0x0, TEXT: 0x1, BINARY: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

export function isWebSocketUpgrade(req) {
  return (
    String(req.headers.upgrade || '').toLowerCase() === 'websocket' &&
    typeof req.headers['sec-websocket-key'] === 'string'
  );
}

export function accept(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  const digest = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${digest}\r\n\r\n`,
  );
  return new WebSocket(socket, head);
}

export function reject(socket, status = 400, message = 'Bad Request') {
  socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
}

export class WebSocket extends EventEmitter {
  constructor(socket, head) {
    super();
    this.socket = socket;
    this.open = true;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOp = null;
    this.alive = true;

    socket.setNoDelay(true);
    socket.on('data', (chunk) => this.#ingest(chunk));
    socket.on('error', (err) => { this.#shutdown(err); });
    socket.on('close', () => this.#shutdown());

    this.heartbeat = setInterval(() => {
      if (!this.open) return;
      if (!this.alive) return this.close();
      this.alive = false;
      this.#frame(OP.PING, Buffer.alloc(0));
    }, 30000);
    this.heartbeat.unref?.();

    if (head?.length) this.#ingest(head);
  }

  // Back-pressure: if a viewer's socket is backed up, drop video rather than
  // buffer it into memory. A late frame is worth nothing on a live wall.
  get backedUp() {
    return this.socket.writableLength > 4 * 1024 * 1024;
  }

  sendText(data) {
    this.#frame(OP.TEXT, Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8'));
  }

  sendBinary(buffer) {
    this.#frame(OP.BINARY, buffer);
  }

  close(code = 1000) {
    if (!this.open) return;
    const payload = Buffer.alloc(2);
    payload.writeUInt16BE(code, 0);
    this.#frame(OP.CLOSE, payload);
    this.open = false;
    this.socket.end();
  }

  #shutdown(err) {
    if (!this.open && !this.heartbeat) return;
    this.open = false;
    clearInterval(this.heartbeat);
    this.heartbeat = null;
    // A viewer closing a laptop lid shows up here as EPIPE/ECONNRESET. Emitting
    // an unhandled 'error' event would take the whole server down with it.
    if (err && this.listenerCount('error')) this.emit('error', err);
    this.emit('close');
  }

  #frame(opcode, payload) {
    if (!this.open || this.socket.destroyed) return;
    const length = payload.length;
    let header;
    if (length < 126) {
      header = Buffer.alloc(2);
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    header[0] = 0x80 | opcode;
    try {
      this.socket.write(header);
      if (length) this.socket.write(payload);
    } catch {
      // Socket went away mid-write; the close handler cleans up.
      this.open = false;
    }
  }

  #ingest(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    for (;;) {
      const frame = this.#readFrame();
      if (!frame) return;
      this.#dispatch(frame);
      if (!this.open) return;
    }
  }

  #readFrame() {
    const buf = this.buffer;
    if (buf.length < 2) return null;
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let length = buf[1] & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (buf.length < offset + 2) return null;
      length = buf.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (buf.length < offset + 8) return null;
      const big = buf.readBigUInt64BE(offset);
      if (big > 16n * 1024n * 1024n) { this.close(1009); return null; }
      length = Number(big);
      offset += 8;
    }

    let mask = null;
    if (masked) {
      if (buf.length < offset + 4) return null;
      mask = buf.subarray(offset, offset + 4);
      offset += 4;
    }
    if (buf.length < offset + length) return null;

    const payload = Buffer.from(buf.subarray(offset, offset + length));
    if (mask) for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i & 3];
    this.buffer = buf.subarray(offset + length);
    return { fin, opcode, payload };
  }

  #dispatch({ fin, opcode, payload }) {
    switch (opcode) {
      case OP.PING:
        this.#frame(OP.PONG, payload);
        return;
      case OP.PONG:
        this.alive = true;
        return;
      case OP.CLOSE:
        this.open = false;
        this.socket.end();
        return;
      case OP.CONT: {
        if (this.fragmentOp === null) return;
        this.fragments.push(payload);
        if (!fin) return;
        const full = Buffer.concat(this.fragments);
        const op = this.fragmentOp;
        this.fragments = [];
        this.fragmentOp = null;
        this.#deliver(op, full);
        return;
      }
      case OP.TEXT:
      case OP.BINARY:
        if (!fin) {
          this.fragmentOp = opcode;
          this.fragments = [payload];
          return;
        }
        this.#deliver(opcode, payload);
        return;
      default:
        this.close(1002);
    }
  }

  #deliver(opcode, payload) {
    this.alive = true;
    if (opcode === OP.TEXT) this.emit('text', payload.toString('utf8'));
    else this.emit('binary', payload);
  }
}
