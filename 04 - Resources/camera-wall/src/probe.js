// Rebranded cameras are the norm in the cheap end of the market: the same
// hardware ships under a dozen app names, and the only reliable way to find the
// stream URL is to try the known ones and see which answers.

import { probe as ffprobeUrl } from './ffmpeg.js';

// Ordered roughly by how often each one turns out to be the answer.
export const CANDIDATE_PATHS = [
  { path: '/stream1', hint: 'Tapo, Kasa, many Tuya-based cameras' },
  { path: '/stream2', hint: 'Tapo/Kasa sub-stream' },
  { path: '/onvif1', hint: 'generic ONVIF main' },
  { path: '/onvif2', hint: 'generic ONVIF sub' },
  { path: '/live0', hint: 'eufy' },
  { path: '/live1', hint: 'eufy sub' },
  { path: '/ch0_0.h264', hint: 'YI / yi-hack main' },
  { path: '/ch0_1.h264', hint: 'YI / yi-hack sub' },
  { path: '/live/ch00_0', hint: 'V380, Sricam and relatives' },
  { path: '/live/ch01_0', hint: 'V380 sub' },
  { path: '/h264Preview_01_main', hint: 'Reolink' },
  { path: '/h264Preview_01_sub', hint: 'Reolink sub' },
  { path: '/Preview_01_main', hint: 'Reolink H.265' },
  { path: '/Streaming/Channels/101', hint: 'Hikvision, Annke' },
  { path: '/Streaming/Channels/102', hint: 'Hikvision sub' },
  { path: '/cam/realmonitor?channel=1&subtype=0', hint: 'Dahua, Amcrest, Imou' },
  { path: '/cam/realmonitor?channel=1&subtype=1', hint: 'Dahua sub' },
  { path: '/H.264', hint: 'EZVIZ' },
  { path: '/videoMain', hint: 'Foscam' },
  { path: '/videoSub', hint: 'Foscam sub' },
  { path: '/profile1', hint: 'some ONVIF firmwares' },
  { path: '/profile2', hint: 'some ONVIF firmwares' },
  { path: '/media/video1', hint: 'some ONVIF firmwares' },
  { path: '/live/main', hint: 'assorted Chinese firmwares' },
  { path: '/live/sub', hint: 'assorted Chinese firmwares' },
  { path: '/11', hint: 'XM / Anni boards' },
  { path: '/12', hint: 'XM / Anni sub' },
  { path: '/ch01/0', hint: 'Swann' },
  { path: '/live.sdp', hint: 'Vivotek' },
  { path: '/axis-media/media.amp', hint: 'Axis' },
  { path: '/video1', hint: 'assorted' },
  { path: '/', hint: 'bare path' },
];

function buildUrl({ host, port, username, password, path }) {
  const credentials = username
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@`
    : '';
  return `rtsp://${credentials}${host}:${port}${path}`;
}

// Runs candidates a few at a time. Cheap cameras fall over if you open twenty
// RTSP sessions at once, and a camera that falls over answers nothing.
export async function probeHost(
  config,
  { host, ports = [554, 8554], username, password, timeoutMs = 7000, concurrency = 3, onResult },
) {
  const jobs = [];
  for (const port of ports) {
    for (const candidate of CANDIDATE_PATHS) {
      jobs.push({
        ...candidate,
        port,
        order: jobs.length,
        url: buildUrl({ host, port, username, password, path: candidate.path }),
      });
    }
  }

  const hits = [];
  let index = 0;

  async function worker() {
    for (;;) {
      const job = jobs[index++];
      if (!job) return;
      // eslint-disable-next-line no-await-in-loop
      const info = await ffprobeUrl(config, job.url, 'tcp', timeoutMs);
      const ok = !!info?.video;
      if (ok) hits.push({ ...job, info });
      onResult?.({ ...job, info, ok, done: index, total: jobs.length });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return hits.sort((a, b) => a.order - b.order);
}

// Picks the biggest stream as main and the next distinct smaller one as sub.
export function pickStreams(hits) {
  if (!hits.length) return null;
  const area = (h) => (h.info.video.width || 0) * (h.info.video.height || 0);
  const sorted = [...hits].sort((a, b) => area(b) - area(a));
  const main = sorted[0];
  const sub = sorted.find((h) => area(h) < area(main)) || null;
  return { main, sub };
}
