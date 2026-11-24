#!/usr/bin/env node
// ESKİ GÜNCELLEME KANALI (köprü) — kurulu 2.0.x programları için latest.json'a eski alanları ekler.
//
// 2.0.x ne yapar (lib/updater.js + main.js update:*, v2.0.5): açılışta
//   https://github.com/departures-mil/cv-maker/releases/latest/download/latest.json
// okur; "version" kendi sürümünden büyükse "bundle" (yalnız program dosyaları; boot.js açar) ya da "installer"
// (fileName, url, size, sha256) indirir, SHA-256'yı denetler ve kurulumu sessiz çalıştırır (/S --updated --force-run).
// 1.x taşınabilir kopyalar üst düzeydeki fileName/url/size/sha256'yı okur.
// Ortak çekirdeğin reusable-release.yml'i SPEC biçiminde latest.json yazar (schema, app, assets.<kanal>…) ve bu alanları
// içermez → 2.0.x "url" bulamaz. Bu araç aynı dosyaya, çekirdeğin okumadığı eski alanları ekler:
//   installer = assets["win-setup"] (tam kurulum), displayVersion = tam sürüm, date, fileName/url/size/sha256 (1.x için).
// "bundle" EKLENMEZ: 2.1.0+ eski kabukta çalışacak biçimde paketlenmez; eski programlar bir kez tam kurulumu alır,
// sonrası çekirdeğin yama güncellemesidir. Verileri (%APPDATA%\CV Maker\data) kurulum değiştirmez.
//
//   node tools/eski-kanal.js latest.json [owner/repo]   dosyayı yerinde günceller (release.yml → legacy işi, her sürümde)
//   node tools/eski-kanal.js --check latest.json         eski alanlar tutarlı mı (çıkış 1 = değil)
'use strict';
const fs = require('fs');

function augment(m, repo) {
  repo = repo || 'departures-mil/cv-maker';
  if (!m || m.schema !== 1 || !/^\d+\.\d+\.\d+$/.test(m.version || '')) throw new Error('latest.json SPEC biçiminde değil');
  const a = m.assets && m.assets['win-setup'];
  if (!a || !a.file || !/^[0-9a-f]{64}$/i.test(a.sha256 || '') || !(a.size > 0)) throw new Error('latest.json: assets["win-setup"] yok');
  const url = `https://github.com/${repo}/releases/download/v${m.version}/${encodeURIComponent(a.file)}`;
  const installer = { fileName: a.file, url, size: a.size, sha256: a.sha256.toLowerCase() };
  return Object.assign({}, m, {
    displayVersion: m.version,
    date: m.published || new Date().toISOString(),
    installer,
    fileName: installer.fileName, url: installer.url, size: installer.size, sha256: installer.sha256,
  });
}

function check(m) {
  const errs = [];
  const a = m.assets && m.assets['win-setup'];
  if (!m.installer) errs.push('installer yok');
  else if (!a || m.installer.fileName !== a.file || m.installer.size !== a.size || m.installer.sha256 !== a.sha256) errs.push('installer ≠ assets.win-setup');
  if (m.bundle) errs.push('bundle olmamalı');
  if (m.url !== (m.installer && m.installer.url)) errs.push('üst düzey url ≠ installer.url');
  return errs;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const errs = check(JSON.parse(fs.readFileSync(args[1], 'utf8')));
    if (errs.length) { console.error('eski-kanal: ' + errs.join('; ')); process.exit(1); }
    console.log('eski-kanal: tamam');
  } else {
    const file = args[0] || 'latest.json';
    const out = augment(JSON.parse(fs.readFileSync(file, 'utf8')), args[1]);
    fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
    console.log(`eski-kanal: ${file} → installer ${out.installer.fileName} (${(out.installer.size / 1048576).toFixed(1)} MB)`);
  }
}
module.exports = { augment, check };
