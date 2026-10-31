'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { buildPdf } = require('./lib/pdf');
const { buildDocx } = require('./lib/docx');
const updater = require('./lib/updater');

const APP_NAME = 'CV Maker';
const [MAJOR, MINOR] = app.getVersion().split('.');
const DISPLAY_VERSION = `${MAJOR}.${MINOR}`;
const TITLE = `${APP_NAME} v${DISPLAY_VERSION}`;

app.setName(APP_NAME);

// Portable: keep all data next to the .exe so it travels with it.
const PORTABLE_DIR = process.env.PORTABLE_EXECUTABLE_DIR;
const DATA_DIR = PORTABLE_DIR
  ? path.join(PORTABLE_DIR, 'CV Maker Data')
  : path.join(app.getPath('userData'), 'data');
const ATTACH_DIR = path.join(DATA_DIR, 'attachments');
fs.mkdirSync(ATTACH_DIR, { recursive: true });
if (PORTABLE_DIR) app.setPath('userData', path.join(DATA_DIR, 'chromium'));

const STORE_FILE = path.join(DATA_DIR, 'cvs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

let win;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

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
  win.once('ready-to-show', () => { win.setFullScreen(true); win.show(); });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.type === 'keyDown' && input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('enter-full-screen', () => win.webContents.send('window:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('window:fullscreen', false));
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---------- app info / window ----------
ipcMain.handle('app:info', () => ({
  name: APP_NAME,
  version: app.getVersion(),
  displayVersion: DISPLAY_VERSION,
  title: TITLE,
  portable: !!PORTABLE_DIR,
  dataDir: DATA_DIR,
  platform: process.platform,
}));
ipcMain.on('window:minimize', () => win && win.minimize());
ipcMain.on('window:close', () => win && win.close());
ipcMain.on('window:toggleFullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
ipcMain.handle('window:isFullscreen', () => !!(win && win.isFullScreen()));
ipcMain.on('app:openDataDir', () => shell.openPath(DATA_DIR));

// ---------- storage ----------
ipcMain.handle('store:load', () => ({
  cvs: readJson(STORE_FILE, null),
  settings: readJson(SETTINGS_FILE, null),
}));
ipcMain.handle('store:saveCvs', (_e, data) => { writeJsonAtomic(STORE_FILE, data); return true; });
ipcMain.handle('store:saveSettings', (_e, data) => { writeJsonAtomic(SETTINGS_FILE, data); return true; });
ipcMain.on('store:saveCvsSync', (e, data) => { try { writeJsonAtomic(STORE_FILE, data); } catch {} e.returnValue = true; });
ipcMain.on('store:saveSettingsSync', (e, data) => { try { writeJsonAtomic(SETTINGS_FILE, data); } catch {} e.returnValue = true; });
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
  try { fs.unlinkSync(safeAttachPath(fileId)); } catch {}
  return true;
});
ipcMain.handle('attach:open', (_e, fileId) => shell.openPath(safeAttachPath(fileId)));
ipcMain.handle('attach:gc', (_e, usedIds) => {
  const used = new Set(usedIds);
  for (const f of fs.readdirSync(ATTACH_DIR)) if (!used.has(f)) { try { fs.unlinkSync(path.join(ATTACH_DIR, f)); } catch {} }
  return true;
});

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
ipcMain.handle('update:check', (_e, override) => updater.check(app.getVersion(), override));
ipcMain.handle('update:download', async (_e, manifest) => {
  const targetDir = PORTABLE_DIR || app.getPath('downloads');
  return updater.download(manifest, targetDir, (p) => win && win.webContents.send('update:progress', p));
});
ipcMain.handle('update:apply', (_e, newExePath) => {
  const oldExe = process.env.PORTABLE_EXECUTABLE_FILE;
  if (process.platform !== 'win32' || !oldExe) {
    shell.showItemInFolder(newExePath);
    return { restarted: false };
  }
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const script = path.join(os.tmpdir(), `cvmaker-update-${Date.now()}.ps1`);
  const ps = [
    `$old = ${q(oldExe)}`,
    `$new = ${q(newExePath)}`,
    'for ($i = 0; $i -lt 240; $i++) {',
    '  if (-not (Test-Path -LiteralPath $old)) { break }',
    '  try { Remove-Item -LiteralPath $old -Force -ErrorAction Stop; break } catch { Start-Sleep -Milliseconds 500 }',
    '}',
    'Start-Process -FilePath $new',
    'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
  ].join('\r\n');
  fs.writeFileSync(script, '﻿' + ps, 'utf8');
  spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script], {
    detached: true, stdio: 'ignore', windowsHide: true,
  }).unref();
  setTimeout(() => app.quit(), 300);
  return { restarted: true };
});
