'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { buildPdf } = require('./lib/pdf');
const { buildDocx } = require('./lib/docx');
const updater = require('./lib/updater');
const { DataStore } = require('./lib/datastore');

const APP_NAME = 'CV Maker';
// Version of the code that is running (an update bundle can be newer than the .exe).
const APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;
const SHELL_VERSION = app.getVersion();
const [MAJOR, MINOR] = APP_VERSION.split('.');
const DISPLAY_VERSION = `${MAJOR}.${MINOR}`;
const TITLE = `${APP_NAME} v${DISPLAY_VERSION}`;

app.setName(APP_NAME);

// Installed edition (setup): data lives in %APPDATA%\CV Maker\data.
// The old portable edition kept it next to the .exe ("CV Maker Data"); it is still supported
// so that a portable copy can move itself over to the installed edition (see update:apply).
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
  win = new BrowserWindow({
    title: TITLE,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.on('page-title-updated', (e) => e.preventDefault());
  win.once('ready-to-show', () => {
    win.setFullScreen(true);
    win.show();
    if (global.__CVM_MARK_OK) global.__CVM_MARK_OK();
  });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.type === 'keyDown' && input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('enter-full-screen', () => win.webContents.send('window:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('window:fullscreen', false));
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// After a one-click update the new .exe is started with --cleanup-old=<previous exe>.
const cleanupArg = process.argv.find((a) => a.startsWith('--cleanup-old='));
const cleanupOld = cleanupArg ? cleanupArg.slice('--cleanup-old='.length) : '';
const afterUpdate = !!cleanupOld || process.argv.includes('--after-update');
function removeOldExe(tries = 0) {
  if (!cleanupOld || cleanupOld === process.env.PORTABLE_EXECUTABLE_FILE) return;
  fs.unlink(cleanupOld, (err) => {
    if (!err || err.code === 'ENOENT') return updateLog('removed ' + cleanupOld);
    if (tries < 60) setTimeout(() => removeOldExe(tries + 1), 1000);
    else updateLog('could not remove ' + cleanupOld + ': ' + err.code);
  });
}

// The previous version may still be closing; wait for the single-instance lock instead of quitting.
async function acquireLock() {
  for (let i = 0; i < (afterUpdate ? 40 : 1); i++) {
    if (app.requestSingleInstanceLock()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(async () => {
  if (!(await acquireLock())) return app.quit();
  createWindow();
  removeOldExe();
});
app.on('window-all-closed', () => app.quit());

// ---------- app info / window ----------
ipcMain.handle('app:info', () => ({
  name: APP_NAME,
  version: APP_VERSION,
  shellVersion: SHELL_VERSION,
  displayVersion: DISPLAY_VERSION,
  title: TITLE,
  portable: !!PORTABLE_DIR,
  dataDir: DATA_DIR,
  backupDir: store.backupDir,
  afterUpdate,
  migration: MIGRATION,
  platform: process.platform,
}));
ipcMain.on('window:minimize', () => win && win.minimize());
ipcMain.on('window:close', () => win && win.close());
ipcMain.on('window:toggleFullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
ipcMain.handle('window:isFullscreen', () => !!(win && win.isFullScreen()));
ipcMain.on('app:openDataDir', () => shell.openPath(DATA_DIR));
ipcMain.on('app:notify', (_e, { title, body }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'build', 'icon.png') });
  n.on('click', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.send('app:notifyClick');
  });
  n.show();
});

// ---------- storage ----------
ipcMain.handle('store:load', () => ({ cvs: store.loadCvs(), settings: store.loadSettings() }));
ipcMain.handle('store:saveCvs', (_e, data) => { store.saveCvs(data); return true; });
ipcMain.handle('store:saveSettings', (_e, data) => { store.saveSettings(data); return true; });
ipcMain.on('store:saveCvsSync', (e, data) => { try { store.saveCvs(data); } catch {} e.returnValue = true; });
ipcMain.on('store:saveSettingsSync', (e, data) => { try { store.saveSettings(data); } catch {} e.returnValue = true; });

// ---------- backups / import of old data ----------
ipcMain.handle('backup:list', () => store.listBackups());
ipcMain.handle('backup:create', () => store.backup('manual'));
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

// ---------- updates ----------
// Kinds of update (all announced in latest.json of the newest GitHub release, see update-config.json):
//  * bundle:    only the app's own files (~1 MB), unpacked into <data>/app/<version>
//               and picked up by boot.js on the next start.
//  * installer: the full setup ("CV Maker Setup x.y.exe"), run silently; used when the
//               Electron shell itself changes (manifest.bundle.minShell newer than this shell).
//  * portable -> installed: a portable copy downloads the setup, leaves a note where its
//               data is, installs and the installed edition imports the data on first start.
const BUNDLE_ROOT = path.join(DATA_DIR, 'app');
function canUseBundle(m) {
  if (PORTABLE_DIR && m && m.installer) return false; // portable copies move to the installed edition
  return !!(m && m.bundle && m.bundle.url && fs.existsSync(path.join(global.__CVM_BASE || __dirname, 'boot.js'))
    && updater.cmp(SHELL_VERSION, m.bundle.minShell || '999') >= 0);
}
ipcMain.handle('update:check', async (_e, override) => {
  const r = await updater.check(APP_VERSION, override);
  if (r.ok && PORTABLE_DIR && r.manifest && r.manifest.installer) { r.available = true; r.migrate = true; }
  return r;
});
ipcMain.handle('update:download', async (_e, manifest) => {
  const progress = (p) => win && win.webContents.send('update:progress', p);
  if (canUseBundle(manifest)) {
    try {
      const dir = await updater.downloadBundle(manifest, BUNDLE_ROOT, progress);
      updateLog(`bundle ${manifest.version} unpacked to ${dir}`);
      return { kind: 'bundle', version: manifest.version, path: dir };
    } catch (e) {
      updateLog('bundle failed, falling back to installer: ' + e.message);
    }
  }
  if (manifest.installer) {
    const dir = path.join(os.tmpdir(), 'cvmaker-update');
    fs.mkdirSync(dir, { recursive: true });
    const file = await updater.download(manifest.installer, dir, progress);
    updateLog(`installer ${manifest.version} downloaded to ${file}`);
    return { kind: 'installer', version: manifest.version, path: file, migrate: !!PORTABLE_DIR };
  }
  const targetDir = PORTABLE_DIR || app.getPath('downloads');
  return updater.download(manifest, targetDir, progress);
});
function restartSelf(extraArgs) {
  const exe = process.env.PORTABLE_EXECUTABLE_FILE;
  if (exe) {
    spawn(exe, extraArgs, { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }).unref();
  } else {
    app.relaunch({ args: process.argv.slice(1).filter((a) => !a.startsWith('--cleanup-old=') && a !== '--after-update').concat(extraArgs) });
  }
  setTimeout(() => app.exit(0), 400);
}
ipcMain.handle('update:apply', (_e, target) => {
  try { store.backup('before-update', { to: target && target.version }); } catch (e) { updateLog('backup before update failed: ' + e.message); }
  if (target && typeof target === 'object' && target.kind === 'bundle') {
    // Portable only: keep the .exe name in step with the version shown in the title.
    const oldExe = process.env.PORTABLE_EXECUTABLE_FILE;
    if (oldExe) {
      const [ma, mi] = String(target.version).split('.');
      const newExe = path.join(path.dirname(oldExe), `CV Maker v${ma}.${mi}.exe`);
      if (newExe.toLowerCase() !== oldExe.toLowerCase() && !fs.existsSync(newExe)) {
        try { fs.renameSync(oldExe, newExe); process.env.PORTABLE_EXECUTABLE_FILE = newExe; updateLog(`renamed ${oldExe} -> ${newExe}`); }
        catch (e) { updateLog('rename skipped: ' + e.code); }
      }
    }
    updateLog(`restart for bundle ${target.version}`);
    try { restartSelf(['--after-update']); } catch (e) { updateLog('restart failed: ' + e.message); return { restarted: false, error: e.message }; }
    return { restarted: true };
  }
  if (target && typeof target === 'object' && target.kind === 'installer') {
    if (process.platform !== 'win32') { shell.showItemInFolder(target.path); return { restarted: false }; }
    const args = ['/S', '--force-run'];
    if (PORTABLE_DIR) {
      // Tell the installed edition where the records are. The portable folder itself is left untouched.
      try {
        fs.mkdirSync(INSTALLED_USERDATA, { recursive: true });
        fs.writeFileSync(MIGRATE_FILE, JSON.stringify({ dataDir: DATA_DIR, exe: process.env.PORTABLE_EXECUTABLE_FILE, date: new Date().toISOString() }));
      } catch (e) { updateLog('could not write migrate note: ' + e.message); return { restarted: false, error: e.message }; }
    } else args.unshift('--updated');
    updateLog(`run installer ${target.path} ${args.join(' ')}`);
    try {
      spawn(target.path, args, { detached: true, stdio: 'ignore', cwd: path.dirname(target.path) }).unref();
    } catch (e) {
      updateLog('installer spawn failed: ' + e.message);
      shell.showItemInFolder(target.path);
      return { restarted: false, error: e.message };
    }
    setTimeout(() => app.exit(0), 400);
    return { restarted: true };
  }
  // Legacy: a downloaded portable .exe.
  const newExePath = typeof target === 'string' ? target : target && target.path;
  const oldExe = process.env.PORTABLE_EXECUTABLE_FILE;
  if (process.platform !== 'win32' || !oldExe) {
    shell.showItemInFolder(newExePath);
    return { restarted: false };
  }
  updateLog(`apply: ${oldExe} -> ${newExePath}`);
  try {
    spawn(newExePath, [`--cleanup-old=${oldExe}`], { detached: true, stdio: 'ignore', cwd: path.dirname(newExePath) }).unref();
  } catch (e) {
    updateLog('spawn failed: ' + e.message);
    shell.showItemInFolder(newExePath);
    return { restarted: false, error: e.message };
  }
  setTimeout(() => app.exit(0), 400);
  return { restarted: true };
});
ipcMain.on('update:openUrl', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

// Older unpacked bundles (not the running one) are obsolete; installer leftovers too.
setTimeout(() => {
  try {
    for (const d of fs.readdirSync(BUNDLE_ROOT)) {
      if (d === 'current.json') continue;
      const full = path.join(BUNDLE_ROOT, d);
      if (full !== global.__CVM_BUNDLE && updater.cmp(d, APP_VERSION) <= 0) fs.rmSync(full, { recursive: true, force: true });
    }
  } catch {}
  try { if (!PORTABLE_DIR) fs.rmSync(path.join(os.tmpdir(), 'cvmaker-update'), { recursive: true, force: true }); } catch {}
}, 15000);
