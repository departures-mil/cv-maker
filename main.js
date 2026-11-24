'use strict';
// CV Maker — Electron ana süreç.
// Pencere (her açılışta tam ekran, çerçevesiz), sağ üst pencere düğmeleri, GitHub Releases güncellemesi (yama + tam app.asar)
// ve ana süreç hata raporu ortak çekirdekten gelir (cekirdek/electron/fc-electron-main.js). Burada yalnız CV Maker'a özgü IPC kalır.
// Kullanıcı verisi: %APPDATA%\CV Maker\data (2.0.x ile aynı yer; güncelleme ve kurulum dokunmaz).
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const fc = require('./cekirdek/electron/fc-electron-main');
const { buildPdf } = require('./lib/pdf');
const { buildDocx } = require('./lib/docx');
const { DataStore } = require('./lib/datastore');

const APP_NAME = 'CV Maker';
const APP_VERSION = app.getVersion();
const TITLE = APP_NAME;
const SMOKE = !!process.env.CVM_SMOKE;
const FONT_INTER = "Inter, 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif";   // src/schema.js FONTS.inter (smoke testi)

app.setName(APP_NAME);

// Installed edition (setup): data lives in %APPDATA%\CV Maker\data.
// The old portable edition (1.x) kept it next to the .exe ("CV Maker Data"); its records are imported at the first
// start of the installed edition (below) and from Settings → Data. PORTABLE_EXECUTABLE_DIR is only set by 1.x portable builds.
const PORTABLE_DIR = process.env.PORTABLE_EXECUTABLE_DIR;
const INSTALLED_USERDATA = path.join(app.getPath('appData'), APP_NAME);
const MIGRATE_FILE = path.join(INSTALLED_USERDATA, 'migrate-from.json');
const DATA_DIR = PORTABLE_DIR
  ? path.join(PORTABLE_DIR, 'CV Maker Data')
  : path.join(app.getPath('userData'), 'data');
if (PORTABLE_DIR) app.setPath('userData', path.join(DATA_DIR, 'chromium'));
const store = new DataStore(DATA_DIR);
const ATTACH_DIR = store.attachDir;

function updateLog(line) {
  try { fs.appendFileSync(path.join(DATA_DIR, 'update.log'), `${new Date().toISOString()} ${line}\n`); } catch {}
}

// First start of the installed edition: bring over the records of the portable edition.
// Where they are comes from (a) the note a portable copy leaves before running the setup, or
// (b) the folder the setup was started from (written by build/installer.nsh), if a
// "CV Maker Data" folder sits next to it.
let MIGRATION = null;
function legacyCandidates() {
  const list = [];
  try {
    const marker = JSON.parse(fs.readFileSync(MIGRATE_FILE, 'utf8'));
    if (marker && marker.dataDir) list.push(marker.dataDir);
    fs.renameSync(MIGRATE_FILE, MIGRATE_FILE.replace(/\.json$/, `.done-${Date.now()}.json`));
  } catch (e) { if (e.code !== 'ENOENT') updateLog('migrate note: ' + e.message); }
  try {
    const raw = fs.readFileSync(path.join(path.dirname(process.execPath), 'installer-dir.txt'));
    const dir = (raw[0] === 0xff && raw[1] === 0xfe ? raw.slice(2) : raw).toString(raw.includes(0) ? 'utf16le' : 'utf8').replace(/\0/g, '').trim();
    if (dir) list.push(path.join(dir, 'CV Maker Data'));
  } catch {}
  return list;
}
if (!PORTABLE_DIR) {
  const done = new Set(store.importedSources());
  for (const src of legacyCandidates()) {
    try {
      if (done.has(path.resolve(src).toLowerCase()) || !DataStore.isDataDir(src)) continue;
      const r = store.importLegacy(src);
      done.add(path.resolve(src).toLowerCase());
      MIGRATION = MIGRATION ? { ...r, added: MIGRATION.added + r.added, updated: MIGRATION.updated + r.updated } : r;
      updateLog(`imported portable data from ${src}: ${JSON.stringify(r)}`);
    } catch (e) {
      updateLog(`portable import from ${src} failed: ` + (e.stack || e.message));
    }
  }
}
try { store.dailyBackup(); } catch (e) { updateLog('daily backup failed: ' + e.message); }

