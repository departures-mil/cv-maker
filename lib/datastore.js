'use strict';
/*
 * Data safety: automatic backups, restore and import of data from the old
 * portable edition ("CV Maker Data" next to the .exe).
 *
 * Nothing in here ever deletes user records. Backups are only added, the old
 * portable folder is only read, and every restore/import first backs up the
 * current state.
 *
 * Layout of the data folder:
 *   cvs.json, settings.json, attachments/
 *   backups/<YYYY-MM-DD_HH-MM-SS>_<reason>/{cvs.json, settings.json, info.json}
 *   backups/attachments-removed/   (attachments no longer used by any CV)
 *   backups/legacy-portable_<stamp>/  (full copy of the imported portable folder)
 *
 * Pure Node (no electron) so it can be tested on its own.
 */
const fs = require('fs');
const path = require('path');

const REASONS = ['daily', 'start', 'before-update', 'before-restore', 'before-import', 'manual'];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
function pad(n) { return String(n).padStart(2, '0'); }
function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}
function copyDir(src, dst, { overwrite = false } = {}) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyDir(s, d, { overwrite });
    else if (e.isFile() && (overwrite || !fs.existsSync(d))) { fs.copyFileSync(s, d); n++; }
  }
  return n;
}

class DataStore {
  constructor(dataDir) {
    this.dir = dataDir;
    this.cvsFile = path.join(dataDir, 'cvs.json');
    this.settingsFile = path.join(dataDir, 'settings.json');
    this.attachDir = path.join(dataDir, 'attachments');
    this.backupDir = path.join(dataDir, 'backups');
    this.removedDir = path.join(this.backupDir, 'attachments-removed');
    fs.mkdirSync(this.attachDir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  loadCvs() { return readJson(this.cvsFile, null); }
  loadSettings() { return readJson(this.settingsFile, null); }
  saveCvs(data) { writeJsonAtomic(this.cvsFile, data); }
  saveSettings(data) { writeJsonAtomic(this.settingsFile, data); }

  /* ---------- backups ---------- */

  /** Copies cvs.json and settings.json into a new backup folder. Returns its name (or null if nothing to back up). */
  backup(reason = 'manual', extra = {}) {
    if (!fs.existsSync(this.cvsFile) && !fs.existsSync(this.settingsFile)) return null;
    let name = `${stamp()}_${REASONS.includes(reason) ? reason : 'manual'}`;
    let dir = path.join(this.backupDir, name);
    for (let i = 2; fs.existsSync(dir); i++) { dir = path.join(this.backupDir, `${name}-${i}`); }
    name = path.basename(dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of [this.cvsFile, this.settingsFile]) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, path.basename(f)));
    const cvs = readJson(this.cvsFile, null);
    fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify({
      date: new Date().toISOString(), reason, cvCount: (cvs && cvs.cvs && cvs.cvs.length) || 0,
      names: ((cvs && cvs.cvs) || []).map((c) => c.name || '').slice(0, 50), ...extra,
    }));
    return name;
  }

  /** One automatic backup per calendar day (taken at program start). */
  dailyBackup() {
    const today = stamp().slice(0, 10);
    const has = this.listBackups().some((b) => b.name.startsWith(today) && b.reason === 'daily');
    return has ? null : this.backup('daily');
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_/.test(e.name))
      .map((e) => {
        const info = readJson(path.join(this.backupDir, e.name, 'info.json'), {});
        const m = e.name.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_([a-z-]+?)(-\d+)?$/);
        return { name: e.name, reason: info.reason || (m ? m[1] : 'manual'), date: info.date || null, cvCount: info.cvCount ?? null, names: info.names || [] };
      })
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  }

  restoreBackup(name) {
    if (!/^[\w.-]+$/.test(name)) throw new Error('bad backup name');
    const src = path.join(this.backupDir, name);
    if (!fs.existsSync(path.join(src, 'cvs.json'))) throw new Error('backup not found');
    const safety = this.backup('before-restore', { restoring: name });
    fs.copyFileSync(path.join(src, 'cvs.json'), this.cvsFile);
    if (fs.existsSync(path.join(src, 'settings.json'))) fs.copyFileSync(path.join(src, 'settings.json'), this.settingsFile);
    // Bring back attachments that were moved aside since then.
    const data = readJson(this.cvsFile, { cvs: [] });
    for (const id of attachmentIds(data)) {
      const removed = path.join(this.removedDir, id);
      const target = path.join(this.attachDir, id);
      if (!fs.existsSync(target) && fs.existsSync(removed)) fs.copyFileSync(removed, target);
    }
    return { restored: name, safety };
  }

  /** Attachments not referenced any more are moved to backups/attachments-removed, never deleted. */
  gcAttachments(usedIds) {
    const used = new Set(usedIds);
    let moved = 0;
    for (const f of fs.readdirSync(this.attachDir)) {
      if (used.has(f)) continue;
      fs.mkdirSync(this.removedDir, { recursive: true });
      try { fs.renameSync(path.join(this.attachDir, f), path.join(this.removedDir, f)); moved++; } catch {}
    }
    return moved;
  }

  /* ---------- import of the old portable edition ---------- */

  /** True when the folder looks like a CV Maker data folder. */
  static isDataDir(dir) {
    return !!dir && fs.existsSync(path.join(dir, 'cvs.json'));
  }

  /**
   * Merges a legacy data folder into this one.
   *  - CVs are matched by id; for the same id the more recently edited one is kept,
   *    the other one stays available in the backups.
   *  - attachments are copied (never overwritten),
   *  - settings are taken from the legacy folder only if there are none here yet;
   *    custom templates are merged.
   *  - the whole legacy folder (without browser cache) is copied into backups.
   */
  importLegacy(legacyDir) {
    if (!DataStore.isDataDir(legacyDir)) throw new Error('not a CV Maker data folder');
    if (path.resolve(legacyDir) === path.resolve(this.dir)) throw new Error('same folder');
    const safety = this.backup('before-import', { source: legacyDir });

    // Full copy of the legacy folder (cache folders excluded) for safekeeping.
    const archive = path.join(this.backupDir, `legacy-portable_${stamp()}`);
    fs.mkdirSync(archive, { recursive: true });
    for (const e of fs.readdirSync(legacyDir, { withFileTypes: true })) {
      if (['chromium', 'app'].includes(e.name)) continue;
      const s = path.join(legacyDir, e.name);
      if (e.isDirectory()) copyDir(s, path.join(archive, e.name));
      else if (e.isFile()) fs.copyFileSync(s, path.join(archive, e.name));
    }

    const legacy = readJson(path.join(legacyDir, 'cvs.json'), { version: 1, cvs: [] });
    const current = this.loadCvs() || { version: 1, cvs: [] };
    const byId = new Map(current.cvs.map((c) => [c.id, c]));
    let added = 0, updated = 0, kept = 0;
    for (const cv of legacy.cvs || []) {
      const mine = byId.get(cv.id);
      if (!mine) { current.cvs.push(cv); byId.set(cv.id, cv); added++; }
      else if ((cv.updatedAt || 0) > (mine.updatedAt || 0)) {
        current.cvs[current.cvs.indexOf(mine)] = cv; byId.set(cv.id, cv); updated++;
      } else kept++;
    }
    const files = copyDir(path.join(legacyDir, 'attachments'), this.attachDir);
    this.saveCvs(current);

    const legacySettings = readJson(path.join(legacyDir, 'settings.json'), null);
    const mySettings = this.loadSettings();
    if (legacySettings) {
      if (!mySettings) this.saveSettings({ ...legacySettings, updateUrl: '' });
      else {
        const ids = new Set((mySettings.customTemplates || []).map((t) => t.id));
        const merged = [...(mySettings.customTemplates || []), ...(legacySettings.customTemplates || []).filter((t) => !ids.has(t.id))];
        this.saveSettings({ ...mySettings, customTemplates: merged });
      }
    }
    const result = { source: legacyDir, added, updated, kept, files, total: current.cvs.length, safety, archive: path.basename(archive), date: new Date().toISOString() };
    const log = readJson(path.join(this.dir, 'imports.json'), []);
    log.push(result);
    writeJsonAtomic(path.join(this.dir, 'imports.json'), log);
    return result;
  }

  /** Sources that were already imported (so the automatic import runs only once per folder). */
  importedSources() {
    return readJson(path.join(this.dir, 'imports.json'), []).map((r) => path.resolve(r.source).toLowerCase());
  }
}

function attachmentIds(data) {
  const ids = [];
  for (const cv of (data && data.cvs) || []) for (const s of cv.sections || []) for (const it of s.items || []) if (it.fileId) ids.push(it.fileId);
  return ids;
}

module.exports = { DataStore, readJson, writeJsonAtomic, stamp, copyDir, attachmentIds };
