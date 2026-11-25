'use strict';
// CV Maker — Electron ana süreç.
// Pencere (her açılışta tam ekran, çerçevesiz), sağ üst pencere düğmeleri, GitHub Releases güncellemesi (yama + tam app.asar)
// ve ana süreç hata raporu ortak çekirdekten gelir (cekirdek/electron/fc-electron-main.js). Burada yalnız CV Maker'a özgü IPC kalır.
// Kullanıcı verisi: %APPDATA%\CV Maker\data (2.0.x ile aynı yer; güncelleme ve kurulum dokunmaz).
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, safeStorage } = require('electron');
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
// İsteğe bağlı şifreleme: Windows'ta DPAPI (yalnız bu Windows hesabı açabilir). Ayarlar → Gizlilik ve güvenlik.
const CIPHER = {
  available: () => { try { return safeStorage.isEncryptionAvailable(); } catch { return false; } },
  encrypt: (buf) => safeStorage.encryptString(buf.toString('utf8')),
  decrypt: (buf) => Buffer.from(safeStorage.decryptString(buf), 'utf8'),
};
const store = new DataStore(DATA_DIR, CIPHER);
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
    // yazım denetimi: Windows'un kendi denetleyicisi (yüklü diller); sağ tıkta öneriler. Linux'ta (CI) sözlük indirmesin diye kapalı.
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: process.platform !== 'linux' },
  }));
  fc.install(win, { channel: 'win-app' });
  Menu.setApplicationMenu(null);
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.type === 'keyDown' && input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  win.webContents.on('context-menu', (_e, p) => contextMenu(p));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  if (SMOKE) smoke();
}

// Sağ tık: yazım önerileri + kes/kopyala/yapıştır (arayüz diline göre)
const CTX_TEXT = {
  tr: { cut: 'Kes', copy: 'Kopyala', paste: 'Yapıştır', selectAll: 'Tümünü seç', add: 'Sözlüğe ekle', none: 'Öneri yok' },
  en: { cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select all', add: 'Add to dictionary', none: 'No suggestions' },
  ar: { cut: 'قص', copy: 'نسخ', paste: 'لصق', selectAll: 'تحديد الكل', add: 'إضافة إلى القاموس', none: 'لا توجد اقتراحات' },
};
function contextMenu(p) {
  let L = CTX_TEXT.tr;
  try { L = CTX_TEXT[store.loadSettings().uiLang] || L; } catch {}
  const items = [];
  if (p.misspelledWord) {
    for (const w of (p.dictionarySuggestions || []).slice(0, 6)) items.push({ label: w, click: () => win.webContents.replaceMisspelling(w) });
    if (!items.length) items.push({ label: L.none, enabled: false });
    items.push({ label: L.add, click: () => win.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: 'separator' });
  }
  if (p.isEditable) items.push({ label: L.cut, role: 'cut', enabled: p.editFlags.canCut }, { label: L.copy, role: 'copy', enabled: p.editFlags.canCopy }, { label: L.paste, role: 'paste', enabled: p.editFlags.canPaste }, { type: 'separator' }, { label: L.selectAll, role: 'selectAll' });
  else if (p.selectionText) items.push({ label: L.copy, role: 'copy' });
  if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
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
        // PDF üst bilgisi (ATS / arama): başlık, yazar, anahtar kelimeler
        const pm = await require('pdf-lib').PDFDocument.load(await buildPdf('<!doctype html><html><head><style></style></head><body>CV</body></html>', [], { title: 'Ayşe Yılmaz – Kaptan Pilot – CV', author: 'Ayşe Yılmaz', keywords: ['A320', 'ATPL'], lang: 'tr' }));
        r.pdfMeta = pm.getTitle() === 'Ayşe Yılmaz – Kaptan Pilot – CV' && pm.getAuthor() === 'Ayşe Yılmaz' && /A320/.test(pm.getKeywords() || '');
        r.fullscreen = win.isFullScreen(); r.appVersion = app.getVersion();
        r.pro = await smokePro();
        r.errors = r.errors.concat(consoleErrors.filter((m) => !/net::|Failed to load resource|ERR_/.test(m)));
        clearTimeout(fail);
        r.errors = r.errors.concat(r.pro.errors || []);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.sections > 0 && r.preview && !r.errors.length && r.pro.ok && r.pdfMeta }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String((e && e.message) || e) }); app.exit(3); }
    }, 3500);
  });
}

