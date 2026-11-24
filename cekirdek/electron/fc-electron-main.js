/* Ortak çekirdek — Electron ana süreç yardımcısı.
     const fc = require('./fc-electron-main');
     const win = new BrowserWindow(fc.windowOptions({ webPreferences: { preload: path.join(__dirname, 'fc-preload.js') } }));
     fc.install(win, { channel: 'win-app' });
   - Pencere her açılışta TAM EKRAN açılır. "Orta" = çalışma alanının %50 genişlik × %50 yükseklik, ortalanmış; tekrar basınca tam ekrana döner.
   - IPC: fc:win:* (küçült / orta / tam ekran / kapat), fc:update:* (yama ya da tam app.asar → hazırlık dosyası → güvenli takas + yeniden başlatma),
     fc:net:download (CORS'suz, ilerlemeli indirme; yalnız GitHub adresleri), fc:open (yalnız https), ana süreç hataları → arayüz (fc:main-error).
   - Takas: app.asar.next yazılır, SHA-256 doğrulanır; Windows'ta program kapandıktan sonra küçük bir betik eskisini app.asar.bak yapar,
     yenisini yerine koyar ve programı yeniden açar (başarısızsa eskisini geri koyar). Diğer sistemlerde doğrudan yeniden adlandırılır.
   - Yama biçimi FCD1 (ortak-cekirdek/delta/FORMAT.md; electron/fcd1.js), eski DDSD1 de okunur.
     Gerekirse install(win, {applyDelta(oldBuf, patchBuf) → Buffer}) ile başka uygulayıcı verilebilir. */
'use strict';
const { app, BrowserWindow, ipcMain, screen, shell, net } = require('electron');
const ofs = (() => { try { return require('original-fs'); } catch (e) { return require('fs'); } })();   // .asar'ı arşiv sanmasın
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ALLOWED_HOSTS = /^(github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com|raw\.githubusercontent\.com|codeload\.github\.com)$/;

function windowOptions(extra) {
  const o = Object.assign({ show: false, fullscreen: true, frame: false, backgroundColor: '#070b14', autoHideMenuBar: true }, extra || {});
  o.webPreferences = Object.assign({ contextIsolation: true, nodeIntegration: false, sandbox: false }, (extra && extra.webPreferences) || {});
  return o;
}

const { applyFcd1, sha } = require('./fcd1.js');

