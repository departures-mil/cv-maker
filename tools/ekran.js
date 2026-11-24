#!/usr/bin/env node
// Arayüz ekran görüntüleri (başsız Chromium, sahte kabuk — window.api + window.fcHost taklit edilir):
//   PLAYWRIGHT_CORE=/yol/playwright-core PLAYWRIGHT_BROWSERS_PATH=... node tools/ekran.js <çıktı-klasörü>
// Ağ istekleri engellenir. Örnek CV programın kendi örneğidir (samples.js).
'use strict';
const path = require('path');
const fs = require('fs');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = path.resolve(process.argv[2] || 'ekran');
const URL0 = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
const VER = require('../package.json').version;
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { name: 'tr-falcon-dark', lang: 'tr', theme: 'dark', scheme: 'falcon' },
  { name: 'ar-falcon-light', lang: 'ar', theme: 'light', scheme: 'falcon' },
  { name: 'tr-klasik', lang: 'tr', theme: 'light', scheme: 'klasik' },
  { name: 'tr-klasik-dark', lang: 'tr', theme: 'dark', scheme: 'klasik' },
  { name: 'tr-falcon-dark-ayarlar', lang: 'tr', theme: 'dark', scheme: 'falcon', settings: true },
  { name: 'ar-falcon-light-ayarlar', lang: 'ar', theme: 'light', scheme: 'falcon', settings: true },
  { name: 'tr-klasik-tasarim', lang: 'tr', theme: 'light', scheme: 'klasik', tab: 'design' },
  { name: 'tr-falcon-dark-esitle', lang: 'tr', theme: 'dark', scheme: 'falcon', sync: true },
  { name: 'en-falcon-dark-rehber', lang: 'en', theme: 'dark', scheme: 'falcon', fresh: true },
];
(async () => {
  const browser = await pw.chromium.launch();
  const errors = [];
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: s.settings ? 1500 : 960 }, deviceScaleFactor: 1 });
    await ctx.route(/^https?:/, (r) => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(s.name + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push(s.name + ' console: ' + m.text()); });
    await page.addInitScript(({ s, VER }) => {
      const set = (k, v) => localStorage.setItem('fc.' + k, JSON.stringify(v));
      set('theme', s.theme); set('scheme', s.scheme);
      if (!s.fresh) { set('lang', s.lang); set('onboarding.done', true); set('whatsnew.seen', VER); }
      const st = { fullscreen: true, half: false };
      window.fcHost = { kind: 'electron', platform: 'win32', version: VER, window: { minimize: async () => {}, half: async () => {}, toggleFullscreen: async () => {}, close: async () => {}, getState: async () => st, onState: () => () => {} }, update: { channel: 'win-app', applyPatch: async () => 'restarting', installFull: async () => 'restarting' } };
      const noop = async () => true;
      window.api = { shell: 'fc', info: async () => ({ name: 'CV Maker', version: VER, title: 'CV Maker', notes: null, dataDir: 'C:\\Users\\x\\AppData\\Roaming\\CV Maker\\data', backupDir: 'C:\\Users\\x\\AppData\\Roaming\\CV Maker\\data\\backups', migration: null, platform: 'win32' }),
        load: async () => ({ cvs: null, settings: s.fresh ? {} : { uiLang: s.lang } }), saveCvs: noop, saveSettings: noop, saveCvsSync: () => true, saveSettingsSync: () => true,
        listBackups: async () => [{ name: 'a', date: '2026-11-24T08:00:00Z', reason: 'daily', cvCount: 2 }, { name: 'b', date: '2026-11-23T08:00:00Z', reason: 'before-update', cvCount: 2 }],
        createBackup: noop, backupBeforeUpdate: noop, restoreBackup: noop, openBackupDir: () => {}, openDataDir: () => {}, importLegacy: noop, saveText: noop,
        pickAttachments: async () => [], readAttachment: async () => null, removeAttachment: noop, openAttachment: noop, gcAttachments: noop,
        exportCv: noop, importCv: noop, exportPdf: noop, renderPdf: async () => new Uint8Array(), exportDocx: noop, pickJpegTarget: noop, saveJpegs: noop };
    }, { s, VER });
    await page.goto(URL0);
    await page.waitForTimeout(1800);
    if (s.tab) { await page.click(`.tab[data-tab="${s.tab}"]`); await page.waitForTimeout(500); }
    if (s.settings) { await page.evaluate(() => openSettings()); await page.waitForTimeout(700); }
    if (s.sync) { await page.click('#topbar .sync-act'); await page.waitForTimeout(400); }
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    await ctx.close();
    console.log('✓', s.name);
  }
  await browser.close();
  if (errors.length) { console.error('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; }
})();
