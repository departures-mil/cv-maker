'use strict';
/*
 * Two-way sync of the CV records with a private GitHub repository.
 *
 *   <owner>/<repo>  (private, created automatically on first sync)
 *     cvs.json                { version, cvs: [...], deleted: { <cvId>: <time> } }
 *     attachments/<fileId>    attached documents/photos (never changed once written)
 *
 * Merge rules
 *  - CVs are matched by id; the one edited more recently (updatedAt) wins.
 *  - A CV deleted on one computer is written down in "deleted" and removed on the
 *    others, unless it was edited somewhere after it was deleted.
 *  - Attachments are only added, never removed from the repository.
 * Before the local records are changed, beforeLocalWrite() is called (the program takes a backup).
 *
 * Pure Node: `fetch` is passed in so it can be tested without GitHub.
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.github.com';
const DATA_FILE = 'cvs.json';
const ATTACH_PREFIX = 'attachments/';

class SyncError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function client(fetchFn, token) {
  async function call(method, url, body, accept) {
    const res = await fetchFn(url.startsWith('http') ? url : API + url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept || 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CV-Maker',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (res.status === 401) throw new SyncError('auth');
    if (res.status === 403 && res.headers && res.headers.get && res.headers.get('x-ratelimit-remaining') === '0') throw new SyncError('rate');
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
  }
  return call;
}

/** Merges local and remote records. Returns the merged lists and what changed. */
function merge({ local, remote, deleted, known, lastSync, now }) {
  const tomb = { ...(deleted || {}) };
  const L = new Map(local.map((c) => [c.id, c]));
  const R = new Map(remote.map((c) => [c.id, c]));
  const knownSet = new Set(known || []);
  const ts = (c) => (c && (c.updatedAt || c.createdAt)) || 0;

  // Deleted here since the last sync.
  for (const id of knownSet) {
    if (L.has(id) || tomb[id]) continue;
    const r = R.get(id);
    if (r && ts(r) > (lastSync || 0)) continue; // edited elsewhere after our last sync: keep it
    tomb[id] = now;
  }

  const order = [...local.map((c) => c.id), ...remote.map((c) => c.id).filter((id) => !L.has(id))];
  const merged = [];
  const stats = { received: 0, sent: 0, removedHere: 0, removedThere: 0 };
  for (const id of order) {
    const l = L.get(id), r = R.get(id);
    const newest = !r ? l : !l ? r : ts(r) > ts(l) ? r : l;
    if (tomb[id] && tomb[id] >= ts(newest)) {
      if (l) stats.removedHere++;
      if (r) stats.removedThere++;
      continue;
    }
    if (tomb[id]) delete tomb[id]; // edited after it was deleted: it stays
    merged.push(newest);
    if (newest !== l) stats.received++;
    else if (!r || JSON.stringify(r) !== JSON.stringify(l)) stats.sent++;
  }
  return { cvs: merged, deleted: tomb, stats };
}

/** Same records regardless of their order. */
function sameCvs(a, b) {
  const key = (list) => JSON.stringify([...(list || [])].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)));
  return key(a) === key(b);
}

function attachmentIds(cvs) {
  const ids = new Set();
  for (const cv of cvs) for (const s of cv.sections || []) for (const it of s.items || []) if (it.fileId) ids.add(it.fileId);
  return ids;
}

/**
 * Runs one sync.
 *  store:  DataStore of the program (cvs.json, attachments/)
 *  cfg:    { token, repo: "owner/name" | "" }
 *  state:  file where the sync state (known ids, last sync time) is kept
 *  onStep: called with a short step name for the UI
 */
