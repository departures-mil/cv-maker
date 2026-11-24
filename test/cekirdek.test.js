// Ortak çekirdek entegrasyonu: kopyalanan çekirdek, klasik şema, sayfa yükleme sırası, paket/kurulum ayarları, CI iş akışı.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = require('../package.json');

// ortak-cekirdek/web/tools/schemes.js → TOKENS (her şema hepsini tanımlar)
const TOKENS = ['bg', 'bg-grid', 'panel', 'panel-solid', 'panel-hover', 'border', 'border-strong', 'border-w', 'text', 'muted', 'label', 'nav-text', 'nav-title',
  'accent', 'accent-2', 'on-accent', 'primary-1', 'primary-2', 'active-1', 'active-2', 'active-line', 'accent-soft', 'accent-line', 'focus', 'focus-w', 'focus-ring',
  'danger', 'warn', 'ok', 'ok-text', 'danger-text', 'warn-text', 'ok-soft', 'ok-line', 'danger-soft', 'danger-line', 'warn-soft', 'warn-line',
  'sidebar-bg', 'topbar-bg', 'modal-bg', 'modal-border', 'backdrop', 'toast-bg', 'toast-text', 'toast-line', 'toast-err-bg', 'toast-err-text', 'toast-err-line',
  'badge-text', 'badge-bg', 'badge-line', 'on-badge', 'bar-track', 'scroll-thumb', 'glow-1', 'glow-2', 'shadow-pop', 'shadow-modal', 'shadow-toast'];

test('çekirdek kopyası: VERSION, dosyalar, sürüm', () => {
  const v = read('cekirdek/VERSION');
  assert.match(v, /^ortak-cekirdek [0-9a-f]{40}\n/);
  assert.strictEqual(read('src/cekirdek/VERSION'), v, 'ana süreç ve arayüz çekirdeği aynı commit');
  for (const f of ['cekirdek/electron/fc-electron-main.js', 'cekirdek/electron/fc-preload.js', 'cekirdek/electron/fcd1.js', 'src/cekirdek/fc-core.js', 'src/cekirdek/css/tokens.css', 'src/cekirdek/css/core.css',
    'src/cekirdek/fonts/noto-sans-arabic-arabic-400-normal.woff2', 'src/cekirdek/fonts/inter-latin-400-normal.woff2']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  require('../src/cekirdek/fc-core.js');
  assert.ok(globalThis.FC && globalThis.FC.updater && globalThis.FC.settings && globalThis.FC.contact && globalThis.FC.crash);
});

test('klasik şema: 2.0.x renkleri, her token açık + koyu', () => {
  let got = null;
  const ctx = { FC: { ui: { icons: {} }, look: { registerScheme: (id, def) => { got = { id, def }; } } }, window: { addEventListener() {} } };
  vm.runInNewContext(read('src/kabuk.js'), ctx);
  assert.strictEqual(got.id, 'klasik');
  for (const mode of ['light', 'dark']) for (const k of TOKENS) assert.ok(got.def[mode]['--' + k], `${mode} --${k}`);
  assert.strictEqual(got.def.light['--bg'], '#eef1f6', 'eski açık zemin');
  assert.strictEqual(got.def.dark['--bg'], '#0b1220', 'eski koyu zemin');
  assert.strictEqual(got.def.light['--accent'], '#2563eb', 'eski ana renk');
  for (const mode of ['light', 'dark']) assert.match(got.def[mode]['--active-1'], /^#[0-9a-f]{8}$/i, '--active-1 yarı saydam (etkin dil düğmesi okunur)');
  assert.ok(got.def.light.label === undefined && got.def.label.ar, 'etiket üç dilde');
  assert.ok(ctx.window.Kabuk && ctx.window.Kabuk.start && ctx.window.Kabuk.openSettings);
});

test('index.html: çekirdek CSS uygulamanınkinden, fc-core.js app.js\'ten önce; eski betikler yok', () => {
  const html = read('src/index.html');
  const i = (s) => { const k = html.indexOf(s); assert.ok(k > 0, s); return k; };
  assert.ok(i('cekirdek/css/tokens.css') < i('cekirdek/css/core.css') && i('cekirdek/css/core.css') < i('styles.css'));
  assert.ok(i('cekirdek/fc-core.js') < i('kabuk.js') && i('kabuk.js') < i('src="app.js"'));
  for (const old of ['duyuru.js', 'kullanim.js', 'lang-select', 'btn-min', 'update-banner']) assert.ok(!html.includes(old), old);
  assert.match(html, /connect-src[^"]*https:\/\/firestore\.googleapis\.com/, 'iletişim/çökme gelen kutusu CSP\'de');
  const app = read('src/app.js');
  for (const old of ['api.checkUpdate', 'api.sendContact', 'api.minimize', 'renderUpdateBanner']) assert.ok(!app.includes(old), old);
});

test('package.json: ad/veri yeri değişmedi, semver, NSIS tek tık + kullanıcı başına + tr/en/ar, çekirdek pakette', () => {
  assert.strictEqual(pkg.name, 'cv-maker');
  assert.strictEqual(pkg.productName, 'CV Maker');
  assert.strictEqual(pkg.build.appId, 'com.cvmaker.desktop');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(pkg.main, 'main.js');
  const n = pkg.build.nsis;
  assert.strictEqual(n.oneClick, true);
  assert.strictEqual(n.perMachine, false);
  assert.strictEqual(n.deleteAppDataOnUninstall, false);
  assert.deepStrictEqual(n.installerLanguages, ['tr_TR', 'en_US', 'ar_SA']);
  assert.strictEqual(pkg.build.win.icon, 'build/icon.ico');
  assert.notStrictEqual(pkg.build.win.signAndEditExecutable, false, 'exe simgesi uygulamanın .ico\'su');
  for (const f of ['main.js', 'preload.js', 'lib/**', 'src/**', 'cekirdek/**', 'release-notes.json']) assert.ok(pkg.build.files.includes(f), f);
  assert.ok(!pkg.build.files.some((f) => /^test|fixtures/.test(f)));
  const notes = require('../release-notes.json')[pkg.version];
  assert.ok(notes && notes.tr && notes.en && notes.ar, 'bu sürümün tr/en/ar notu');
});

test('release.yml: test → build → ortak reusable-release, tam vX.Y.Z başlık, eski kanal köprüsü', () => {
  const y = read('.github/workflows/release.yml');
  assert.match(y, /build:\s*\n\s*needs: test/);
  assert.match(y, /needs: \[test, build\]/);
  assert.match(y, /uses: departures-mil\/ortak-cekirdek\/\.github\/workflows\/reusable-release\.yml@main/);
  assert.match(y, /core_ref: main/);
  assert.match(y, /release_title: CV Maker v\$\{\{ needs\.build\.outputs\.version \}\}/, 'başlıkta tam sürüm');
  assert.match(y, /win-app=app\.asar/);
  assert.match(y, /win-setup=\*Setup\*\.exe/);
  assert.match(y, /tools\/eski-kanal\.js latest\.json/);
  assert.match(y, /CSC_IDENTITY_AUTO_DISCOVERY/);
});
