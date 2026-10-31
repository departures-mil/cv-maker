'use strict';
/*
 * One-command release (run from a clone of departures-mil/cv-maker):
 *   node scripts/release.js --notes "What changed"            (same notes for all languages)
 *   node scripts/release.js --tr "..." --en "..." --ar "..."
 *   node scripts/release.js --no-bump                         (re-publish latest.json for the current version)
 *
 * Steps:
 *   1. bump version 1.N -> 1.(N+1) and write release-notes.md
 *   2. commit + push to main; the GitHub workflow builds "CV Maker v1.(N+1).exe"
 *      and publishes it as a GitHub release (Firebase Spark does not allow .exe files)
 *   3. wait for the release asset, write firebase/public/latest.json + index.html
 *   4. deploy them to Firebase Hosting; installed apps then offer a one-click update
 *
 * Needs: git push access, `gh` for REST reads, and Google credentials for Firebase
 * (GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT or `gcloud auth application-default login`).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const FB = path.join(ROOT, 'firebase');
const PUBLIC = path.join(FB, 'public');
const GITHUB_REPO = process.env.CVM_GITHUB_REPO || 'departures-mil/cv-maker';
const ADC = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes('--' + name);
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function projectId() {
  const rc = JSON.parse(fs.readFileSync(path.join(FB, '.firebaserc'), 'utf8'));
  return rc.projects.default;
}

function readPkg() { return JSON.parse(fs.readFileSync(PKG, 'utf8')); }
function bump() {
  const pkg = readPkg();
  const [major, minor] = pkg.version.split('.').map(Number);
  pkg.version = `${major}.${minor + 1}.0`;
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
  return pkg.version;
}

function downloadPage(m) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CV Maker</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0f172a;color:#e2e8f0}
main{text-align:center;padding:24px}h1{font-size:40px;margin:0 0 8px}p{color:#94a3b8}
a{display:inline-block;margin-top:18px;padding:14px 26px;border-radius:10px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600}
</style></head><body><main><h1>CV Maker v${m.displayVersion}</h1>
<p>Windows · Portable / Taşınabilir / محمول</p>
<a href="${encodeURI(m.url)}">⬇ ${m.fileName}</a></main></body></html>`;
}

async function waitForAsset(tag, name) {
  for (let i = 0; i < 90; i++) {
    try {
      const rel = JSON.parse(sh('gh', ['api', `repos/${GITHUB_REPO}/releases/tags/${tag}`], { stdio: ['ignore', 'pipe', 'ignore'] }));
      const a = (rel.assets || []).find((x) => x.name === name && x.state === 'uploaded');
      if (a) return a;
    } catch {}
    if (i % 6 === 0) console.log(`Waiting for GitHub to build ${tag}…`);
    await sleep(10000);
  }
  throw new Error(`Release ${tag} did not appear; check https://github.com/${GITHUB_REPO}/actions`);
}

async function main() {
  const common = arg('notes');
  const notes = { tr: arg('tr') || common || '', en: arg('en') || common || '', ar: arg('ar') || common || '' };
  const version = flag('no-bump') ? readPkg().version : bump();
  const [major, minor] = version.split('.');
  const displayVersion = `${major}.${minor}`;
  const tag = `v${displayVersion}`;
  const fileName = `CV Maker v${displayVersion}.exe`;
  const urlName = fileName.replace(/ /g, '-');

  if (!flag('no-bump')) {
    fs.writeFileSync(path.join(ROOT, 'release-notes.md'), [notes.tr, notes.en, notes.ar].filter((x, i, a) => x && a.indexOf(x) === i).join('\n\n') || `CV Maker ${tag}`);
    sh('git', ['add', 'package.json', 'release-notes.md']);
    sh('git', ['commit', '-m', `Release CV Maker ${tag}`]);
    sh('git', ['push', 'origin', 'HEAD:main'], { stdio: 'inherit' });
  }

  const asset = await waitForAsset(tag, urlName);
  const tmp = path.join(os.tmpdir(), urlName);
  sh('curl', ['-sSL', '--fail', '-o', tmp, asset.browser_download_url]);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);

  const manifest = {
    version, displayVersion, fileName,
    url: asset.browser_download_url,
    size: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    date: new Date().toISOString(),
    notes,
  };
  fs.mkdirSync(PUBLIC, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC, 'latest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(PUBLIC, 'index.html'), downloadPage(manifest));
  console.log('Manifest:', manifest);

  const env = { ...process.env };
  let keyFile;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    keyFile = path.join(os.tmpdir(), `cvmaker-sa-${process.pid}.json`);
    fs.writeFileSync(keyFile, process.env.FIREBASE_SERVICE_ACCOUNT, { mode: 0o600 });
    env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;
  } else if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIREBASE_TOKEN && fs.existsSync(ADC)) {
    env.GOOGLE_APPLICATION_CREDENTIALS = ADC;
  }
  const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'firebase.cmd' : 'firebase');
  const args = ['deploy', '--only', 'hosting', '--project', projectId(), '--non-interactive', '--message', `CV Maker ${tag}`];
  if (env.FIREBASE_TOKEN) args.push('--token', env.FIREBASE_TOKEN);
  try {
    execFileSync(bin, args, { cwd: FB, stdio: 'inherit', env });
  } finally {
    if (keyFile) fs.unlinkSync(keyFile);
  }
  try {
    sh('git', ['add', 'firebase/public']);
    sh('git', ['commit', '-m', `Publish update manifest for CV Maker ${tag}`]);
    sh('git', ['push', 'origin', 'HEAD:main']);
  } catch {}
  console.log(`\nPublished CV Maker ${tag}: ${manifest.url}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
