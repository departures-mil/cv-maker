// Electron açılış testi: gerçek ana süreç + preload + arayüz. Pencere açılır, ortak çekirdek ve CV düzenleyici başlar,
// tam ekran, sağ üst sıra dolu, Ayarlar'da "Admin ile iletişim" en sonda. Linux'ta ekran yoksa xvfb-run ile (CI: ubuntu-latest).
// Electron ikilisi yoksa (npm ci yapılmadıysa) atlanır.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let electron = null;
try { electron = require('electron'); } catch (e) { }
const needX = process.platform === 'linux' && !process.env.DISPLAY;
const hasXvfb = !needX || spawnSync('sh', ['-c', 'command -v xvfb-run'], { encoding: 'utf8' }).status === 0;

test('Electron: pencere yüklenir, çekirdek ve düzenleyici başlar, tam ekran', { skip: !electron || typeof electron !== 'string' ? 'electron yok' : !hasXvfb ? 'xvfb-run yok' : false, timeout: 150000 }, () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-smoke-'));
  const args = [ROOT, '--no-sandbox', '--disable-gpu', '--user-data-dir=' + userData];
  const cmd = needX ? 'xvfb-run' : electron;
  const full = needX ? ['-a', '-s', '-screen 0 1600x1000x24', electron].concat(args) : args;
  const r = spawnSync(cmd, full, { encoding: 'utf8', timeout: 120000, env: Object.assign({}, process.env, { CVM_SMOKE: '1', ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }) });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('CVM_SMOKE '));
  assert.ok(line, 'çıktı yok: ' + (r.stdout || '') + String(r.stderr || '').slice(-2000));
  const o = JSON.parse(line.slice(10));
  console.log(o);
  const pkg = require('../package.json');
  assert.deepStrictEqual(o.errors, []);
  assert.strictEqual(o.fc, true, 'FC çekirdeği yüklü');
  assert.strictEqual(o.host, 'electron', 'fcHost tanındı');
  assert.strictEqual(o.api, true);
  assert.strictEqual(o.version, pkg.version);
  assert.strictEqual(o.appVersion, pkg.version);
  assert.strictEqual(o.topbar, true);
  assert.strictEqual(o.update, true, 'Güncelle düğmesi');
  assert.strictEqual(o.winBtns, 4, 'Küçült · Orta · Tam ekran · Kapat');
  assert.ok(o.sections > 0, 'düzenleyici kartları');
  assert.strictEqual(o.preview, true, 'CV önizlemesi');
  assert.strictEqual(o.scheme, 'falcon');
  assert.ok(o.schemes.includes('klasik'), 'klasik şema kayıtlı');
  assert.strictEqual(o.fullscreen, true, 'her açılışta tam ekran');
  assert.strictEqual(o.settings[o.settings.length - 1], 'contact', 'Admin ile iletişim en sonda: ' + o.settings.join(','));
  for (const k of ['look', 'cv-export', 'cv-data', 'usage', 'crash', 'about']) assert.ok(o.settings.includes(k), 'ayarlar kartı ' + k);
  assert.ok(o.pdfFonts.some((f) => /NotoSansArabic/.test(f)) && o.pdfFonts.some((f) => /^Inter/.test(f)), 'PDF\'e gömülü yazı tipleri: ' + o.pdfFonts);
  // 2.2: havacılık CV'si, analiz, çeviri, başvuru, ön yazı, JSON Resume / Europass, sürüm geçmişi, Ayarlar kartları
  assert.strictEqual(o.pro.ok, true, '2.2 senaryosu: ' + JSON.stringify(o.pro));
  for (const k of ['cv-ai', 'cv-privacy']) assert.ok(o.settings.includes(k), 'ayarlar kartı ' + k);
  assert.strictEqual(o.pdfMeta, true, 'PDF üst bilgisi');
  assert.strictEqual(o.ok, true);
});