// 2.2 özellikleri için senaryo: havacılık CV'si, uçuş saatleri tablosu, QR, analiz, ilan eşleşmesi, çevrim dışı çeviri,
// başvuru, ön yazı, JSON Resume / Europass, sürüm geçmişi, iletişim kutuları. CVM_SHOTS=<klasör> ise ekran görüntüsü alır.
async function smokePro() {
  const shots = process.env.CVM_SHOTS;
  const js = (code) => win.webContents.executeJavaScript(`(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`);
  const shot = async (name) => { if (!shots) return; await new Promise((r) => setTimeout(r, 250)); fs.mkdirSync(shots, { recursive: true }); fs.writeFileSync(path.join(shots, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const closeModals = () => js(`document.querySelectorAll('.modal-backdrop, .fc-modal-wrap, .modal-wrap').forEach((m) => m.remove()); document.querySelectorAll('.modal').forEach((m) => (m.closest('[class*=backdrop]') || m).remove()); return true;`);
  const r = {};
  try {
    if (shots) { win.setFullScreen(false); win.setBounds({ x: 0, y: 0, width: 1500, height: 940 }); await new Promise((ok) => setTimeout(ok, 500)); }
    await js(`FC.storage.set('onboarding.done', true); return 1;`);
    await closeModals();
    if (process.env.CVM_LANG) { await js(`FC.i18n.set('${process.env.CVM_LANG}'); await wait(300); return 1;`); }
    r.analysisTab = await js(`Pro.openTab('analysis'); await wait(300); return !!document.querySelector('.an-score') && Pro.analyze().score >= 0;`);
    await shot('01-analiz');
    Object.assign(r, await js(`
      Apps.createFromProfession('pilot', 'Test Pilot', true, 'en'); await wait(300);
      const cv = S.cur, d = new Date(Date.now() + 30 * 86400000);
      cv.personal.fullName.value = 'Ayşe Test'; cv.personal.email.value = 'ayse@example.com'; cv.personal.phone.numbers[0].value = '+90 532 000 00 00';
      const fh = cv.sections.find((s) => s.type === 'flightHours');
      Object.assign(fh.items[0], { aircraft: 'Airbus A320 family', category: 'aeroplane', total: '4200', pic: '1800', sic: '2400', ifr: '300', date: '2026-10' });
      fh.items.push(Object.assign(newItem('flightHours'), { aircraft: 'Cessna 172', total: '150,5', pic: '120' }));
      Object.assign(cv.sections.find((s) => s.type === 'licences').items[0], { name: AV.avList('licence', 'en')[0], authority: 'EASA', number: 'TR.FCL.1234', date: '2015-04', expiry: d.toISOString().slice(0, 10) });
      Object.assign(cv.sections.find((s) => s.type === 'typeRatings').items[0], { aircraft: 'Airbus A320 family', privilege: 'PIC – Pilot-in-Command', expiry: '2020-01-31' });
      Object.assign(cv.sections.find((s) => s.type === 'medical').items[0], { medClass: 'class1', authority: 'EASA', expiry: d.toISOString().slice(0, 10) });
      Object.assign(cv.sections.find((s) => s.type === 'experience').items[0], { position: 'Captain', company: 'Example Airlines', start: '2018-03', current: true, description: '- Responsible for safe operation of A320 flights\\n- Led crews of 6' });
      cv.sections.find((s) => s.type === 'summary').items[0].text = 'Captain with 4,200 hours on the A320 family.';
      cv.qr.on = true; cv.targetCountry = 'AE';
      changed(true); renderPreview(); await wait(400);
      const res = {
        pilotCv: cv.sections.some((s) => s.type === 'flightHours'),
        hoursTable: !!document.querySelector('#preview-sheet .cv-hours tfoot'),
        qr: !!document.querySelector('#preview-sheet .cv-qr svg'),
        expiring: AV.expiringItems([cv]).length,
        icaoDefault: cv.sections.find((s) => s.type === 'languages').items[0].icao === '4',
      };
      Pro.openTab('content'); await wait(200);
      res.datalist = !!document.querySelector('#editor datalist option');
      res.aiBtn = !!document.querySelector('#editor .ai-btn');
      return res;`));
    await shot('02-pilot-onizleme');
    Object.assign(r, await js(`
      Pro.openTab('analysis'); await wait(300);
      const a = Pro.analyze();
      const m = CHK.matchPosting(S.cur, 'We are looking for an A320 Captain holding an ATPL. CRM, ETOPS and LVO experience required. Type rating on A320 is mandatory.');
      return { issues: a.issues.map((x) => x.id), issueTexts: a.issues.every((x) => !/^chk[.]/.test(Pro.issueText(x))), match: m.score, missingKw: m.missing.slice(0, 5) };`));
    await shot('03-pilot-analiz');
    Object.assign(r, await js(`
      const src = S.cur; const srcId = src.id;
      await Pro.translateTo(src, 'ar'); await wait(400);
      const ar = S.cur;
      const res = { arCopy: ar.lang === 'ar' && ar.translation.of === srcId, arDir: document.querySelector('#preview-sheet .cv').dir, arTitle: ar.personal.jobTitle.value };
      switchCv(srcId); S.cur.personal.jobTitle.value = 'Senior Captain'; changed(); await wait(50);
      switchCv(ar.id); Pro.openTab('content'); await wait(200);
      res.staleBanner = !!document.querySelector('#editor .banner');
      res.staleLabel = /⟳/.test(document.querySelector('#cv-select').selectedOptions[0].textContent);
      return res;`));
    await shot('04-arapca-kopya');
    Object.assign(r, await js(`
      switchCv(S.cvs.find((c) => c.name === 'Test Pilot').id);
      Apps.editApp(null, S.cur); await wait(200);
      const inp = document.querySelector('.app-form input'); inp.value = 'Emirates'; inp.dispatchEvent(new Event('input'));
      [...document.querySelectorAll('.modal button')].find((b) => b.textContent === t('save')).click(); await wait(300);
      return { apps: S.applications.length, appCards: document.querySelectorAll('.app-card').length, snapshot: !!(S.applications[0] && S.applications[0].snapshot) };`));
    await shot('05-basvurular');
    await closeModals();
    Object.assign(r, await js(`
      Pro.coverLetterDialog(); await wait(200);
      const gen = [...document.querySelectorAll('.cl-form button')].find((b) => /✦/.test(b.textContent)); gen.click(); await wait(600);
      const text = document.querySelector('.letter-text').value;
      return { letter: text.length > 100 && text.includes('Ayşe Test') };`));
    await shot('06-on-yazi');
    await closeModals();
    Object.assign(r, await js(`
      const jr = Apps.toJsonResume(S.cur);
      const back = Apps.fromJsonResume(JSON.parse(JSON.stringify(jr)));
      const xml = Apps.toEuropass(S.cur);
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      return { jsonResume: jr.basics.name === 'Ayşe Test' && back.personal.fullName.value === 'Ayşe Test' && back.sections.find((s) => s.type === 'experience').items.length === 1,
        europass: !doc.querySelector('parsererror') && doc.getElementsByTagName('WorkExperience').length === 1 };`));
    Object.assign(r, await js(`
      await Apps.forceSnap(); S.cur.personal.jobTitle.value = 'Changed'; changed(); await Apps.forceSnap();
      const list = await api.historyList(S.cur.id);
      Apps.historyDialog(); await wait(400);
      const row = document.querySelector('.hist-row'); if (row) row.click(); await wait(400);
      return { history: list.length, histPreview: !!document.querySelector('.hist-preview .cv') };`));
    await shot('07-surum-gecmisi');
    await closeModals();
    Object.assign(r, await js(`
      Pro.fitPage(); await wait(300); const fit = !!document.querySelector('.fit-pages');
      document.querySelectorAll('.modal').forEach((m) => (m.closest('[class*=backdrop]') || m).remove());
      Apps.newCvDialog(); await wait(200); const prof = document.querySelectorAll('.prof').length;
      return { fit, prof };`));
    await shot('08-yeni-cv');
    await closeModals();
    Object.assign(r, await js(`
      openSettings('cv-ai'); await wait(400);
      const cards = [...document.querySelectorAll('.cv-settings .settings-grid > *')].map((x) => x.getAttribute('data-fc-card') || '');
      return { settingsCards: cards };`));
    await shot('09-ayarlar');
    await closeModals();
    Object.assign(r, await js(`Pro.openTab('design'); await wait(300); return { qrCard: !!document.querySelector('#editor .ed-card select option[value=vcard]') };`));
    await shot('10-tasarim');
    if (shots) {   // yalnız ekran görüntüsü kipinde: iletişim kutuları
      await js(`Pro.openTab('content'); const s = S.cur.sections.find((x) => x.type === 'experience'); Pro.improveField(s, s.items[0], 'description', null); await wait(500); return 1;`);
      await shot('11-iyilestir'); await closeModals();
      await js(`const c = document.createElement('canvas'); c.width = 600; c.height = 800; const g = c.getContext('2d'); g.fillStyle = '#9aa7b8'; g.fillRect(0, 0, 600, 800);
        g.fillStyle = '#2b3a55'; g.beginPath(); g.ellipse(300, 760, 230, 260, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e0b48f'; g.beginPath(); g.ellipse(300, 330, 120, 150, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3b2a1e'; g.beginPath(); g.ellipse(300, 230, 130, 80, 0, Math.PI, Math.PI * 2); g.fill();
        openCropper(c.toDataURL('image/jpeg', .92)); await wait(500); document.querySelectorAll('.bg-sw')[1].click(); await wait(800); return 1;`);
      await shot('12-fotograf'); await closeModals();
      await js(`Pro.fitPage(); await wait(400); return 1;`);
      await shot('13-sigdir'); await closeModals();
    }
    r.errors = await js('return (window.__cvmErrors || []).slice(0, 8);');
    r.ok = !!(r.analysisTab && r.pilotCv && r.hoursTable && r.qr && r.expiring >= 2 && r.datalist && r.aiBtn && r.issues.includes('expired') && r.issueTexts && r.match > 40
      && r.arCopy && r.arDir === 'rtl' && r.staleBanner && r.apps === 1 && r.snapshot && r.letter && r.jsonResume && r.europass && r.history >= 2 && r.histPreview && r.fit && r.prof >= 8
      && r.settingsCards.includes('cv-ai') && r.settingsCards.includes('cv-privacy') && r.settingsCards[r.settingsCards.length - 1] === 'contact' && r.qrCard && !r.errors.length);
  } catch (e) { r.ok = false; r.exception = String((e && e.stack) || e); }
  return r;
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
ipcMain.handle('store:load', () => {
  const cvs = store.loadCvs();
  return { cvs, settings: store.loadSettings(), cvsError: store.loadError, security: securityInfo() };
});
ipcMain.handle('store:saveCvs', (_e, data) => { store.saveCvs(data); return true; });
ipcMain.handle('store:saveSettings', (_e, data) => { store.saveSettings(data); return true; });
ipcMain.on('store:saveCvsSync', (e, data) => { try { store.saveCvs(data); } catch {} e.returnValue = true; });
ipcMain.on('store:saveSettingsSync', (e, data) => { try { store.saveSettings(data); } catch {} e.returnValue = true; });

// ---------- gizlilik: şifreleme ----------
function securityInfo() { return { encrypt: store.encryptionOn(), available: store.encryptionAvailable(), error: store.loadError }; }
ipcMain.handle('security:get', () => securityInfo());
ipcMain.handle('security:set', (_e, on) => { store.setEncryption(!!on); updateLog(`encryption ${on ? 'on' : 'off'}`); return securityInfo(); });

// ---------- sürüm geçmişi (CV başına) ----------
ipcMain.handle('history:snapshot', (_e, cv) => { try { return store.snapshot(cv); } catch (e) { updateLog('snapshot: ' + e.message); return null; } });
ipcMain.handle('history:list', (_e, cvId) => store.listHistory(cvId));
ipcMain.handle('history:read', (_e, { cvId, name }) => store.readHistory(cvId, name));

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
ipcMain.handle('file:saveText', async (_e, { title, defaultName, ext, text, open }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName, filters: [{ name: ext, extensions: [ext] }] });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text, 'utf8');
  if (open) shell.showItemInFolder(r.filePath);
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
ipcMain.handle('pdf:export', async (_e, { html, attachments, defaultName, title, open, meta }) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: defaultName + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return { ok: false, canceled: true };
  const files = attachments.map((a) => ({ ...a, path: safeAttachPath(a.fileId) })).filter((a) => fs.existsSync(a.path));
  const bytes = await buildPdf(html, files, meta);
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
