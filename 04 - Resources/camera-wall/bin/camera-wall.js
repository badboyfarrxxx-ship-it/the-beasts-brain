#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { startServer } from '../src/server.js';
import { loadConfig, saveConfig, configPath, APP_ROOT } from '../src/config.js';
import { locate, version, probe } from '../src/ffmpeg.js';
import { hashPassword } from '../src/auth.js';
import { brandList, buildUrls } from '../src/brands.js';
import { localSubnets, onvifProbe, sweep, arpTable, vendorFor, guessBrand } from '../src/discover.js';
import { probeHost, pickStreams, CANDIDATE_PATHS, DEFAULT_PORTS } from '../src/probe.js';
import { resolveCamera, cachedUrls } from '../src/resolver.js';
import { setLevel } from '../src/log.js';

// Piping output into `head` or `more` closes stdout early; that is not a crash.
stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const args = process.argv.slice(2);
const command = args[0] || 'start';
const flags = parseFlags(args.slice(1));

function parseFlags(list) {
  const out = { _: [] };
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    if (item.startsWith('--')) {
      const [key, inline] = item.slice(2).split('=');
      if (inline !== undefined) out[key] = inline;
      else if (list[i + 1] && !list[i + 1].startsWith('--')) out[key] = list[++i];
      else out[key] = true;
    } else out._.push(item);
  }
  return out;
}

function say(...parts) {
  stdout.write(`${parts.join(' ')}\n`);
}

async function ask(question, { silent = false } = {}) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (!silent) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // Hide typed characters for passwords.
  const onData = (char) => {
    if (['\n', '\r', '\u0004'].includes(char.toString())) return;
    stdout.write('\u001b[2K\u001b[200D' + question + '*'.repeat(rl.line.length));
  };
  stdin.on('data', onData);
  const answer = await rl.question(question);
  stdin.off('data', onData);
  rl.close();
  stdout.write('\n');
  return answer.trim();
}

