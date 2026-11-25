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
 *   history/<cvId>/<stamp>.json   (2.2: per-CV version history; photos stored once in history/photos/<sha1>.txt)
 *   security.json                 (2.2: {encrypt:true} → cvs.json and history are encrypted with the OS key store)
 *
 * Encryption (optional): cvs.json becomes {"enc":"os","v":1,"data":"<base64>"}; the cipher (Electron safeStorage =
 * Windows DPAPI, bound to the Windows user account) is injected so this file stays pure Node and testable.
 * If an encrypted file cannot be decrypted, nothing is ever written over it (saveCvs throws).
 *
 * Pure Node (no electron) so it can be tested on its own.
 */
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const REASONS = ['daily', 'start', 'before-update', 'before-restore', 'before-import', 'manual', 'security'];

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
  /** @param cipher optional {available(): bool, encrypt(Buffer): Buffer, decrypt(Buffer): Buffer} */
  constructor(dataDir, cipher = null) {
    this.dir = dataDir;
    this.cipher = cipher;
    this.loadError = null;
    this.historyDir = path.join(dataDir, 'history');
    this.securityFile = path.join(dataDir, 'security.json');
    this.cvsFile = path.join(dataDir, 'cvs.json');
    this.settingsFile = path.join(dataDir, 'settings.json');
    this.attachDir = path.join(dataDir, 'attachments');
    this.backupDir = path.join(dataDir, 'backups');
    this.removedDir = path.join(this.backupDir, 'attachments-removed');
    fs.mkdirSync(this.attachDir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  /* ---------- encryption ---------- */
  encryptionOn() { return !!readJson(this.securityFile, {}).encrypt; }
  encryptionAvailable() { try { return !!(this.cipher && this.cipher.available()); } catch { return false; } }
  /** Wraps data for writing (encrypted if switched on). */
  seal(data) {
    if (!this.encryptionOn()) return data;
    if (!this.encryptionAvailable()) throw new Error('encryption unavailable');
    return { enc: 'os', v: 1, data: this.cipher.encrypt(Buffer.from(JSON.stringify(data), 'utf8')).toString('base64') };
  }
  /** Reads plain or encrypted JSON; throws when encrypted data cannot be opened. */
  open(raw) {
    if (!raw || raw.enc !== 'os') return raw;
    if (!this.cipher) throw new Error('encrypted data, no cipher');
    return JSON.parse(this.cipher.decrypt(Buffer.from(raw.data, 'base64')).toString('utf8'));
  }
  readSealed(file, fallback) {
    const raw = readJson(file, undefined);
    if (raw === undefined) return fallback;
    return this.open(raw);
  }

  loadCvs() {
    try {
      const d = this.readSealed(this.cvsFile, null);
      this.loadError = null;
      return d;
    } catch (e) {
      this.loadError = 'decrypt';
      return null;
    }
  }
  loadSettings() { return readJson(this.settingsFile, null); }
  saveCvs(data) {
    if (this.loadError) throw new Error('data could not be opened; refusing to overwrite');
    writeJsonAtomic(this.cvsFile, this.seal(data));
  }
  /** Turns encryption on/off and rewrites cvs.json and the version history in the new form (a backup is taken first). */
  setEncryption(on) {
    if (on && !this.encryptionAvailable()) throw new Error('encryption unavailable');
    const data = this.loadCvs();
    if (this.loadError) throw new Error('data could not be opened');
    const history = this.listAllHistoryFiles().map((f) => ({ f, d: this.readSealed(f, null) }));
    this.backup('security', { encrypt: !!on });
    writeJsonAtomic(this.securityFile, { encrypt: !!on, changed: new Date().toISOString() });
    if (data) writeJsonAtomic(this.cvsFile, this.seal(data));
    for (const h of history) if (h.d) writeJsonAtomic(h.f, this.seal(h.d));
    return { encrypt: !!on };
  }
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
    for (const f of [this.cvsFile, this.settingsFile, this.securityFile]) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, path.basename(f)));
    let cvs = null;
    try { cvs = this.readSealed(this.cvsFile, null); } catch { }
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
    // A backup keeps the encryption state it was taken with (older backups have no security.json → plain).
    const raw = readJson(this.cvsFile, {});
    if (raw && raw.enc === 'os') writeJsonAtomic(this.securityFile, { encrypt: true, changed: new Date().toISOString() });
    else if (this.encryptionOn()) {
      writeJsonAtomic(this.securityFile, { encrypt: true, changed: new Date().toISOString() });
      if (this.encryptionAvailable()) writeJsonAtomic(this.cvsFile, this.seal(raw));
    }
    this.loadError = null;
    // Bring back attachments that were moved aside since then.
    let data = { cvs: [] };
    try { data = this.readSealed(this.cvsFile, { cvs: [] }); } catch { this.loadError = 'decrypt'; }
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

  /* ---------- version history (per CV) ---------- */

  historyFolder(cvId) {
    if (!/^[\w-]+$/.test(String(cvId))) throw new Error('bad cv id');
    return path.join(this.historyDir, cvId);
  }
  listAllHistoryFiles() {
    if (!fs.existsSync(this.historyDir)) return [];
    const out = [];
    for (const d of fs.readdirSync(this.historyDir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === 'photos') continue;
      for (const f of fs.readdirSync(path.join(this.historyDir, d.name))) if (f.endsWith('.json')) out.push(path.join(this.historyDir, d.name, f));
    }
    return out;
  }
  /** Stores a snapshot of one CV unless it equals the latest one. The photo is kept once per content (sha1). */
  snapshot(cv, now = new Date()) {
    const dir = this.historyFolder(cv.id);
    fs.mkdirSync(dir, { recursive: true });
    const copy = JSON.parse(JSON.stringify(cv));
    for (const key of ['data', 'original']) {
      const v = copy.photo && copy.photo[key];
      if (v && v.length > 200) {
        const sha = crypto.createHash('sha1').update(v).digest('hex');
        const pf = path.join(this.historyDir, 'photos', sha + '.txt');
        if (!fs.existsSync(pf)) { fs.mkdirSync(path.dirname(pf), { recursive: true }); fs.writeFileSync(pf, v); }
        copy.photo[key] = 'sha1:' + sha;
      }
    }
    const hash = crypto.createHash('sha1').update(JSON.stringify({ ...copy, updatedAt: 0 })).digest('hex');
    const list = this.listHistory(cv.id);
    if (list.length && list[0].hash === hash) return null;
    let name = stamp(now);
    for (let i = 2; fs.existsSync(path.join(dir, name + '.json')); i++) name = `${stamp(now)}-${i}`;
    writeJsonAtomic(path.join(dir, name + '.json'), this.seal({ hash, date: now.toISOString(), cv: copy }));
    this.thinHistory(cv.id, now);
    return name;
  }
  listHistory(cvId) {
    const dir = this.historyFolder(cvId);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse().map((f) => {
      let d = null;
      try { d = this.readSealed(path.join(dir, f), null); } catch { }
      const cv = d && d.cv;
      return {
        name: f.replace(/\.json$/, ''), date: d && d.date, hash: d && d.hash,
        cvName: cv && cv.name, sections: cv ? cv.sections.filter((s) => s.visible !== false).length : 0,
        items: cv ? cv.sections.reduce((a, s) => a + s.items.length, 0) : 0,
      };
    });
  }
  readHistory(cvId, name) {
    if (!/^[\w-]+$/.test(name)) throw new Error('bad name');
    const d = this.readSealed(path.join(this.historyFolder(cvId), name + '.json'), null);
    if (!d) throw new Error('not found');
    const cv = d.cv;
    for (const key of ['data', 'original']) {
      const v = cv.photo && cv.photo[key];
      if (typeof v === 'string' && v.startsWith('sha1:')) {
        try { cv.photo[key] = fs.readFileSync(path.join(this.historyDir, 'photos', v.slice(5) + '.txt'), 'utf8'); } catch { cv.photo[key] = ''; }
      }
    }
    return cv;
  }
  /** Keeps every snapshot of the last 7 days, one per day up to 90 days, one per week after that. */
  thinHistory(cvId, now = new Date()) {
    const dir = this.historyFolder(cvId);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
    const seen = new Set();
    let removed = 0;
    for (const f of files) {
      const m = f.match(/^(\d{4})-(\d{2})-(\d{2})_/);
      if (!m) continue;
      const day = new Date(+m[1], +m[2] - 1, +m[3]);
      const age = (now - day) / 86400000;
      if (age <= 7) continue;
      const key = age <= 90 ? f.slice(0, 10) : `w${Math.floor(day.getTime() / (7 * 86400000))}`;
      if (seen.has(key)) { try { fs.unlinkSync(path.join(dir, f)); removed++; } catch { } } else seen.add(key);
    }
    return removed;
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
