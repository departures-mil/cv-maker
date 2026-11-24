'use strict';
// Kurulu 2.0.5'in güncelleyicisini (fixtures/v2.0.5) sahte electron ile çalıştırır ve verilen latest.json'u okutur.
//   node test/fixtures/eski-istemci.js <latest.json> <tmp>   → stdout: ESKI {check, download, apply, spawned, fetched}
const Module = require('module');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const [manifestFile, tmp] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const setup = fs.readFileSync(path.join(path.dirname(manifestFile), 'setup.bin'));
const appData = path.join(tmp, 'AppData', 'Roaming');
const handlers = {}, spawned = [], fetched = [];
// kurulu programın verisi (yedeklenecek)
const dataDir = path.join(appData, 'CV Maker', 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'cvs.json'), JSON.stringify({ version: 1, cvs: [{ id: 'a', name: 'Ayşe', sections: [] }] }));
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
    setName() {}, getVersion: () => '2.0.5', setAppUserModelId() {}, setPath() {},
    getPath: (n) => ({ appData, userData: path.join(appData, 'CV Maker'), downloads: path.join(tmp, 'Downloads') }[n]),
    commandLine: { appendSwitch() {} }, requestSingleInstanceLock: () => true, on() {},
    whenReady: () => new Promise(() => {}), relaunch() {}, exit() {}, isPackaged: true,
  },
  BrowserWindow: class {}, Menu: { setApplicationMenu() {} }, Notification: class { static isSupported() { return false; } },
  dialog: {}, shell: { openPath() {}, showItemInFolder() {}, openExternal() {} },
  ipcMain: { handle: (c, f) => { handlers[c] = f; }, on() {} },
  net: {
    fetch: async (url) => {
      fetched.push(String(url).replace(/\?t=\d+$/, ''));
      if (String(url).includes('/latest.json')) return response(JSON.parse(JSON.stringify(manifest)));
      if (url === undefined || url === null) throw new TypeError('Failed to parse URL from ' + url);
      if (manifest.installer && url === manifest.installer.url) return response(setup);
      return { ok: false, status: 404, headers: { get: () => null } };
    },
  },
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === 'electron') return 'electron';
  if (req === './lib/pdf' || req === './lib/docx') return req;
  return origResolve.call(this, req, ...rest);
};
require.cache.electron = { id: 'electron', filename: 'electron', loaded: true, exports: electron };
require.cache['./lib/pdf'] = { id: 'pdf', filename: 'pdf', loaded: true, exports: { buildPdf() {} } };
require.cache['./lib/docx'] = { id: 'docx', filename: 'docx', loaded: true, exports: { buildDocx() {} } };
cp.spawn = (file, args) => { spawned.push([path.basename(file), args]); return { unref() {} }; };
Object.defineProperty(process, 'platform', { value: 'win32' });
global.setTimeout = ((orig) => (fn, ms) => orig(fn, Math.min(ms, 20)))(setTimeout);

(async () => {
  require('./v2.0.5/main.js');
  const out = { fetched, spawned };
  out.check = await handlers['update:check']({}, '');
  try {
    out.download = await handlers['update:download']({}, out.check.manifest);
    out.downloadedBytes = out.download && out.download.path && fs.existsSync(out.download.path) ? fs.statSync(out.download.path).size : 0;
    out.apply = handlers['update:apply']({}, out.download);
  } catch (e) { out.error = String(e && e.message || e); }
  out.backups = fs.readdirSync(path.join(dataDir, 'backups'));
  out.dataKept = JSON.parse(fs.readFileSync(path.join(dataDir, 'cvs.json'), 'utf8')).cvs.length;
  process.stdout.write('ESKI ' + JSON.stringify(out) + '\n');
  setTimeout(() => process.exit(0), 50);
})().catch((e) => { console.error(e); process.exit(1); });
