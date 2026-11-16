'use strict';
/*
 * Smoke test of main.js with a fake "electron" module.
 *   node test/main.smoke.js portable <tmp>   -> a portable copy finds the setup and moves over
 *   node test/main.smoke.js installed <tmp>  -> the installed edition imports the portable data
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const assert = require('assert');
const cp = require('child_process');

const [mode, tmp] = process.argv.slice(2);
const appData = path.join(tmp, 'AppData', 'Roaming');
const portableDir = path.join(tmp, 'portable');
const handlers = {}, listeners = {}, spawned = [];
let exited = false;

const setup = Buffer.from('MZ fake setup');
const manifest = {
  version: '2.0.0', displayVersion: '2.0',
  installer: { fileName: 'CV-Maker-Setup-2.0.0.exe', url: 'downloads/CV-Maker-Setup-2.0.0.exe', size: setup.length, sha256: crypto.createHash('sha256').update(setup).digest('hex') },
  bundle: { url: 'bundles/2.0.0.json.gz', size: 1, sha256: '', minShell: '1.3.0' },
};
function response(body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  let done = false;
  return {
    ok: true, status: 200, headers: { get: () => String(buf.length) }, json: async () => JSON.parse(buf),
    body: { getReader: () => ({ read: async () => (done ? { done: true } : ((done = true), { done: false, value: new Uint8Array(buf) })), cancel: async () => {} }) },
  };
}
const electron = {
  app: {
    setName() {}, getVersion: () => (mode === 'portable' ? '1.3.0' : '2.0.0'), setAppUserModelId() {}, setPath() {},
    getPath: (n) => ({ appData, userData: path.join(appData, 'CV Maker'), downloads: path.join(tmp, 'Downloads') }[n]),
    commandLine: { appendSwitch() {} }, requestSingleInstanceLock: () => true, on() {},
    whenReady: () => new Promise(() => {}), relaunch() {}, exit() { exited = true; }, isPackaged: true,
  },
  BrowserWindow: class {}, Menu: { setApplicationMenu() {} }, Notification: class { static isSupported() { return false; } },
  dialog: {}, shell: { openPath() {}, showItemInFolder() {}, openExternal() {} },
  ipcMain: { handle: (c, f) => { handlers[c] = f; }, on: (c, f) => { listeners[c] = f; } },
  net: { fetch: async (url) => (url.includes('latest.json') ? response(JSON.parse(JSON.stringify(manifest))) : response(setup)) },
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return req === 'electron' ? 'electron' : origResolve.call(this, req, ...rest); };
require.cache.electron = { id: 'electron', filename: 'electron', loaded: true, exports: electron };
cp.spawn = (file, args) => { spawned.push([file, args]); return { unref() {} }; };
Object.defineProperty(process, 'platform', { value: 'win32' });
global.setTimeout = ((orig) => (fn, ms) => orig(fn, Math.min(ms, 50)))(setTimeout);

(async () => {
  if (mode === 'portable') {
    process.env.PORTABLE_EXECUTABLE_DIR = portableDir;
    process.env.PORTABLE_EXECUTABLE_FILE = path.join(portableDir, 'CV Maker v1.6.exe');
    process.argv.push('--after-update');
    require('../main.js');
    const info = handlers['app:info']();
    assert.strictEqual(info.portable, true);
    assert.strictEqual(info.afterUpdate, true);
    const r = await handlers['update:check']({}, '');
    assert.ok(r.ok && r.available && r.migrate, 'portable copy must be offered the installer');
    assert.match(r.manifest.installer.url, /^https:\/\/github\.com\/departures-mil\/cv-maker\/releases\/latest\/download\//);
    const t = await handlers['update:download']({}, r.manifest);
    assert.strictEqual(t.kind, 'installer');
    assert.ok(fs.existsSync(t.path));
    const a = handlers['update:apply']({}, t);
    assert.strictEqual(a.restarted, true);
    assert.deepStrictEqual(spawned[0][1], ['/S', '--force-run']);
    const marker = JSON.parse(fs.readFileSync(path.join(appData, 'CV Maker', 'migrate-from.json'), 'utf8'));
    assert.strictEqual(marker.dataDir, path.join(portableDir, 'CV Maker Data'));
    const bks = fs.readdirSync(path.join(portableDir, 'CV Maker Data', 'backups'));
    assert.ok(bks.some((b) => b.endsWith('before-update')) && bks.some((b) => b.endsWith('daily')), 'backups in portable folder');
    console.log('portable: ok', JSON.stringify({ spawned, bks }));
  } else {
    require('../main.js');
    const info = handlers['app:info']();
    assert.strictEqual(info.portable, false);
    assert.ok(info.migration && info.migration.total >= 1, 'migration ran');
    const loaded = handlers['store:load']();
    const legacy = JSON.parse(fs.readFileSync(path.join(portableDir, 'CV Maker Data', 'cvs.json'), 'utf8'));
    assert.deepStrictEqual(loaded.cvs.cvs, legacy.cvs);
    assert.ok(!fs.existsSync(path.join(appData, 'CV Maker', 'migrate-from.json')), 'marker consumed');
    assert.ok(fs.existsSync(path.join(portableDir, 'CV Maker Data', 'cvs.json')), 'portable data untouched');
    // installed: bundle updates are used, full updates run the setup silently with --updated
    manifest.version = '2.1.0';
    const files = { 'main.js': Buffer.from('//').toString('base64'), 'package.json': Buffer.from('{"version":"2.1.0"}').toString('base64') };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify({ files })));
    electron.net.fetch = async (url) => (url.includes('latest.json') ? response(JSON.parse(JSON.stringify({ ...manifest, bundle: { ...manifest.bundle, size: gz.length, sha256: crypto.createHash('sha256').update(gz).digest('hex') } })))
      : url.includes('bundles') ? response(gz) : response(setup));
    const r = await handlers['update:check']({}, '');
    assert.ok(r.available && !r.migrate);
    const t = await handlers['update:download']({}, r.manifest);
    assert.strictEqual(t.kind, 'bundle');
    const cur = JSON.parse(fs.readFileSync(path.join(info.dataDir, 'app', 'current.json'), 'utf8'));
    assert.strictEqual(cur.version, '2.1.0');
    r.manifest.bundle.minShell = '9.0.0';
    const t2 = await handlers['update:download']({}, r.manifest);
    assert.strictEqual(t2.kind, 'installer');
    handlers['update:apply']({}, t2);
    assert.deepStrictEqual(spawned.at(-1)[1], ['--updated', '/S', '--force-run']);
    console.log('installed: ok', JSON.stringify(info.migration));
  }
  setTimeout(() => process.exit(0), 100);
})().catch((e) => { console.error(e); process.exit(1); });
