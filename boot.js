'use strict';
/*
 * Entry point. The .exe ships a full copy of the app, but small "bundle" updates
 * (only the app's own files, a few hundred KB) are unpacked into
 * "CV Maker Data/app/<version>/" and started from there when they are newer
 * than the copy inside the .exe. Heavy dependencies stay inside the .exe.
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const BASE = __dirname;
global.__CVM_BASE = BASE;

function cmp(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function dataDir() {
  const portable = process.env.PORTABLE_EXECUTABLE_DIR;
  return portable ? path.join(portable, 'CV Maker Data') : path.join(app.getPath('userData'), 'data');
}

function pickBundle() {
  try {
    const appDir = path.join(dataDir(), 'app');
    const curFile = path.join(appDir, 'current.json');
    const cur = JSON.parse(fs.readFileSync(curFile, 'utf8'));
    const shellVersion = JSON.parse(fs.readFileSync(path.join(BASE, 'package.json'), 'utf8')).version;
    if (!cur || !cur.version || cmp(cur.version, shellVersion) <= 0) return null;
    const dir = path.join(appDir, String(cur.version));
    if (!fs.existsSync(path.join(dir, 'main.js'))) return null;
    // A bundle that failed to open a window three times in a row is skipped.
    if (!cur.ok && (cur.tries || 0) >= 3) return null;
    if (!cur.ok) {
      cur.tries = (cur.tries || 0) + 1;
      fs.writeFileSync(curFile, JSON.stringify(cur));
    }
    global.__CVM_MARK_OK = () => {
      try { if (!cur.ok) { cur.ok = true; cur.tries = 0; fs.writeFileSync(curFile, JSON.stringify(cur)); } } catch {}
    };
    return dir;
  } catch {
    return null;
  }
}

const bundleDir = pickBundle();
if (bundleDir) {
  // Let the bundle find npm packages (docx, pdf-lib, …) inside the .exe.
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, ...rest) {
    try {
      return origResolve.call(this, request, parent, ...rest);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' || request.startsWith('.') || path.isAbsolute(request)) throw e;
      return origResolve.call(this, request, { id: BASE, filename: path.join(BASE, 'boot.js'), paths: Module._nodeModulePaths(BASE) }, ...rest);
    }
  };
  global.__CVM_BUNDLE = bundleDir;
  try {
    require(path.join(bundleDir, 'main.js'));
  } catch (e) {
    try { fs.appendFileSync(path.join(dataDir(), 'update.log'), `${new Date().toISOString()} bundle failed: ${e.stack || e}\n`); } catch {}
    global.__CVM_BUNDLE = null;
    try {
      const curFile = path.join(dataDir(), 'app', 'current.json');
      const cur = JSON.parse(fs.readFileSync(curFile, 'utf8'));
      cur.tries = 99;
      fs.writeFileSync(curFile, JSON.stringify(cur));
    } catch {}
    require('./main.js');
  }
} else {
  require('./main.js');
}
