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
     Gerekirse install(win, {applyDelta(oldBuf, patchBuf) → Buffer}) ile başka uygulayıcı verilebilir.
   install(win, seçenekler) — hepsi isteğe bağlı, verilmezse davranış eskisi gibi:
     show: false            tepside çalışan uygulama: pencere açılışta gösterilmez/tam ekran yapılmaz (uygulama kendisi gösterir)
     beforeUpdate(meta, kind)  takastan / kurulum açılmadan ÖNCE beklenir (kind 'patch'|'full'|'setup'); ör. tam yedek almak için.
                            Hata fırlatırsa güncelleme yapılmaz (arayüze hata kodu gider).
     setupArgs              win-setup exe'sinin argümanları: dizi ya da true = NSIS sessiz ['/S'], false = argümansız (görünür).
                            Verilmezse NSIS sessiz + yeniden aç ['/S', '--force-run'].
   Dışa açık: runSetup(buf, meta, {args}) — kurulum exe'sini doğrular, geçici klasörden ayrık açar, programı kapatır. */
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
/* Windows takası: konsol penceresi AÇMAYAN yardımcı. Eskiden .cmd betiği (tasklist | find) kullanılıyordu; Windows Terminal
   varsayılan konsolken her komut ayrı siyah pencere açıyor, `find` girdisiz kalıp sonsuza dek bekliyordu (güncelleme olmuyordu).
   Şimdi programın kendi exe'si ELECTRON_RUN_AS_NODE ile (GUI alt sistemi → pencere yok) küçük bir Node betiğini çalıştırır:
   program kapanana dek bekler (en çok 60 sn, sonra zorla kapatır), kilitli dosyalar için 40 kez yeniden dener,
   eskisini .bak yapar, yenisini koyar, (istenirse) programı yeniden açar; başarısızsa eskisini geri koyar.
   Kurulum (setup exe) için de aynı yardımcı: program kapanınca kurulumu sessiz çalıştırır, bitmesini bekler.
   Günlük: %TEMP%\fc-update.log */
