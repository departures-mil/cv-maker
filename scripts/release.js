'use strict';
/*
 * One-command release:
 *   node scripts/release.js --notes "What changed"            (same notes for all languages)
 *   node scripts/release.js --tr "..." --en "..." --ar "..."
 *   node scripts/release.js --no-bump                         (rebuild/re-publish current version)
 *   node scripts/release.js --no-deploy                       (prepare files only)
 *
 * Steps: bump version 1.N -> 1.(N+1), build "CV Maker v1.(N+1).exe", publish it as a
 * GitHub release (departures-mil/cv-maker), write firebase/public/latest.json and deploy to
 * Firebase Hosting. Installed apps see latest.json and update with one click.
 *
 * Auth for deploy: FIREBASE_SERVICE_ACCOUNT (service account JSON text), GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_TOKEN.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const FB = path.join(ROOT, 'firebase');
const PUBLIC = path.join(FB, 'public');
const GITHUB_REPO = process.env.CVM_GITHUB_REPO || 'departures-mil/cv-maker';

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes('--' + name);

function projectId() {
  const rc = JSON.parse(fs.readFileSync(path.join(FB, '.firebaserc'), 'utf8'));
  const id = rc.projects && rc.projects.default;
  if (!id || id.includes('YOUR-PROJECT')) throw new Error('Set the Firebase project id in firebase/.firebaserc');
  return id;
}

function ensureUpdateConfig(id) {
  const file = path.join(ROOT, 'update-config.json');
  const cfg = { baseUrl: `https://${id}.web.app` };
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  return cfg.baseUrl;
}

function bump() {
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const [major, minor] = pkg.version.split('.').map(Number);
  pkg.version = `${major}.${minor + 1}.0`;
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
  delete require.cache[require.resolve(PKG)];
  return pkg.version;
}

function downloadPage(manifest) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CV Maker</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0f172a;color:#e2e8f0}
main{text-align:center;padding:24px}h1{font-size:40px;margin:0 0 8px}p{color:#94a3b8}
a{display:inline-block;margin-top:18px;padding:14px 26px;border-radius:10px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600}
</style></head><body><main><h1>CV Maker v${manifest.displayVersion}</h1>
<p>Windows · Portable / Taşınabilir / محمول</p>
<a href="${encodeURI(manifest.url)}">⬇ ${manifest.fileName}</a></main></body></html>`;
}

async function main() {
  const id = projectId();
  const baseUrl = ensureUpdateConfig(id);
  const version = flag('no-bump') ? require(PKG).version : bump();
  console.log(`Releasing ${version} to ${baseUrl}`);

  const { build } = require('./build');
  const { displayVersion, fileName, filePath } = await build();

  // The .exe lives on GitHub Releases (Firebase Spark does not allow executables);
  // Firebase Hosting only serves latest.json and the download page.
  const urlName = fileName.replace(/ /g, '-');
  const tag = `v${displayVersion}`;
  const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${urlName}`;
  const asset = path.join(path.dirname(filePath), urlName);
  fs.copyFileSync(filePath, asset);

  const buf = fs.readFileSync(filePath);
  const common = arg('notes');
  const manifest = {
    version,
    displayVersion,
    fileName,
    url: releaseUrl,
    size: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    date: new Date().toISOString(),
    notes: { tr: arg('tr') || common || '', en: arg('en') || common || '', ar: arg('ar') || common || '' },
  };
  fs.writeFileSync(path.join(PUBLIC, 'latest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(PUBLIC, 'index.html'), downloadPage(manifest));
  console.log('Manifest:', manifest);

  if (flag('no-deploy')) return console.log('Skipping deploy (--no-deploy).');
  const notesText = [manifest.notes.tr, manifest.notes.en !== manifest.notes.tr ? manifest.notes.en : '', manifest.notes.ar !== manifest.notes.tr ? manifest.notes.ar : ''].filter(Boolean).join('\n\n') || `CV Maker ${tag}`;
  // REST only (GraphQL-based `gh release` commands are not available everywhere).
  const rel = JSON.parse(execFileSync('gh', ['api', '--method', 'POST', `repos/${GITHUB_REPO}/releases`,
    '-f', `tag_name=${tag}`, '-f', `name=CV Maker ${tag}`, '-f', `body=${notesText}`, '-f', 'make_latest=true'], { encoding: 'utf8' }));
  execFileSync('gh', ['api', '--method', 'POST', '-H', 'Content-Type: application/octet-stream',
    `https://uploads.github.com/repos/${GITHUB_REPO}/releases/${rel.id}/assets?name=${encodeURIComponent(urlName)}`,
    '--input', asset], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 26 });
  console.log('GitHub release:', rel.html_url);

  const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'firebase.cmd' : 'firebase');
  const args = ['deploy', '--only', 'hosting', '--project', id, '--non-interactive', '--message', `CV Maker v${displayVersion}`];
  if (process.env.FIREBASE_TOKEN) args.push('--token', process.env.FIREBASE_TOKEN);
  const env = { ...process.env };
  let keyFile;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    keyFile = path.join(require('os').tmpdir(), `cvmaker-sa-${process.pid}.json`);
    fs.writeFileSync(keyFile, process.env.FIREBASE_SERVICE_ACCOUNT, { mode: 0o600 });
    env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
  }
  try {
    execFileSync(bin, args, { cwd: FB, stdio: 'inherit', env });
  } finally {
    if (keyFile) fs.unlinkSync(keyFile);
  }
  console.log(`\nPublished CV Maker v${displayVersion}: ${manifest.url}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