/* ---------- takas ---------- */
function asarPath(o) { return o.asarPath || path.join(process.resourcesPath, 'app.asar'); }
function err(code) { const e = new Error(code); e.code = code; return e; }
function stage(o, buf, meta) {
  if (!o.asarPath && !app.isPackaged) throw err('NOT_PACKAGED');
  const target = asarPath(o), dir = path.dirname(target);
  try { ofs.accessSync(dir, ofs.constants.W_OK); } catch (e) { throw err('NO_WRITE'); }
  if (meta && meta.targetSha256 && sha(buf) !== String(meta.targetSha256).toLowerCase()) throw err('BAD_HASH');
  if (meta && meta.targetSize && buf.length !== +meta.targetSize) throw err('BAD_SIZE');
  const next = target + '.next', tmp = next + '.tmp';
  const fd = ofs.openSync(tmp, 'w'); try { ofs.writeSync(fd, buf); ofs.fsyncSync(fd); } finally { ofs.closeSync(fd); }
  if (sha(ofs.readFileSync(tmp)) !== sha(buf)) throw err('STAGE_VERIFY');
  try { ofs.unlinkSync(next); } catch (e) {}
  ofs.renameSync(tmp, next);
  return { target, next };
}
function swapAndRelaunch(o, st) {
  const exe = process.execPath, args = process.argv.slice(1).filter((a) => !/^--fc-/.test(a));
  if (process.platform === 'win32') {
    const q = (s) => '"' + String(s).replace(/"/g, '') + '"';
    const bat = path.join(os.tmpdir(), 'fc-update-' + process.pid + '.cmd');
    const lines = [
      '@echo off', 'setlocal', 'set N=0',
      ':wait', `tasklist /FI "PID eq ${process.pid}" 2>NUL | find "${process.pid}" >NUL`,
      'if not errorlevel 1 ( set /a N+=1 & if %N% LSS 90 ( ping -n 2 127.0.0.1 >NUL & goto wait ) )',
      `if exist ${q(st.target + '.bak')} del /F /Q ${q(st.target + '.bak')} >NUL 2>&1`,
      `move /Y ${q(st.target)} ${q(st.target + '.bak')} >NUL 2>&1 || goto fail`,
      `move /Y ${q(st.next)} ${q(st.target)} >NUL 2>&1 || ( move /Y ${q(st.target + '.bak')} ${q(st.target)} >NUL 2>&1 & goto fail )`,
      ':run', `start "" ${q(exe)} ${args.map(q).join(' ')}`, '(goto) 2>NUL & del "%~f0"',
      ':fail', 'goto run'
    ];
    ofs.writeFileSync(bat, lines.join('\r\n'));
    spawn('cmd.exe', ['/d', '/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => app.exit(0), 300);
  } else {
    try { ofs.unlinkSync(st.target + '.bak'); } catch (e) {}
    ofs.renameSync(st.target, st.target + '.bak');
    try { ofs.renameSync(st.next, st.target); } catch (e) { ofs.renameSync(st.target + '.bak', st.target); throw e; }
    app.relaunch({ args });
    setTimeout(() => app.exit(0), 300);
  }
}
/** Başarılı açılıştan bir süre sonra eski yedekleri temizler (sorun olursa .bak ile elle geri dönülebilir). */
function cleanup(o, delayMs) {
  setTimeout(() => {
    const t = asarPath(o || {});
    for (const f of [t + '.next.tmp']) { try { ofs.unlinkSync(f); } catch (e) {} }
    try { if (ofs.existsSync(t + '.bak') && Date.now() - ofs.statSync(t + '.bak').mtimeMs > 3 * 86400000) ofs.unlinkSync(t + '.bak'); } catch (e) {}
  }, delayMs == null ? 60000 : delayMs);
}

/* ---------- pencere ---------- */
function install(win, opts) {
  const o = Object.assign({ channel: 'win-app' }, opts || {});
  const applyDelta = o.applyDelta || applyFcd1;
  let half = false;
  const state = () => ({ fullscreen: win.isFullScreen(), half });
  const emit = () => { if (!win.isDestroyed()) win.webContents.send('fc:win:state', state()); };
  const fromSender = (e) => BrowserWindow.fromWebContents(e.sender) === win;
  function setHalf() {
    const wa = screen.getDisplayMatching(win.getBounds()).workArea;
    const w = Math.round(wa.width * 0.5), h = Math.round(wa.height * 0.5);
    win.setBounds({ x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + Math.round((wa.height - h) / 2), width: w, height: h });
    half = true; emit();
  }
  function leaveFullscreen(then) {
    if (!win.isFullScreen()) { if (win.isMaximized()) win.unmaximize(); return then(); }
    win.once('leave-full-screen', () => setTimeout(() => { if (win.isMaximized()) win.unmaximize(); then(); }, 60));
    win.setFullScreen(false);
  }
  win.once('ready-to-show', () => { win.setFullScreen(true); win.show(); });
  win.on('enter-full-screen', () => { half = false; emit(); });
  win.on('leave-full-screen', emit);

  const handle = (ch, fn) => { ipcMain.removeHandler(ch); ipcMain.handle(ch, (e, ...a) => { if (!fromSender(e)) throw err('FORBIDDEN'); return fn(e, ...a); }); };
  handle('fc:win:minimize', () => win.minimize());
  handle('fc:win:half', () => { if (half) { half = false; win.setFullScreen(true); } else leaveFullscreen(setHalf); });
  handle('fc:win:fullscreen', () => { if (win.isFullScreen()) leaveFullscreen(() => { half = false; win.maximize(); emit(); }); else win.setFullScreen(true); });
  handle('fc:win:close', () => win.close());
  handle('fc:win:state', () => state());
  handle('fc:open', (_e, url) => { if (/^https:\/\//i.test(String(url))) return shell.openExternal(String(url)); });

  const result = (f) => async (...a) => { try { return { ok: true, data: await f(...a) } } catch (e) { return { ok: false, error: e.code || e.message || 'ERR' }; } };
  handle('fc:update:patch', result((_e, bytes, meta) => {
    const cur = ofs.readFileSync(asarPath(o));
    const out = applyDelta(cur, Buffer.from(bytes));
    const st = stage(o, out, meta);
    swapAndRelaunch(o, st); return 'restarting';
  }));
  handle('fc:update:full', result((_e, bytes, meta) => { const st = stage(o, Buffer.from(bytes), meta); swapAndRelaunch(o, st); return 'restarting'; }));
  handle('fc:net:download', async (e, id, url) => {
    const u = new URL(String(url));
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.test(u.hostname)) throw err('URL_NOT_ALLOWED');
    const res = await net.fetch(u.toString(), { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw err('HTTP_' + res.status);
    const rd = res.body.getReader(), parts = []; let n = 0, last = 0;
    for (;;) {
      const x = await rd.read(); if (x.done) break;
      parts.push(Buffer.from(x.value)); n += x.value.length;
      const t = Date.now(); if (t - last > 150) { last = t; e.sender.send('fc:net:progress', id, n); }
    }
    e.sender.send('fc:net:progress', id, n, true);
    return new Uint8Array(Buffer.concat(parts, n));
  });
  /* Asistan Agent: aynı bilgisayardaki uygulamalar sayaçlarını ortak klasörde paylaşır (yalnız sayılar, içerik yok) */
  const agentDir = () => path.join(app.getPath('appData'), 'FalconCekirdek', 'agent');
  const agentFile = (k) => path.join(agentDir(), String(k).replace(/[^\w@.-]/g, '_').slice(0, 120) + '.json');
  handle('fc:agent:write', result((_e, key, json) => { const s = String(json); if (s.length > 2e6) throw err('TOO_BIG'); JSON.parse(s); ofs.mkdirSync(agentDir(), { recursive: true }); const f = agentFile(key); ofs.writeFileSync(f + '.tmp', s); ofs.renameSync(f + '.tmp', f); return true; }));
  handle('fc:agent:read', result(() => { const out = {}; let names = []; try { names = ofs.readdirSync(agentDir()); } catch (e) { return out; } names.filter((n) => n.endsWith('.json')).slice(0, 200).forEach((n) => { try { out[n.slice(0, -5)] = ofs.readFileSync(path.join(agentDir(), n), 'utf8'); } catch (e) {} }); return out; }));
  handle('fc:agent:remove', result((_e, key) => { try { ofs.unlinkSync(agentFile(key)); } catch (e) {} return true; }));
  ipcMain.removeAllListeners('fc:info');
  ipcMain.on('fc:info', (e) => { e.returnValue = { version: app.getVersion(), name: app.getName(), platform: process.platform, channel: o.channel }; });

  /* ana süreç hataları → arayüz (crash.js gönderir); arayüz hazır değilse bekletilir */
  const pending = [];
  const forward = (x) => { const m = { message: String((x && x.message) || x), stack: String((x && x.stack) || '') }; if (!win.isDestroyed() && !win.webContents.isLoading()) win.webContents.send('fc:main-error', m); else pending.push(m); };
  win.webContents.on('did-finish-load', () => { while (pending.length) win.webContents.send('fc:main-error', pending.shift()); emit(); });
  if (!install.hooked) {
    install.hooked = true;
    process.on('uncaughtException', (e) => { console.error(e); forward(e); });
    process.on('unhandledRejection', (e) => { console.error(e); forward(e); });
  }
  app.on('child-process-gone', (_e, d) => { if (d.reason !== 'clean-exit' && d.reason !== 'killed') forward({ message: 'child-process-gone: ' + d.type + ' ' + d.reason }); });
  win.webContents.on('render-process-gone', (_e, d) => { if (d.reason !== 'clean-exit') pending.push({ message: 'render-process-gone: ' + d.reason, stack: '' }); });
  if (o.cleanup !== false) cleanup(o);
  return { state, setHalf, forward };
}

module.exports = { windowOptions, install, applyFcd1, cleanup, stage, swapAndRelaunch };
