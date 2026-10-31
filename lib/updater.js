'use strict';
const { net } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

function config() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'update-config.json'), 'utf8')); }
  catch { return {}; }
}

function cmp(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function check(currentVersion, override) {
  const baseUrl = (override && override.trim()) || config().baseUrl;
  if (!baseUrl || baseUrl.includes('YOUR-PROJECT')) return { ok: false, error: 'not-configured' };
  try {
    const res = await net.fetch(`${baseUrl.replace(/\/$/, '')}/latest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const m = await res.json();
    if (m.url && !/^https?:/i.test(m.url)) m.url = `${baseUrl.replace(/\/$/, '')}/${m.url.replace(/^\//, '')}`;
    return { ok: true, available: cmp(m.version, currentVersion) > 0, manifest: m };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function download(m, targetDir, onProgress) {
  const res = await net.fetch(m.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || m.size || 0;
  const finalPath = path.join(targetDir, m.fileName || `CV Maker v${m.displayVersion || m.version}.exe`);
  const part = finalPath + '.part';
  const out = fs.createWriteStream(part);
  const hash = crypto.createHash('sha256');
  let got = 0;
  const reader = res.body.getReader();
  const STALL_MS = 45000;
  const readWithTimeout = () => Promise.race([
    reader.read(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('stalled')), STALL_MS)),
  ]);
  try {
    for (;;) {
      const { done, value } = await readWithTimeout();
      if (done) break;
      const buf = Buffer.from(value);
      hash.update(buf);
      got += buf.length;
      if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
      onProgress({ received: got, total });
    }
  } catch (e) {
    reader.cancel().catch(() => {});
    await new Promise((r) => out.end(r));
    fs.unlink(part, () => {});
    throw e;
  } finally {
    if (!out.closed) await new Promise((r) => out.end(r));
  }
  if (m.sha256 && hash.digest('hex') !== m.sha256) {
    fs.unlinkSync(part);
    throw new Error('checksum');
  }
  fs.renameSync(part, finalPath);
  return finalPath;
}

// Small update: a gzipped JSON { files: { "relative/path": "<base64>" } }.
async function downloadBundle(m, rootDir, onProgress) {
  const b = m.bundle;
  const res = await net.fetch(b.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || b.size || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await Promise.race([
      reader.read(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('stalled')), 30000)),
    ]);
    if (done) break;
    chunks.push(Buffer.from(value));
    got += value.length;
    onProgress({ received: got, total });
  }
  const gz = Buffer.concat(chunks);
  if (b.sha256 && crypto.createHash('sha256').update(gz).digest('hex') !== b.sha256) throw new Error('checksum');
  const { files } = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  if (!files || !files['main.js'] || !files['package.json']) throw new Error('bad bundle');

  const version = String(m.version);
  if (!/^\d+(\.\d+)*$/.test(version)) throw new Error('bad version');
  const dir = path.join(rootDir, version);
  const tmp = dir + '.tmp';
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const [rel, b64] of Object.entries(files)) {
    const out = path.resolve(tmp, rel);
    if (!out.startsWith(path.resolve(tmp) + path.sep)) throw new Error('bad path');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmp, dir);
  fs.writeFileSync(path.join(rootDir, 'current.json'), JSON.stringify({ version, ok: false, tries: 0 }));
  return dir;
}

module.exports = { check, download, downloadBundle, cmp };
