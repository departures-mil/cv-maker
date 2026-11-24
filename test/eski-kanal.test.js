// KÖPRÜ testi: kurulu 2.0.5 programının kendi güncelleyicisi (test/fixtures/v2.0.5, değiştirilmeden) yeni latest.json'u okur.
//  1) reusable-release.yml'in yazdığı SPEC biçimi tek başına eski programı bozar (url yok) — bu yüzden eski alanlar eklenir.
//  2) tools/eski-kanal.js'in eklediği alanlarla eski program tam kurulumu indirir, SHA-256'yı doğrular, güncelleme öncesi
//     yedek alır ve kurulumu sessiz çalıştırır (/S --updated --force-run).
//  3) Aynı dosya ortak çekirdeğin güncelleyicisine (FC.updater.plan) hâlâ geçerli bir manifesttir.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { augment, check } = require('../tools/eski-kanal.js');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const setup = Buffer.from('MZ fake CV Maker setup 2.1.0 ' + 'x'.repeat(5000));
const asar = Buffer.from('fake app.asar');
// reusable-release.yml → ci/release-prep.js çıktısıyla aynı biçim (SPEC "Güncelleme manifesti")
const spec = {
  schema: 1, app: 'cv-maker', version: '2.1.0', published: '2026-11-24T12:00:00Z',
  notes: { tr: 'Yeni görünüm', en: 'New look', ar: 'مظهر جديد' }, minVersion: '1.0.0',
  assets: {
    'win-app': { file: 'CV-Maker-2.1.0-win-app.asar', size: asar.length, sha256: sha(asar), patches: {} },
    'win-setup': { file: 'CV-Maker-Setup-2.1.0.exe', size: setup.length, sha256: sha(setup), patches: {} },
  },
};
function runOld(manifest) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-eski-'));
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dir, 'setup.bin'), setup);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'eski-istemci.js'), path.join(dir, 'latest.json'), path.join(dir, 'home')], { encoding: 'utf8', timeout: 60000 });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('ESKI '));
  assert.ok(line, 'eski istemci çıktısı yok: ' + r.stdout + r.stderr);
  return JSON.parse(line.slice(5));
}

test('SPEC latest.json tek başına 2.0.5 güncelleyicisini bozar (köprü gerekli)', () => {
  const o = runOld(spec);
  assert.ok(o.check.ok && o.check.available, 'yeni sürümü görür');
  assert.ok(o.error || !o.download || !o.downloadedBytes, 'ama indiremez: ' + JSON.stringify(o.download));
  assert.deepStrictEqual(o.spawned, []);
});

test('köprü alanlarıyla 2.0.5 tam kurulumu indirip sessiz çalıştırır', () => {
  const m = augment(spec);
  assert.deepStrictEqual(check(m), []);
  const o = runOld(m);
  assert.ok(!o.error, o.error);
  assert.ok(o.check.ok && o.check.available);
  assert.strictEqual(o.check.manifest.displayVersion, '2.1.0', 'eski arayüz "CV Maker v2.1.0" gösterir');
  assert.strictEqual(o.check.manifest.notes.ar, 'مظهر جديد');
  assert.strictEqual(o.download.kind, 'installer');
  assert.strictEqual(o.downloadedBytes, setup.length, 'SHA-256 doğrulandı, dosya tam');
  assert.ok(o.fetched.includes('https://github.com/departures-mil/cv-maker/releases/download/v2.1.0/CV-Maker-Setup-2.1.0.exe'), o.fetched.join(' '));
  assert.deepStrictEqual(o.apply, { restarted: true });
  assert.deepStrictEqual(o.spawned, [['CV-Maker-Setup-2.1.0.exe', ['--updated', '/S', '--force-run']]]);
  assert.ok(o.backups.some((b) => /before-update/.test(b)), 'güncelleme öncesi yedek: ' + o.backups);
  assert.strictEqual(o.dataKept, 1, 'kullanıcı verisi yerinde');
});

test('köprü alanları çekirdeğin güncelleyicisini bozmaz', () => {
  require('../src/cekirdek/fc-core.js');
  const FC = globalThis.FC;
  const m = augment(spec);
  const o = { app: 'cv-maker', repo: 'cv-maker', channel: 'win-app', setupChannel: 'win-setup' };
  const p = FC.updater.plan(m, Object.assign({ version: '2.0.5' }, o));
  assert.strictEqual(p.version, '2.1.0');
  assert.strictEqual(p.channel, 'win-app');
  assert.strictEqual(p.mode, 'full');
  assert.strictEqual(p.url, 'https://github.com/departures-mil/cv-maker/releases/download/v2.1.0/CV-Maker-2.1.0-win-app.asar');
  assert.strictEqual(FC.updater.plan(m, Object.assign({ version: '2.1.0' }, o)), null, 'aynı sürüm → güncel');
  m.assets['win-app'].patches['2.1.0'] = { file: 'p.bin', size: 3, sha256: 'a'.repeat(64) };
  assert.strictEqual(FC.updater.plan(augment(Object.assign({}, m, { version: '2.1.1' })), Object.assign({ version: '2.1.0' }, o)).mode, 'patch');
});

test('eksik win-setup kanalında araç hata verir (yanlış manifest yayınlanmaz)', () => {
  assert.throws(() => augment(Object.assign({}, spec, { assets: { 'win-app': spec.assets['win-app'] } })), /win-setup/);
  assert.throws(() => augment({ version: '2.1.0' }), /SPEC/);
});