function swapHelper(cfg) {
  process.noAsar = true;
  const fs = require('fs'), cp = require('child_process'), path = require('path');
  const log = (m) => { try { fs.appendFileSync(cfg.log, new Date().toISOString() + ' ' + m + '\n'); } catch (e) {} };
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tryN = async (f, n) => { for (let i = 0; ; i++) { try { return f(); } catch (e) { if (i >= n) throw e; await sleep(500); } } };
  const env = Object.assign({}, process.env); delete env.ELECTRON_RUN_AS_NODE;
  const open = (args) => { try { cp.spawn(cfg.exe, args || cfg.args, { detached: true, stdio: 'ignore', env, cwd: path.dirname(cfg.exe), windowsHide: false }).unref(); } catch (e) { log('acilamadi ' + e.message); } };
  (async () => {
    log('basladi ' + (cfg.setup ? 'kurulum' : 'takas') + ' pid=' + cfg.pid + ' v' + (cfg.version || ''));
    for (let i = 0; i < 240 && alive(cfg.pid); i++) await sleep(250);
    if (alive(cfg.pid)) { log('zorla kapatiliyor'); try { process.kill(cfg.pid); } catch (e) {} await sleep(1500); }
    if (cfg.setup) {
      const r = cp.spawnSync(cfg.setup, cfg.setupArgs || [], { stdio: 'ignore', windowsHide: true, cwd: path.dirname(cfg.setup), env });
      log('kurulum bitti kod=' + r.status);
      if (cfg.relaunch && cfg.exe && fs.existsSync(cfg.exe)) open();
      try { fs.rmSync(path.dirname(cfg.setup), { recursive: true, force: true }); } catch (e) {}
    } else {
      let ok = false;
      try {
        try { fs.unlinkSync(cfg.target + '.bak'); } catch (e) {}
        await tryN(() => fs.renameSync(cfg.target, cfg.target + '.bak'), 40);
        try { await tryN(() => fs.renameSync(cfg.next, cfg.target), 40); ok = true; }
        catch (e) { log('yeni konulamadi ' + e.message); await tryN(() => fs.renameSync(cfg.target + '.bak', cfg.target), 40); }
      } catch (e) { log('takas hatasi ' + e.message); }
      try { fs.unlinkSync(cfg.next + '.json'); } catch (e) {}
      log(ok ? 'takas tamam' : 'eski surum kaldi');
      if (cfg.relaunch) open();
    }
    try { fs.unlinkSync(__filename); } catch (e) {}
    setTimeout(() => process.exit(0), 500);
  })();
}
/** Yardımcıyı ayrık, penceresiz başlatır (Windows). cfg: {target,next} takas ya da {setup,setupArgs} kurulum; relaunch: programı yeniden aç. */
function startHelper(cfg, spawnFn) {
  const exe = process.execPath;
  const full = Object.assign({ pid: process.pid, exe, args: process.argv.slice(1).filter((a) => !/^--fc-/.test(a)), log: path.join(os.tmpdir(), 'fc-update.log') }, cfg);
  const js = path.join(os.tmpdir(), 'fc-update-' + process.pid + '-' + Date.now() + '.js');
  ofs.writeFileSync(js, '(' + swapHelper.toString() + ')(' + JSON.stringify(full) + ');\n');
  const env = Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' });
  (spawnFn || spawn)(exe, [js], { detached: true, stdio: 'ignore', windowsHide: true, env }).unref();
}
function swapAndRelaunch(o, st, noRelaunch) {
  const args = process.argv.slice(1).filter((a) => !/^--fc-/.test(a));
  if (process.platform === 'win32') {
    startHelper({ target: st.target, next: st.next, relaunch: !noRelaunch });
    if (!noRelaunch) setTimeout(() => app.exit(0), 300);
  } else {
    try { ofs.unlinkSync(st.target + '.bak'); } catch (e) {}
    ofs.renameSync(st.target, st.target + '.bak');
    try { ofs.renameSync(st.next, st.target); } catch (e) { ofs.renameSync(st.target + '.bak', st.target); throw e; }
    try { ofs.unlinkSync(st.next + '.json'); } catch (e) {}
    if (!noRelaunch) { app.relaunch({ args }); setTimeout(() => app.exit(0), 300); }
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

/* ---------- eski Electron (< 25, net.fetch yok) için indirme: https + yönlendirme (yalnız izinli alan adları) ---------- */
function httpsGet(url, onData, hops) {
  return new Promise((resolve, reject) => {
    const uu = new URL(url);
    if (uu.protocol !== 'https:' || !ALLOWED_HOSTS.test(uu.hostname)) return reject(err('URL_NOT_ALLOWED'));
    const req = require('https').get(uu, { headers: { 'User-Agent': 'ortak-cekirdek', 'Cache-Control': 'no-cache' }, timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if ((hops || 0) >= 6) return reject(err('TOO_MANY_REDIRECTS'));
        return httpsGet(new URL(res.headers.location, uu).toString(), onData, (hops || 0) + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(err('HTTP_' + res.statusCode)); }
      res.on('data', onData); res.on('end', resolve); res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(err('TIMEOUT')); });
  });
}

/* ---------- kurulum kanalı (win-setup) ----------
   updater.plan minVersion/setupChannel ile 'win-setup' kanalını seçtiğinde
   installFull kurulum exe'sini getirir; çekirdek bunu app.asar.next olarak yazıp takas ediyordu (program bozulurdu).
   Burada exe SHA-256 ile doğrulanır, geçici klasöre yazılır, ayrık süreç olarak açılır ve program kapanır. */
function isSetup(meta) { return !!(meta && (/setup/i.test(String(meta.channel || '')) || /\.exe$/i.test(String(meta.file || '')))); }
const NSIS_SILENT = ['/S'];
/* Varsayılan (setupArgs verilmezse): NSIS sessiz + kurulum bitince programı aç (electron-builder --force-run). false → argümansız (görünür). */
function setupArgsFor(v) { if (v === undefined || v === null) return ['/S', '--force-run']; if (v === false) return []; if (v === true || v === 'nsis' || v === 'silent') return NSIS_SILENT.slice(); if (v === 'inno') return ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-']; return Array.isArray(v) ? v.map(String) : []; }
function writeSetup(buf, meta, ro) {
  ro = ro || {};
  if ((ro.platform || process.platform) !== 'win32') throw err('SETUP_WINDOWS_ONLY');
  if (!meta || !meta.targetSha256 || sha(buf) !== String(meta.targetSha256).toLowerCase()) throw err('BAD_HASH');
  if (meta.targetSize && buf.length !== +meta.targetSize) throw err('BAD_SIZE');
  const name = String(meta.file || 'setup.exe').replace(/[^\w.-]/g, '_');
  const dir = path.join(os.tmpdir(), 'fc-setup-' + process.pid); ofs.mkdirSync(dir, { recursive: true });
  const exe = path.join(dir, /\.exe$/i.test(name) ? name : name + '.exe');
  ofs.writeFileSync(exe, buf);
  if (sha(ofs.readFileSync(exe)) !== sha(buf)) throw err('STAGE_VERIFY');
  return { exe, dir };
}
function runSetup(buf, meta, ro) {
  ro = ro || {};
  const { exe, dir } = writeSetup(buf, meta, ro);
  (ro.spawn || spawn)(exe, setupArgsFor(ro.args), { detached: true, stdio: 'ignore', windowsHide: true, cwd: dir }).unref();
  setTimeout(() => app.exit(0), 400);
  return 'restarting';
}

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
  win.once('ready-to-show', () => { if (o.show === false) return; win.setFullScreen(true); win.show(); });   // show:false → tepside başlar
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
  const before = async (meta, kind) => { if (typeof o.beforeUpdate === 'function') await o.beforeUpdate(meta || {}, kind); };
  const relaunch = o._swap || swapAndRelaunch;
  /* Otomatik güncelleme: meta.deferred → yalnız hazırla ('staged'), program kapanınca (will-quit) pencere açmadan kur.
     applyStaged → hemen kur + yeniden aç. Hazırlanan app.asar.next yanında .next.json durur: program kurulmadan kapanmış/çökmüşse
     bir sonraki açılışta da hazır sayılır ve o kapanışta kurulur. */
  let staged = null;
  const markStaged = (st, meta) => { try { ofs.writeFileSync(st.next + '.json', JSON.stringify({ version: meta && meta.version, sha256: meta && meta.targetSha256 })); } catch (e) {} };
  const applyStagedNow = (noRelaunch) => {
    const s = staged; staged = null;
    if (!s) throw err('NOTHING_STAGED');
    if (s.kind === 'setup') {
      const args = setupArgsFor(o.setupArgs).filter((a) => !noRelaunch || a !== '--force-run');
      if (o._spawn) o._spawn(s.exe, args, { detached: true, stdio: 'ignore', windowsHide: true, cwd: s.dir });
      else startHelper({ setup: s.exe, setupArgs: args.filter((a) => a !== '--force-run'), relaunch: !noRelaunch, version: s.version });
      if (!noRelaunch) setTimeout(() => app.exit(0), 300);
    } else relaunch(o, s.st, noRelaunch);
    return 'restarting';
  };
  try {   // önceki oturumdan kalan hazır güncelleme
    const t = asarPath(o), j = JSON.parse(ofs.readFileSync(t + '.next.json', 'utf8'));
    if (j && j.sha256 && ofs.existsSync(t + '.next') && j.version !== app.getVersion() && sha(ofs.readFileSync(t + '.next')) === String(j.sha256).toLowerCase()) staged = { kind: 'swap', st: { target: t, next: t + '.next' }, version: j.version };
    else { try { ofs.unlinkSync(t + '.next'); } catch (e) {} try { ofs.unlinkSync(t + '.next.json'); } catch (e) {} }
  } catch (e) {}
  if (!install.quitHooked) {
    install.quitHooked = true;
    app.on('will-quit', () => { const a = install.applyOnQuit; if (a) { install.applyOnQuit = null; try { a(); } catch (e) { console.error(e); } } });
  }
  install.applyOnQuit = () => { if (staged) applyStagedNow(true); };
  const finish = (st, meta) => {
    if (meta && meta.deferred) { markStaged(st, meta); staged = { kind: 'swap', st, version: meta.version }; return 'staged'; }
    relaunch(o, st); return 'restarting';
  };
  handle('fc:update:patch', result(async (_e, bytes, meta) => {
    const cur = ofs.readFileSync(asarPath(o));
    const out = applyDelta(cur, Buffer.from(bytes));
    const st = stage(o, out, meta);   // yama önce doğrulanır (hata → arayüz tam dosyaya geçer); yedek ancak sonra alınır
    try { await before(meta, 'patch'); } catch (e) { try { ofs.unlinkSync(st.next); } catch (x) {} throw e; }
    return finish(st, meta);
  }));
  handle('fc:update:full', result(async (_e, bytes, meta) => {
    // Kurulum kanalı (win-setup: NSIS exe) app.asar'ın yerine YAZILMAZ; doğrulanıp sessiz çalıştırılır.
    if (isSetup(meta)) {
      await before(meta, 'setup');
      const ro = { args: o.setupArgs, platform: o._platform, spawn: o._spawn };
      if (meta && meta.deferred) { const w = writeSetup(Buffer.from(bytes), meta, ro); staged = { kind: 'setup', exe: w.exe, dir: w.dir, version: meta.version }; return 'staged'; }
      if (!o._spawn && (o._platform || process.platform) === 'win32') {   // program kapanınca kur, bitince yeniden aç (pencere yok)
        const w = writeSetup(Buffer.from(bytes), meta, ro); staged = { kind: 'setup', exe: w.exe, dir: w.dir, version: meta.version };
        return applyStagedNow(false);
      }
      return runSetup(Buffer.from(bytes), meta, ro);
    }
    const st = stage(o, Buffer.from(bytes), meta);
    try { await before(meta, 'full'); } catch (e) { try { ofs.unlinkSync(st.next); } catch (x) {} throw e; }
    return finish(st, meta);
  }));
  handle('fc:update:applyStaged', result(() => applyStagedNow(false)));
  handle('fc:net:download', async (e, id, url) => {
    const u = new URL(String(url));
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.test(u.hostname)) throw err('URL_NOT_ALLOWED');
    const parts = []; let n = 0, last = 0;
    const tick = (len) => { n += len; const t = Date.now(); if (t - last > 150) { last = t; e.sender.send('fc:net:progress', id, n); } };
    if (net && typeof net.fetch === 'function') {
      const res = await net.fetch(u.toString(), { cache: 'no-store', redirect: 'follow' });
      if (!res.ok) throw err('HTTP_' + res.status);
      const rd = res.body.getReader();
      for (;;) { const x = await rd.read(); if (x.done) break; parts.push(Buffer.from(x.value)); tick(x.value.length); }
    } else await httpsGet(u.toString(), (c) => { parts.push(c); tick(c.length); });   // Electron < 25: net.fetch yok
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
  ipcMain.on('fc:info', (e) => { e.returnValue = { version: app.getVersion(), name: app.getName(), platform: process.platform, channel: o.channel, staged: staged ? staged.version : null }; });

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

module.exports = { windowOptions, install, applyFcd1, cleanup, stage, swapAndRelaunch, swapHelper, startHelper, runSetup, writeSetup, setupArgsFor, isSetup, httpsGet };
