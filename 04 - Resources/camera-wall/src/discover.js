// Finds cameras on the local network two ways: the ONVIF discovery multicast
// that most of them answer, and a port sweep for the ones that do not.

import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const PROBE_PORTS = [554, 8554, 80, 8000, 8080, 88, 2020, 7447];
const ONVIF_ADDRESS = '239.255.255.250';
const ONVIF_PORT = 3702;

// MAC prefixes worth recognising: the brands people buy as "app cameras".
const OUI = {
  '3c:52:a1': 'Reolink', 'ec:71:db': 'Reolink', '9c:8e:cd': 'Reolink',
  '28:87:ba': 'TP-Link (Tapo/Kasa)', '30:de:4b': 'TP-Link (Tapo/Kasa)', '5c:62:8b': 'TP-Link (Tapo/Kasa)',
  'a4:2b:b0': 'TP-Link (Tapo/Kasa)', 'b0:a7:b9': 'TP-Link (Tapo/Kasa)', '1c:3b:f3': 'TP-Link (Tapo/Kasa)',
  'bc:ad:28': 'Hikvision', '44:19:b6': 'Hikvision', 'c0:56:e3': 'Hikvision', '4c:bd:8f': 'Hikvision',
  '3c:ef:8c': 'Dahua', '90:02:a9': 'Dahua', 'e0:50:8b': 'Dahua', '14:a7:8b': 'Dahua',
  '00:62:6e': 'Amcrest', '9c:8e:cd:': 'Amcrest',
  '2c:aa:8e': 'Wyze', '7c:78:b2': 'Wyze', 'd0:3f:27': 'Wyze',
  '8c:85:80': 'Eufy/Anker', '78:c5:f8': 'Eufy/Anker',
  '00:40:8c': 'Axis', 'ac:cc:8e': 'Axis',
  'f0:9f:c2': 'Ubiquiti', '74:83:c2': 'Ubiquiti', '78:8a:20': 'Ubiquiti',
  '0c:47:c9': 'Amazon (Ring/Blink)', '44:65:0d': 'Amazon (Ring/Blink)', '68:37:e9': 'Amazon (Ring/Blink)',
  '18:b4:30': 'Google Nest', '1c:53:f9': 'Google Nest',
  '00:24:e4': 'Withings/other', 'b8:27:eb': 'Raspberry Pi (bridge?)',
};

export function localSubnets() {
  const out = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      const parts = address.address.split('.').map(Number);
      const prefix = maskToPrefix(address.netmask);
      if (prefix < 22) continue; // do not sweep something enormous by accident
      out.push({ name, address: address.address, netmask: address.netmask, base: `${parts[0]}.${parts[1]}.${parts[2]}`, mac: address.mac });
    }
  }
  return out;
}

function maskToPrefix(mask) {
  return mask
    .split('.')
    .map((n) => Number(n).toString(2).padStart(8, '0'))
    .join('')
    .split('1').length - 1;
}

export function onvifProbe({ timeoutMs = 4000 } = {}) {
  return new Promise((resolve) => {
    const found = new Map();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const message = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
 xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
 xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
 xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
 <e:Header>
  <w:MessageID>urn:uuid:${randomUUID()}</w:MessageID>
  <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
  <w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
 </e:Header>
 <e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body>
</e:Envelope>`;

    socket.on('error', () => { try { socket.close(); } catch { /* already closed */ } resolve([]); });

    socket.on('message', (buffer, remote) => {
      const xml = buffer.toString('utf8');
      const xaddrs = (xml.match(/<[^>]*XAddrs>([^<]+)</i) || [])[1] || '';
      const scopes = (xml.match(/<[^>]*Scopes>([^<]+)</i) || [])[1] || '';
      const pick = (key) => {
        const m = scopes.match(new RegExp(`onvif://www\\.onvif\\.org/${key}/([^\\s]+)`, 'i'));
        return m ? decodeURIComponent(m[1]) : null;
      };
      found.set(remote.address, {
        host: remote.address,
        xaddrs: xaddrs.trim().split(/\s+/).filter(Boolean),
        name: pick('name'),
        hardware: pick('hardware'),
        location: pick('location'),
      });
    });

    socket.bind(() => {
      try { socket.setBroadcast(true); socket.setMulticastTTL(2); } catch { /* not fatal */ }
      const payload = Buffer.from(message);
      socket.send(payload, 0, payload.length, ONVIF_PORT, ONVIF_ADDRESS);
      setTimeout(() => {
        try { socket.close(); } catch { /* already closed */ }
        resolve([...found.values()]);
      }, timeoutMs);
    });
  });
}

function checkPort(host, port, timeoutMs = 900) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

export async function sweep(base, { ports = PROBE_PORTS, concurrency = 64, onProgress } = {}) {
  const hosts = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
  const results = [];
  let index = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      const host = hosts[index++];
      if (!host) return;
      const open = [];
      for (const port of ports) {
        // eslint-disable-next-line no-await-in-loop
        if (await checkPort(host, port)) open.push(port);
      }
      done += 1;
      onProgress?.(done, hosts.length);
      if (open.length) results.push({ host, ports: open });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.sort((a, b) => Number(a.host.split('.')[3]) - Number(b.host.split('.')[3]));
}

export function arpTable() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? ['arp', ['-a']] : ['arp', ['-an']];
    execFile(cmd[0], cmd[1], (err, stdout) => {
      if (err) return resolve(new Map());
      const map = new Map();
      for (const line of String(stdout).split(/\r?\n/)) {
        const ip = (line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/) || [])[1];
        const mac = (line.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i) || [])[0];
        if (ip && mac) map.set(ip, mac.toLowerCase().replaceAll('-', ':'));
      }
      resolve(map);
    });
  });
}

export function vendorFor(mac) {
  if (!mac) return null;
  return OUI[mac.slice(0, 8)] || null;
}

export function guessBrand({ vendor, onvif }) {
  const text = `${vendor || ''} ${onvif?.name || ''} ${onvif?.hardware || ''}`.toLowerCase();
  if (/tapo|tp-link|kasa/.test(text)) return /kasa|kc\d/.test(text) ? 'kasa' : 'tapo';
  if (/reolink/.test(text)) return 'reolink';
  if (/hikvision|annke/.test(text)) return 'hikvision';
  if (/dahua|amcrest|imou|lorex/.test(text)) return /amcrest/.test(text) ? 'amcrest' : 'dahua';
  if (/axis/.test(text)) return 'axis';
  if (/ubiquiti|unifi/.test(text)) return 'unifi';
  if (/wyze/.test(text)) return 'wyze';
  if (/eufy|anker/.test(text)) return 'eufy';
  if (/ring|blink|amazon/.test(text)) return 'ring';
  if (/nest|google/.test(text)) return 'nest';
  if (/foscam/.test(text)) return 'foscam';
  if (/ezviz/.test(text)) return 'ezviz';
  if (/vivotek/.test(text)) return 'vivotek';
  return 'generic';
}
