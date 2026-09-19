// Splits ffmpeg's fragmented-MP4 stdout into (a) the init segment, ftyp+moov,
// which every browser needs before anything else, and (b) one message per
// moof+mdat fragment. Without this split, a viewer who joins mid-stream gets a
// byte soup the Media Source Extensions parser rejects.

export class Fmp4Splitter {
  constructor({ onInit, onSegment }) {
    this.onInit = onInit;
    this.onSegment = onSegment;
    this.buffer = Buffer.alloc(0);
    this.initParts = [];
    this.initSent = false;
    this.segmentParts = [];
  }

  push(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;

    for (;;) {
      if (this.buffer.length < 8) return;
      let size = this.buffer.readUInt32BE(0);
      const type = this.buffer.toString('ascii', 4, 8);
      let headerSize = 8;
      if (size === 1) {
        if (this.buffer.length < 16) return;
        const large = this.buffer.readBigUInt64BE(8);
        if (large > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('mp4 box too large');
        size = Number(large);
        headerSize = 16;
      } else if (size === 0) {
        // "to end of file" — a live stream never ends, so wait for more.
        return;
      }
      if (size < headerSize) throw new Error(`bad mp4 box size ${size} for ${type}`);
      if (this.buffer.length < size) return;

      const box = this.buffer.subarray(0, size);
      this.buffer = this.buffer.subarray(size);
      this.#handle(type, box);
    }
  }

  #handle(type, box) {
    if (!this.initSent) {
      if (type === 'ftyp' || type === 'moov') {
        this.initParts.push(box);
        if (type === 'moov') {
          const init = Buffer.concat(this.initParts);
          this.initSent = true;
          this.initParts = [];
          this.onInit(init, codecStringFrom(init));
        }
        return;
      }
      // Anything before moov that is not part of init gets dropped.
      return;
    }

    if (type === 'moof') {
      this.segmentParts = [box];
      return;
    }
    if (type === 'mdat' && this.segmentParts.length) {
      this.segmentParts.push(box);
      const segment = Buffer.concat(this.segmentParts);
      this.segmentParts = [];
      this.onSegment(segment);
      return;
    }
    if (type === 'styp' || type === 'sidx' || type === 'free' || type === 'skip') return;
    // Unexpected top-level box mid-stream: ignore rather than desync.
  }
}

function findBox(buffer, fourcc) {
  const needle = Buffer.from(fourcc, 'ascii');
  const at = buffer.indexOf(needle);
  return at === -1 ? -1 : at;
}

// Builds the codecs="..." string MSE demands, straight out of the init segment.
export function codecStringFrom(init) {
  const codecs = [];

  const avcC = findBox(init, 'avcC');
  if (avcC !== -1 && init.length >= avcC + 8) {
    const profile = init[avcC + 5];
    const compat = init[avcC + 6];
    const level = init[avcC + 7];
    codecs.push(`avc1.${hex(profile)}${hex(compat)}${hex(level)}`);
  } else {
    const hvcC = findBox(init, 'hvcC');
    if (hvcC !== -1 && init.length >= hvcC + 17) {
      codecs.push(hevcCodecString(init.subarray(hvcC + 4)));
    }
  }

  const esds = findBox(init, 'mp4a');
  if (esds !== -1) codecs.push('mp4a.40.2');

  return codecs.length ? codecs.join(', ') : null;
}

function hex(n) {
  return n.toString(16).padStart(2, '0');
}

// hvcC payload layout per ISO/IEC 14496-15 section 8.3.3.1.2.
function hevcCodecString(body) {
  const profileSpace = (body[1] >> 6) & 0x03;
  const tierFlag = (body[1] >> 5) & 0x01;
  const profileIdc = body[1] & 0x1f;
  const compat = body.readUInt32BE(2);
  const levelIdc = body[12];

  // Compatibility flags go out bit-reversed, hex, trailing zeros trimmed.
  let reversed = 0;
  for (let i = 0; i < 32; i += 1) reversed = (reversed << 1) | ((compat >>> i) & 1);
  const compatHex = (reversed >>> 0).toString(16).replace(/0+$/, '') || '0';

  const space = ['', 'A', 'B', 'C'][profileSpace];
  const tier = tierFlag ? 'H' : 'L';

  // Six constraint bytes, most significant first, trailing zero bytes dropped.
  const constraints = [];
  for (let i = 6; i <= 11; i += 1) constraints.push(body[i]);
  while (constraints.length && constraints[constraints.length - 1] === 0) constraints.pop();
  const constraintPart = constraints.map((b) => b.toString(16).toUpperCase()).join('.');

  return `hvc1.${space}${profileIdc}.${compatHex}.${tier}${levelIdc}${constraintPart ? `.${constraintPart}` : ''}`;
}