async function syncNow({ fetchFn, store, cfg, stateFile, onStep = () => {}, beforeLocalWrite = () => {}, now = Date.now() }) {
  if (!cfg || !cfg.token) throw new SyncError('not-configured');
  const call = client(fetchFn, cfg.token);

  onStep('connect');
  const me = await call('GET', '/user');
  if (!me.ok) throw new SyncError(me.status === 401 ? 'auth' : 'http', `HTTP ${me.status}`);
  const login = me.data.login;
  let repo = (cfg.repo || '').trim() || `${login}/cv-maker-data`;
  if (!repo.includes('/')) repo = `${login}/${repo}`;

  let info = await call('GET', `/repos/${repo}`);
  if (info.status === 404) {
    const [owner, name] = repo.split('/');
    if (owner.toLowerCase() !== login.toLowerCase()) throw new SyncError('repo-missing', repo);
    onStep('create');
    const c = await call('POST', '/user/repos', { name, private: true, auto_init: true, description: 'CV Maker - kayıt eşitleme (otomatik)' });
    if (!c.ok) throw new SyncError(c.status === 403 || c.status === 404 ? 'scope' : 'http', `HTTP ${c.status}`);
    info = c;
    await new Promise((r) => setTimeout(r, 1500)); // let the first commit settle
  } else if (!info.ok) throw new SyncError('http', `HTTP ${info.status}`);
  if (info.data && info.data.permissions && !info.data.permissions.push) throw new SyncError('scope');

  // Current files in the repository.
  onStep('download');
  const branch = (info.data && info.data.default_branch) || 'main';
  const tree = await call('GET', `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const files = new Map();
  if (tree.ok) {
    for (const f of tree.data.tree || []) if (f.type === 'blob') files.set(f.path, f.sha);
  } else if (tree.status !== 404 && tree.status !== 409) throw new SyncError('http', `HTTP ${tree.status}`);

  const blob = async (sha) => {
    const b = await call('GET', `/repos/${repo}/git/blobs/${sha}`);
    if (!b.ok) throw new SyncError('http', `HTTP ${b.status}`);
    return Buffer.from(b.data.content || '', 'base64');
  };
  const put = async (rel, buf, message) => {
    const r = await call('PUT', `/repos/${repo}/contents/${rel.split('/').map(encodeURIComponent).join('/')}`,
      { message, content: buf.toString('base64'), ...(files.has(rel) ? { sha: files.get(rel) } : {}), branch });
    if (r.status === 409 || r.status === 422) throw new SyncError('conflict');
    if (!r.ok) throw new SyncError('http', `HTTP ${r.status}`);
    files.set(rel, r.data.content.sha);
  };

  let remote = { version: 1, cvs: [], deleted: {} };
  if (files.has(DATA_FILE)) {
    try { remote = { ...remote, ...JSON.parse((await blob(files.get(DATA_FILE))).toString('utf8')) }; }
    catch (e) { if (e instanceof SyncError) throw e; throw new SyncError('bad-remote'); }
  }

  const state = readJson(stateFile, {});
  const sameRepo = state.repo === repo;
  const localData = store.loadCvs() || { version: 1, cvs: [] };
  const m = merge({
    local: localData.cvs || [],
    remote: remote.cvs || [],
    deleted: remote.deleted || {},
    known: sameRepo ? state.known : [],
    lastSync: sameRepo ? state.lastSync : 0,
    now,
  });

  // Attachments: fetch the missing ones first, so nothing points to a missing file.
  const need = attachmentIds(m.cvs);
  let filesIn = 0, filesOut = 0;
  for (const id of need) {
    const local = path.join(store.attachDir, id);
    const rel = ATTACH_PREFIX + id;
    if (!fs.existsSync(local) && files.has(rel)) {
      fs.writeFileSync(local, await blob(files.get(rel)));
      filesIn++;
    }
  }

  const localChanged = !sameCvs(m.cvs, localData.cvs);
  if (localChanged) beforeLocalWrite();
  if (localChanged) store.saveCvs({ ...localData, version: localData.version || 1, cvs: m.cvs });

  onStep('upload');
  for (const id of need) {
    const local = path.join(store.attachDir, id);
    const rel = ATTACH_PREFIX + id;
    if (!files.has(rel) && fs.existsSync(local)) {
      await put(rel, fs.readFileSync(local), `Ek: ${id}`);
      filesOut++;
    }
  }
  const out = { version: 1, cvs: m.cvs, deleted: m.deleted };
  const remoteChanged = !sameCvs(out.cvs, remote.cvs) || JSON.stringify(out.deleted) !== JSON.stringify(remote.deleted || {});
  if (remoteChanged) await put(DATA_FILE, Buffer.from(JSON.stringify(out, null, 1)), `Eşitleme ${new Date(now).toISOString()}`);

  const newState = { repo, login, lastSync: now, known: m.cvs.map((c) => c.id) };
  fs.writeFileSync(stateFile, JSON.stringify(newState));
  return { repo, login, localChanged, remoteChanged, filesIn, filesOut, ...m.stats, time: now };
}

module.exports = { syncNow, merge, SyncError };
