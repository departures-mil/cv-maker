'use strict';
/*
 * Prepares the files of a GitHub release (departures-mil/cv-maker) in dist/release:
 *   latest.json                     what installed programs read at start
 *                                   (https://github.com/<repo>/releases/latest/download/latest.json)
 *   bundle-<version>.json.gz        small update (only the app's own files)
 *   CV-Maker-Setup-<version>.exe    full installer
 *
 *   node scripts/release.js                  build installer + bundle
 *   node scripts/release.js --no-installer   bundle only (for local checks; the manifest then has no installer)
 *
 * Publishing is done by .github/workflows/release.yml (gh release create v<version> dist/release/*).
 * Release notes: release-notes.json  { "<version>": { "tr": "...", "en": "...", "ar": "..." } }
 * package.json "cvmaker.minShell": oldest installed program (shell) that may take this
 * release as a small bundle. Raise it to the new version whenever Electron or an npm
 * dependency changes, so that those programs get the full installer instead.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'release');
const flag = (name) => process.argv.includes('--' + name);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
const [major, minor] = version.split('.');
const displayVersion = `${major}.${minor}`;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const REPO = (pkg.cvmaker && pkg.cvmaker.githubRepo) || 'departures-mil/cv-maker';
const abs = (file) => `https://github.com/${REPO}/releases/download/v${version}/${file}`;

// Files that make up a bundle update (everything except node_modules).
const BUNDLE_ENTRIES = ['boot.js', 'main.js', 'preload.js', 'package.json', 'update-config.json', 'build/icon.png', 'lib', 'src'];

function collect(rel, out) {
  const full = path.join(ROOT, rel);
  if (fs.statSync(full).isDirectory()) {
    for (const f of fs.readdirSync(full)) collect(path.posix.join(rel, f), out);
  } else if (!rel.endsWith('.map')) {
    out[rel] = fs.readFileSync(full).toString('base64');
  }
}

function buildBundle() {
  const files = {};
  for (const e of BUNDLE_ENTRIES) collect(e, files);
  return zlib.gzipSync(Buffer.from(JSON.stringify({ files })), { level: 9 });
}

function notes() {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-notes.json'), 'utf8'));
  const n = all[version] || {};
  return { tr: n.tr || '', en: n.en || n.tr || '', ar: n.ar || n.en || n.tr || '' };
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const gz = buildBundle();
  const bundleRel = `bundle-${version}.json.gz`;
  fs.writeFileSync(path.join(OUT, bundleRel), gz);

  const manifest = {
    version,
    displayVersion,
    date: new Date().toISOString(),
    notes: notes(),
    bundle: { url: abs(bundleRel), size: gz.length, sha256: sha256(gz), minShell: (pkg.cvmaker && pkg.cvmaker.minShell) || version },
  };

  if (!flag('no-installer')) {
    const { build } = require('./build');
    const { fileName, filePath } = await build();
    const buf = fs.readFileSync(filePath);
    const rel = fileName;
    fs.copyFileSync(filePath, path.join(OUT, rel));
    manifest.installer = { fileName, url: abs(rel), size: buf.length, sha256: sha256(buf) };
    // Fields read by programs older than 2.0 when they cannot use the bundle.
    Object.assign(manifest, { fileName, url: abs(rel), size: buf.length, sha256: manifest.installer.sha256 });
  }

  fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(manifest, null, 2));
  // Release text (Turkish first) for the GitHub release page.
  fs.writeFileSync(path.join(ROOT, 'dist', 'release-notes.md'), [manifest.notes.tr, manifest.notes.en, manifest.notes.ar].filter(Boolean).join('\n\n') + '\n');
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => { console.error(e.stack || e); process.exit(1); });