// Native pieces (dialog buttons, input widgets) follow the chosen interface language.
try {
  const uiLang = store.loadSettings().uiLang;
  if (['tr', 'en', 'ar'].includes(uiLang)) app.commandLine.appendSwitch('lang', uiLang);
} catch {}
if (process.platform === 'win32') app.setAppUserModelId('com.cvmaker.desktop');

let win;

function createWindow() {
  win = new BrowserWindow(fc.windowOptions({
    title: TITLE,
    minWidth: 640, minHeight: 400,   // "Orta" = çalışma alanının yarısı; küçük ekranlarda da sığsın
    backgroundColor: '#070b14',
    icon: path.join(__dirname, 'build', 'icon.png'),
    // sandbox:false (windowOptions) → preload ortak çekirdeğin fc-preload.js'ini require edebilir; contextIsolation açık kalır
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  }));
  fc.install(win, { channel: 'win-app' });
  Menu.setApplicationMenu(null);
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.type === 'keyDown' && input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  if (SMOKE) smoke();
}

// Electron açılış testi (test/electron.smoke.test.js): pencere yüklendi mi, çekirdek ve düzenleyici başladı mı?
function smoke() {
  const out = (o) => process.stdout.write('CVM_SMOKE ' + JSON.stringify(o) + '\n');
  const consoleErrors = [];
  win.webContents.on('console-message', (e, level, message) => { if (level >= 3) consoleErrors.push(String(message).slice(0, 300)); });
  const fail = setTimeout(() => { out({ ok: false, error: 'timeout' }); app.exit(2); }, 60000);
  win.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await win.webContents.executeJavaScript(`({
          fc: !!(window.FC && FC.updater && FC.topbar && FC.settings), host: window.FC && FC.host.kind, fcHost: !!window.fcHost, api: !!window.api,
          version: window.FC && FC.updater.state().current, scheme: document.documentElement.dataset.scheme, schemes: FC.look.schemes(),
          topbar: !!document.querySelector('#topbar .topbar-actions'), winBtns: document.querySelectorAll('#topbar .win-controls button').length,
          update: !!document.querySelector('#topbar .update-act'), sections: document.querySelectorAll('#editor .ed-card').length,
          preview: !!document.querySelector('#preview-sheet .cv'), lang: document.documentElement.lang, title: document.title,
          errors: (window.__cvmErrors || []).slice(0, 5)
        })`);
        // ayarlar açılır, iletişim kartı en sonda mı?
        r.settings = await win.webContents.executeJavaScript(`(function () { openSettings(); var g = document.querySelector('.cv-settings .settings-grid'); var c = g ? [].map.call(g.children, function (x) { return x.getAttribute('data-fc-card') || x.id || ''; }) : []; document.querySelector('.cv-settings .modal-header .icon-btn').click(); return c; })()`);
        // CV yazı tipi "Inter + Noto Sans Arabic": çekirdeğin gömülü yazı tipleri PDF'e girer mi?
        const pdf = Buffer.from(await buildPdf(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>.cv{font-family:var(--font)}</style></head><body><div class="cv" style="--font:${FONT_INTER}">مرحبا بكم — Ayşe Yılmaz</div></body></html>`, []));
        r.pdfFonts = (pdf.toString('latin1').match(/\/BaseFont\s*\/[A-Z]{6}\+([A-Za-z-]+)/g) || []).map((x) => x.replace(/.*\+/, '')).filter((x, i, a) => a.indexOf(x) === i);
        r.fullscreen = win.isFullScreen(); r.appVersion = app.getVersion();
        r.errors = r.errors.concat(consoleErrors.filter((m) => !/net::|Failed to load resource|ERR_/.test(m)));
        clearTimeout(fail);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.sections > 0 && r.preview && !r.errors.length }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String((e && e.message) || e) }); app.exit(3); }
    }, 3500);
  });
}

// Tek kopya: ikinci açılış mevcut pencereyi öne getirir (iki pencerenin aynı veri dosyalarına yazması önlenir).
// Güncellemeden sonraki yeniden açılışta eski süreç kapanırken kilidi kısa süre bekler.
async function acquireLock() {
  if (SMOKE) return true;
  for (let i = 0; i < 10; i++) {
    if (app.requestSingleInstanceLock()) return true;
    if (!process.argv.some((a) => a === '--updated' || a === '--after-update')) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(async () => {
  if (!(await acquireLock())) return app.quit();
  createWindow();
});
app.on('window-all-closed', () => app.quit());

// ---------- app info / window ----------
function releaseNotes() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'release-notes.json'), 'utf8'))[APP_VERSION] || null; } catch { return null; }
}
ipcMain.handle('app:info', () => ({
  name: APP_NAME,
  version: APP_VERSION,
  title: TITLE,
  notes: releaseNotes(),
  portable: !!PORTABLE_DIR,
  dataDir: DATA_DIR,
  backupDir: store.backupDir,
  migration: MIGRATION,
  platform: process.platform,
  packaged: app.isPackaged,
}));
ipcMain.on('app:openDataDir', () => shell.openPath(DATA_DIR));

// ---------- storage ----------
ipcMain.handle('store:load', () => ({ cvs: store.loadCvs(), settings: store.loadSettings() }));
ipcMain.handle('store:saveCvs', (_e, data) => { store.saveCvs(data); return true; });
ipcMain.handle('store:saveSettings', (_e, data) => { store.saveSettings(data); return true; });
ipcMain.on('store:saveCvsSync', (e, data) => { try { store.saveCvs(data); } catch {} e.returnValue = true; });
ipcMain.on('store:saveSettingsSync', (e, data) => { try { store.saveSettings(data); } catch {} e.returnValue = true; });

// ---------- backups / import of old data ----------
ipcMain.handle('backup:list', () => store.listBackups());
ipcMain.handle('backup:create', () => store.backup('manual'));
// Güncelleme indirilmeye başlayınca arayüz çağırır (2.0.x'te update:apply yapıyordu): sürüm değişmeden önce tam yedek.
ipcMain.handle('backup:beforeUpdate', (_e, to) => { const r = store.backup('before-update', { to: String(to || '') }); updateLog(`backup before update to ${to}`); return r; });
ipcMain.handle('backup:restore', (_e, name) => {
  const r = store.restoreBackup(name);
  updateLog(`restored backup ${name} (safety copy ${r.safety})`);
  return r;
});
ipcMain.on('backup:openFolder', () => shell.openPath(store.backupDir));
ipcMain.handle('data:importLegacy', async (_e, { title }) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openDirectory'] });
  if (r.canceled) return null;
  let dir = r.filePaths[0];
  // Accept both the "CV Maker Data" folder and the folder that contains it.
  if (!DataStore.isDataDir(dir) && DataStore.isDataDir(path.join(dir, 'CV Maker Data'))) dir = path.join(dir, 'CV Maker Data');
  if (!DataStore.isDataDir(dir)) return { ok: false, error: 'not-data-dir' };
  const res = store.importLegacy(dir);
  updateLog(`manual import from ${dir}: ${JSON.stringify(res)}`);
  return { ok: true, ...res };
});
ipcMain.handle('file:saveText', async (_e, { title, defaultName, ext, text }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName, filters: [{ name: ext, extensions: [ext] }] });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return true;
});

// ---------- attachments ----------
const MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function safeAttachPath(id) {
  if (!/^[a-f0-9-]+\.[a-z]+$/i.test(id)) throw new Error('bad id');
  return path.join(ATTACH_DIR, id);
}

ipcMain.handle('attach:pick', async (_e, { title, filterName }) => {
  const r = await dialog.showOpenDialog(win, {
    title,
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: filterName, extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] }],
  });
  if (r.canceled) return [];
  return r.filePaths.map((src) => {
    const ext = path.extname(src).toLowerCase();
    const id = crypto.randomUUID() + ext;
    fs.copyFileSync(src, path.join(ATTACH_DIR, id));
    return { fileId: id, fileName: path.basename(src), mime: MIME[ext] || 'application/octet-stream' };
  });
});
ipcMain.handle('attach:read', (_e, fileId) => {
  const p = safeAttachPath(fileId);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).toLowerCase();
  return `data:${MIME[ext]};base64,${fs.readFileSync(p).toString('base64')}`;
});
ipcMain.handle('attach:remove', (_e, fileId) => {
  // Kept until the next start: undo may still need it. gc then moves it into backups.
  safeAttachPath(fileId);
  return true;
});
ipcMain.handle('attach:open', (_e, fileId) => shell.openPath(safeAttachPath(fileId)));
// Unused attachments are moved into backups/attachments-removed, never deleted.
ipcMain.handle('attach:gc', (_e, usedIds) => { store.gcAttachments(usedIds); return true; });

// ---------- import / export ----------
ipcMain.handle('cv:export', async (_e, { cv, defaultName, title }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName + '.cvmaker', filters: [{ name: 'CV Maker', extensions: ['cvmaker'] }] });
  if (r.canceled) return false;
  const files = {};
  for (const id of collectAttachmentIds(cv)) {
    const p = safeAttachPath(id);
    if (fs.existsSync(p)) files[id] = fs.readFileSync(p).toString('base64');
  }
  fs.writeFileSync(r.filePath, JSON.stringify({ format: 'cvmaker', version: 1, cv, files }));
  return true;
});
ipcMain.handle('cv:import', async (_e, { title }) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openFile'], filters: [{ name: 'CV Maker', extensions: ['cvmaker', 'json'] }] });
  if (r.canceled) return null;
  const data = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
  if (data.format !== 'cvmaker' || !data.cv) throw new Error('invalid');
  const remap = {};
  for (const [id, b64] of Object.entries(data.files || {})) {
    const ext = path.extname(id).toLowerCase();
    const nid = crypto.randomUUID() + ext;
    fs.writeFileSync(path.join(ATTACH_DIR, nid), Buffer.from(b64, 'base64'));
    remap[id] = nid;
  }
  const text = JSON.stringify(data.cv).replace(/"fileId":"([^"]+)"/g, (m, id) => `"fileId":"${remap[id] || id}"`);
  return JSON.parse(text);
});

function collectAttachmentIds(cv) {
  const ids = [];
  for (const s of cv.sections || []) for (const it of s.items || []) if (it.fileId) ids.push(it.fileId);
  return ids;
}

// ---------- PDF ----------
ipcMain.handle('pdf:export', async (_e, { html, attachments, defaultName, title, open }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return { ok: false, canceled: true };
  const files = attachments.map((a) => ({ ...a, path: safeAttachPath(a.fileId) })).filter((a) => fs.existsSync(a.path));
  const bytes = await buildPdf(html, files);
  fs.writeFileSync(r.filePath, bytes);
  if (open) shell.openPath(r.filePath);
  return { ok: true, path: r.filePath };
});

ipcMain.handle('pdf:render', async (_e, { html, attachments }) => {
  const files = attachments.map((a) => ({ ...a, path: safeAttachPath(a.fileId) })).filter((a) => fs.existsSync(a.path));
  return new Uint8Array(await buildPdf(html, files));
});

// ---------- DOCX ----------
ipcMain.handle('docx:export', async (_e, { model, defaultName, title, open }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName + '.docx', filters: [{ name: 'Word', extensions: ['docx'] }] });
  if (r.canceled) return { ok: false, canceled: true };
  const files = model.attachments.map((a) => ({ ...a, path: safeAttachPath(a.fileId) })).filter((a) => fs.existsSync(a.path));
  fs.writeFileSync(r.filePath, await buildDocx(model, files));
  if (open) shell.openPath(r.filePath);
  return { ok: true, path: r.filePath };
});

// ---------- JPEG ----------
ipcMain.handle('jpeg:pickTarget', async (_e, { defaultName, title }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName + '.jpg', filters: [{ name: 'JPEG', extensions: ['jpg', 'jpeg'] }] });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('jpeg:save', (_e, { target, images, open }) => {
  const dir = path.dirname(target);
  const ext = path.extname(target) || '.jpg';
  const base = path.basename(target, path.extname(target));
  const paths = images.map((d, i) => {
    const p = images.length === 1 ? path.join(dir, base + ext) : path.join(dir, `${base}-${i + 1}${ext}`);
    fs.writeFileSync(p, Buffer.from(d.split(',')[1], 'base64'));
    return p;
  });
  if (open) (paths.length === 1 ? shell.openPath(paths[0]) : shell.showItemInFolder(paths[0]));
  return { paths, dir };
});

// ---------- 2.0.x artıkları ----------
// 2.0.x "bundle" güncellemeleri <veri>/app/<sürüm> altına açılırdı (yalnız program kodu, kullanıcı verisi değil). 2.1.0'dan
// itibaren güncelleme ortak çekirdekle app.asar'ı değiştirir; eski kod klasörleri ve kurulum artıkları temizlenir.
setTimeout(() => {
  try { fs.rmSync(path.join(DATA_DIR, 'app'), { recursive: true, force: true }); } catch {}
  try { fs.rmSync(path.join(os.tmpdir(), 'cvmaker-update'), { recursive: true, force: true }); } catch {}
}, 15000);
