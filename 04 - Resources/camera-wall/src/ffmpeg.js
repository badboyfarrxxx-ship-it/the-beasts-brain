import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logger } from './log.js';

const log = logger('ffmpeg');

// Where ffmpeg ends up on Windows when installed by winget, chocolatey, scoop,
// or unzipped by hand. Checked only if it is not already on PATH.
const WINDOWS_GUESSES = [
  'C\u003a\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  `${process.env.LOCALAPPDATA || ''}\\Microsoft\\WinGet\\Links\\ffmpeg.exe`,
  `${process.env.USERPROFILE || ''}\\scoop\\shims\\ffmpeg.exe`,
];

let cached = null;

function which(name) {
  return new Promise((done) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, [name], (err, stdout) => {
      if (err) return done(null);
      const first = String(stdout).split(/\r?\n/).find(Boolean);
      done(first ? first.trim() : null);
    });
  });
}

export async function locate(config) {
  if (cached) return cached;
  const configured = config?.ffmpeg?.path;
  let ffmpeg = configured && existsSync(configured) ? configured : await which('ffmpeg');

  if (!ffmpeg && process.platform === 'win32') {
    ffmpeg = WINDOWS_GUESSES.find((p) => p && existsSync(p)) || null;
  }
  let ffprobe = config?.ffmpeg?.ffprobePath || (await which('ffprobe'));
  if (!ffprobe && ffmpeg) {
    const guess = ffmpeg.replace(/ffmpeg(\.exe)?$/i, (m) => m.replace(/ffmpeg/i, 'ffprobe'));
    if (existsSync(guess)) ffprobe = guess;
  }
  cached = { ffmpeg, ffprobe };
  return cached;
}

export function resetLocateCache() {
  cached = null;
}

export async function version(config) {
  const { ffmpeg } = await locate(config);
  if (!ffmpeg) return null;
  return new Promise((done) => {
    execFile(ffmpeg, ['-hide_banner', '-version'], (err, stdout) => {
      if (err) return done(null);
      done(String(stdout).split(/\r?\n/)[0]);
    });
  });
}

// Ask the camera what it is actually sending, so we know whether the video can
// be passed through untouched (cheap) or has to be re-encoded (not cheap).
export async function probe(config, url, transport = 'tcp', timeoutMs = 12000) {
  const { ffprobe } = await locate(config);
  if (!ffprobe) return null;
  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-rtsp_transport', transport,
    '-print_format', 'json',
    '-show_streams', '-show_entries', 'stream=index,codec_type,codec_name,width,height,avg_frame_rate',
    '-i', url,
  ];
  return new Promise((done) => {
    const child = spawn(ffprobe, args, { windowsHide: true });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', () => { clearTimeout(timer); done(null); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        log.debug('probe failed', url, err.trim());
        return done(null);
      }
      try {
        const parsed = JSON.parse(out);
        const video = (parsed.streams || []).find((s) => s.codec_type === 'video');
        const audio = (parsed.streams || []).find((s) => s.codec_type === 'audio');
        done({
          video: video ? { codec: video.codec_name, width: video.width, height: video.height } : null,
          audio: audio ? { codec: audio.codec_name } : null,
        });
      } catch {
        done(null);
      }
    });
  });
}

// fragmented-MP4 on stdout, which is what MSE in the browser eats.
export function fmp4Args(cam, url, { transcode, audio, maxHeight }) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-fflags', '+genpts'];
  if (url.startsWith('rtsp')) args.push('-rtsp_transport', cam.transport || 'tcp');
  args.push('-use_wallclock_as_timestamps', '1', '-i', url);

  if (transcode) {
    args.push(
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-g', '50', '-sc_threshold', '0',
      '-vf', `scale=-2:'min(${maxHeight},ih)'`,
    );
  } else {
    args.push('-c:v', 'copy');
  }

  if (audio) args.push('-c:a', 'aac', '-ac', '1', '-b:a', '64k');
  else args.push('-an');

  args.push(
    '-f', 'mp4',
    '-movflags', '+frag_keyframe+empty_moov+default_base_moof+omit_tfhd_offset',
    '-frag_duration', '500000',
    'pipe:1',
  );
  return args;
}

// multipart MJPEG, the fallback for browsers with no Media Source Extensions
// (iPhone Safari) and for cameras whose codec MSE will not touch.
export function mjpegArgs(cam, url, { fps = 4, maxHeight = 720 } = {}) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (url.startsWith('rtsp')) args.push('-rtsp_transport', cam.transport || 'tcp');
  args.push(
    '-i', url,
    '-an',
    '-vf', `fps=${fps},scale=-2:'min(${maxHeight},ih)'`,
    '-q:v', '6',
    '-f', 'image2pipe', '-c:v', 'mjpeg',
    'pipe:1',
  );
  return args;
}

export function snapshotArgs(cam, url) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (url.startsWith('rtsp')) args.push('-rtsp_transport', cam.transport || 'tcp');
  args.push('-i', url, '-frames:v', '1', '-q:v', '4', '-f', 'image2', 'pipe:1');
  return args;
}