const COMMANDS = {
  async start() {
    if (flags.verbose) setLevel('debug');
    if (!existsSync(configPath(flags.config))) {
      const target = configPath(flags.config);
      const example = `${APP_ROOT}/cameras.example.json`;
      writeFileSync(target, readFileSync(example));
      say(`No config found, so I copied the example to:\n  ${target}\nEdit it, then run this again. Or run: npm run discover to find your cameras first.`);
      return;
    }
    const { config } = await startServer({
      configPath: flags.config,
      host: flags.host,
      port: flags.port,
    });
    const shown = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
    say('');
    say(`  Camera Wall is up:  http://${shown}:${config.server.port}`);
    say(`  Cameras configured: ${config.cameras.length}`);
    say(`  Config file:        ${config.path}`);
    if (config.server.host !== '127.0.0.1' && config.server.host !== 'localhost') {
      say('  Reachable from the rest of the network. Keep the password on.');
    }
    say('');
  },

  async check() {
    // check prints its own per-camera status; the log lines just interleave.
    if (!flags.verbose) setLevel('warn');
    const config = safeLoad();
    const { ffmpeg, ffprobe } = await locate(config || {});
    say(`ffmpeg:  ${ffmpeg || 'NOT FOUND — winget install Gyan.FFmpeg'}`);
    if (ffmpeg) say(`         ${await version(config || {})}`);
    say(`ffprobe: ${ffprobe || 'NOT FOUND (auto codec detection will be skipped)'}`);
    if (!config) return;
    say(`config:  ${config.path}`);
    say('');
    for (const cam of config.cameras) {
      if (cam.type === 'broken') {
        say(`  ${cam.name.padEnd(22)} CONFIG ERROR — ${cam.configError}`);
        continue;
      }
      if (cam.type === 'link') {
        say(`  ${cam.name.padEnd(22)} cloud-only (${cam.brandLabel}) — opens the vendor app`);
        continue;
      }
      stdout.write(`  ${cam.name.padEnd(22)} checking… `);
      if (cam.autoResolve) {
        const known = cachedUrls(config, cam);
        const found = known || (await resolveCamera(config, cam));
        if (!found) {
          say('NO STREAM FOUND — probed every known path and port, nothing answered');
          continue;
        }
        cam.urls = found;
        stdout.write(`found ${found.main.replace(/:\/\/[^@/]*@/, '://')} … `);
      }
      const info = await probe(config, cam.urls.sub || cam.urls.main, cam.transport, 15000);
      if (!info) {
        say('NO ANSWER — wrong IP, wrong password, or RTSP is off in the app');
        continue;
      }
      const v = info.video;
      const extra = v && v.codec !== 'h264' ? `  (${v.codec} gets re-encoded to h264)` : '';
      say(`ok  ${v ? `${v.codec} ${v.width}x${v.height}` : 'no video stream'}${extra}`);
    }
  },

  async discover() {
    const subnets = localSubnets();
    if (!subnets.length) return say('No usable network interface found.');
    const base = flags.subnet || subnets[0].base;
    say(`Looking for cameras on ${base}.0/24 (interface ${subnets[0].name})`);
    say('');

    say('1. Asking every ONVIF device to identify itself…');
    const onvif = await onvifProbe();
    for (const device of onvif) {
      say(`   ${device.host.padEnd(16)} ${device.name || 'unnamed'} ${device.hardware || ''}`);
    }
    if (!onvif.length) say('   nothing answered (plenty of app cameras stay quiet here)');

    say('');
    say('2. Port sweep for camera ports…');
    const open = await sweep(base, {
      onProgress: (done, total) => {
        if (done % 25 === 0 || done === total) stdout.write(`\r   ${done}/${total} addresses`);
      },
    });
    stdout.write('\n');

    const arp = await arpTable();
    const onvifByHost = new Map(onvif.map((d) => [d.host, d]));
    const candidates = [];

    for (const entry of open) {
      const mac = arp.get(entry.host);
      const vendor = vendorFor(mac);
      const device = onvifByHost.get(entry.host);
      const streaming = entry.ports.some((p) => [554, 8554, 7447, 2020].includes(p));
      if (!streaming && !device && !vendor) continue;
      const brand = guessBrand({ vendor, onvif: device });
      candidates.push({ host: entry.host, ports: entry.ports, vendor, brand, name: device?.name });
      say(
        `   ${entry.host.padEnd(16)} ports ${entry.ports.join(',').padEnd(16)} ` +
          `${vendor || device?.name || 'unknown'}  → guessing brand "${brand}"`,
      );
    }

    if (!candidates.length) {
      say('');
      say('Nothing that looks like a camera answered. Most likely one of:');
      say('  - the cameras are on the guest or IoT wifi and this machine is not');
      say('  - RTSP is switched off in the vendor app (Tapo, Reolink and EZVIZ all ship it off)');
      say('  - they are cloud-only (Ring, Blink, Nest, Arlo) and have no local stream at all');
      return;
    }

    const snippet = {
      cameras: candidates.map((c, i) => ({
        id: `camera-${i + 1}`,
        name: c.name || `Camera ${i + 1}`,
        brand: c.brand,
        host: c.host,
        username: `env:CAM${i + 1}_USER`,
        password: `env:CAM${i + 1}_PASS`,
      })),
    };
    const outPath = `${APP_ROOT}/discovered.json`;
    writeFileSync(outPath, `${JSON.stringify(snippet, null, 2)}\n`);
    say('');
    say(`Wrote a starter config to ${outPath}`);
    say('Fill in the usernames and passwords, paste the entries into cameras.json, then run: npm run check');
  },

  // Finds the stream URL of a camera whose brand you do not know, by trying the
  // paths the cheap-camera world actually uses.
  async probe() {
    const host = flags.host || flags._[0];
    if (!host) {
      return say('Which camera? e.g. node bin/camera-wall.js probe --host 192.168.1.60 --user admin --pass secret');
    }
    const config = safeLoad() || {};
    const { ffprobe } = await locate(config);
    if (!ffprobe) return say('ffprobe not found. Install ffmpeg first: winget install Gyan.FFmpeg');

    const ports = flags.port ? [Number(flags.port)] : DEFAULT_PORTS;
    say(`Checking ports ${ports.join(', ')} on ${host}, then trying ${CANDIDATE_PATHS.length} known stream paths on whichever answer.`);
    say('');

    const hits = await probeHost(config, {
      host,
      ports,
      username: flags.user,
      password: flags.pass,
      onPorts: (open, tried) => {
        if (!open.length) {
          say(`  no RTSP port open (tried ${tried.join(', ')})`);
          return;
        }
        say(`  open: ${open.join(', ')} — probing ${CANDIDATE_PATHS.length} paths on each`);
      },
      onResult: ({ ok, path, port, info, done, total }) => {
        if (ok) {
          const v = info.video;
          stdout.write('\r\u001b[2K'); // wipe the progress counter first
          say(`  FOUND  :${port}${path}  ${v.codec} ${v.width}x${v.height}`);
        } else if (done % 8 === 0 || done === total) {
          stdout.write(`\r  tried ${done}/${total}`);
        }
      },
    });
    stdout.write('\n');

    if (!hits.length) {
      say('');
      say('Nothing answered. That means one of:');
      say('  - RTSP is off in the app, or needs a switch called ONVIF / Local RTSP / NVR Mode');
      say('  - the username and password are wrong (many cameras want a separate camera account)');
      say('  - this camera is cloud-only and has no local stream at all (VicoHome, Ring, Blink, Nest, Arlo)');
      say('  - the camera is on a different network from this machine (guest or IoT wifi)');
      return;
    }

    const picked = pickStreams(hits);
    say('');
    say('Working streams:');
    for (const hit of hits) {
      const v = hit.info.video;
      say(`  ${String(hit.port).padEnd(5)} ${hit.path.padEnd(34)} ${v.codec} ${v.width}x${v.height}   (${hit.hint})`);
    }
    say('');
    say('Config entry for this camera:');
    const entry = {
      id: flags.id || `camera-${host.split('.').pop()}`,
      name: flags.name || `Camera ${host.split('.').pop()}`,
      url: picked.main.url.replace(/:\/\/[^@/]+@/, '://USER:PASS@'),
    };
    if (picked.sub) entry.subUrl = picked.sub.url.replace(/:\/\/[^@/]+@/, '://USER:PASS@');
    say(JSON.stringify(entry, null, 2));
    if (!picked.sub) {
      say('');
      say('Only one stream found, so the grid and the full-size view both use it.');
    }
  },

  async 'set-password'() {
    const config = loadConfig(flags.config);
    const password = await ask('New password: ', { silent: true });
    if (password.length < 8) return say('Too short — use at least 8 characters.');
    const again = await ask('Again: ', { silent: true });
    if (password !== again) return say('They do not match.');
    config.auth.enabled = true;
    config.auth.passwordHash = hashPassword(password);
    saveConfig(config, flags.config);
    say('Saved. Everyone signed in elsewhere stays signed in until the server restarts.');
  },

  async brands() {
    for (const brand of brandList()) {
      const tag = brand.cloudOnly ? '  [cloud only]' : '';
      say(`${brand.key.padEnd(12)} ${brand.label}${tag}`);
      if (brand.note) say(`             ${brand.note}`);
    }
  },

  async url() {
    const cam = {
      brand: flags.brand || 'generic',
      host: flags.host || '192.168.1.100',
      username: flags.user || 'USER',
      password: flags.pass || 'PASS',
      channel: flags.channel || 1,
    };
    const urls = buildUrls(cam);
    say(`main: ${urls.main}`);
    say(`sub:  ${urls.sub}`);
    if (urls.snapshot) say(`still:${urls.snapshot}`);
  },

  async help() {
    say(`camera-wall — every IP camera in the house on one page

  start [--port 8480] [--host 127.0.0.1] [--config path] [--verbose]
        Run the server. Open the address it prints.
  discover [--subnet 192.168.1]
        Find cameras on this network and write discovered.json.
  check
        Test ffmpeg and every configured camera, and say what is wrong with the ones that fail.
  probe --host 192.168.1.60 [--user admin --pass secret] [--port 554]
        Try every known stream path against one camera and print the ones that work.
        This is the answer for a rebadged camera whose brand you cannot identify.
  set-password
        Set the password for the web page.
  brands
        List the brands with built-in URL shapes, and which ones have no local stream.
  url --brand reolink --host 192.168.1.50 --user admin --pass secret
        Print the RTSP URLs a brand uses, without touching the config.`);
  },
};

function safeLoad() {
  try {
    return loadConfig(flags.config);
  } catch (e) {
    say(e.code === 'ENOCONFIG' ? `config: ${e.message}` : `config error: ${e.message}`);
    return null;
  }
}

const run = COMMANDS[command] || COMMANDS.help;
run().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
