// Ana süreç duman testi (sahte electron): main.js yüklenir, veri klasörü 2.0.x ile aynı yerde, taşınabilir 1.x verisi ilk
// açılışta içe aktarılır, IPC kanalları kayıtlı; 2.0.x'in update:* / contact:send kanalları yok (artık ortak çekirdekte),
// güncelleme öncesi yedek çalışır, "neler yeni" notları bu sürümün notlarıdır.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('main.js: veri yeri, içe aktarma, IPC, güncelleme öncesi yedek', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-main-'));
  const appData = path.join(tmp, 'AppData', 'Roaming');
  const portable = path.join(tmp, 'portable', 'CV Maker Data');
  fs.mkdirSync(path.join(portable, 'attachments'), { recursive: true });
  fs.writeFileSync(path.join(portable, 'cvs.json'), JSON.stringify({ version: 1, cvs: [{ id: 'p1', name: 'Taşınabilir', updatedAt: 5, sections: [] }] }));
  fs.writeFileSync(path.join(portable, 'settings.json'), JSON.stringify({ uiLang: 'ar' }));
  fs.mkdirSync(path.join(appData, 'CV Maker'), { recursive: true });
  fs.writeFileSync(path.join(appData, 'CV Maker', 'migrate-from.json'), JSON.stringify({ dataDir: portable }));
  fs.mkdirSync(path.join(appData, 'CV Maker', 'data', 'app', '2.0.5'), { recursive: true });   // 2.0.x bundle artığı

  const handlers = {}, listeners = {}, switches = [];
  const electron = {
    app: {
      setName() {}, getVersion: () => require('../package.json').version, getName: () => 'CV Maker', setAppUserModelId() {}, setPath() {},
      getPath: (n) => ({ appData, userData: path.join(appData, 'CV Maker'), downloads: path.join(tmp, 'Downloads') }[n]),
      commandLine: { appendSwitch: (k, v) => switches.push([k, v]) }, requestSingleInstanceLock: () => true, on() {},
      whenReady: () => new Promise(() => {}), relaunch() {}, exit() {}, isPackaged: true,
    },
    BrowserWindow: class { static fromWebContents() { return null; } }, Menu: { setApplicationMenu() {} },
    dialog: {}, shell: { openPath() {}, showItemInFolder() {}, openExternal() {} }, screen: {}, net: {},
    ipcMain: { handle: (c, f) => { handlers[c] = f; }, on: (c, f) => { listeners[c] = f; }, removeHandler() {}, removeAllListeners() {} },
  };
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) { return req === 'electron' ? 'electron' : origResolve.call(this, req, ...rest); };
  require.cache.electron = { id: 'electron', filename: 'electron', loaded: true, exports: electron };
  const realTimeout = global.setTimeout;
  global.setTimeout = (fn, ms) => realTimeout(fn, Math.min(ms, 30));
  try {
    require('../main.js');
    await new Promise((r) => realTimeout(r, 120));
  } finally { global.setTimeout = realTimeout; Module._resolveFilename = origResolve; }

  const info = handlers['app:info']();
  assert.strictEqual(info.version, require('../package.json').version);
  assert.strictEqual(info.dataDir, path.join(appData, 'CV Maker', 'data'), '2.0.x ile aynı veri klasörü');
  assert.strictEqual(info.title, 'CV Maker');
  assert.ok(info.notes && info.notes.tr && info.notes.en && info.notes.ar, 'bu sürümün notları (release-notes.json)');
  assert.ok(info.migration && info.migration.total >= 1, 'taşınabilir veri aktarıldı');
  const loaded = handlers['store:load']();
  assert.ok(loaded.cvs.cvs.some((c) => c.id === 'p1'));
  assert.ok(fs.existsSync(path.join(portable, 'cvs.json')), 'taşınabilir klasöre dokunulmadı');
  for (const ch of ['store:load', 'store:saveCvs', 'backup:list', 'backup:create', 'backup:beforeUpdate', 'backup:restore', 'attach:pick', 'cv:export', 'pdf:export', 'docx:export', 'jpeg:save'])
    assert.ok(handlers[ch], 'IPC ' + ch);
  for (const ch of ['update:check', 'update:download', 'update:apply', 'contact:send']) assert.ok(!handlers[ch], 'eski kanal kaldırıldı: ' + ch);
  assert.ok(switches.some(([k, v]) => k === 'lang' && v === 'ar'), 'yerel iletişim kutuları seçilen dilde');
  const b = handlers['backup:beforeUpdate']({}, '2.1.1');
  assert.ok(b, 'yedek alındı');
  const list = handlers['backup:list']();
  assert.ok(list.some((x) => x.reason === 'before-update'), JSON.stringify(list));
  assert.ok(!fs.existsSync(path.join(appData, 'CV Maker', 'data', 'app')), '2.0.x bundle artıkları temizlendi');
});
