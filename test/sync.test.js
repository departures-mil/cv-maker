'use strict';
/* Tests for lib/sync.js against a fake GitHub API: two computers syncing through one repository. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { DataStore } = require('../lib/datastore');
const { syncNow, merge } = require('../lib/sync');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-sync-'));
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('ok -', name); }

/* ---- fake GitHub ---- */
function fakeGitHub(login = 'me') {
  const repos = new Map(); // name -> Map(path -> buffer)
  const blobs = new Map();
  let commits = 0;
  const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
  const res = (status, data) => ({ status, ok: status < 300, headers: { get: () => null }, text: async () => JSON.stringify(data) });
  async function fetchFn(url, o) {
    if (o.headers.Authorization !== 'Bearer good') return res(401, {});
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname);
    const m = o.method;
    if (p === '/user') return res(200, { login });
    if (p === '/user/repos' && m === 'POST') {
      const b = JSON.parse(o.body);
      repos.set(`${login}/${b.name}`, new Map([['README.md', Buffer.from('#')]]));
      return res(201, { full_name: `${login}/${b.name}`, default_branch: 'main', permissions: { push: true } });
    }
    let r = p.match(/^\/repos\/([^/]+\/[^/]+)$/);
    if (r) return repos.has(r[1]) ? res(200, { default_branch: 'main', permissions: { push: true } }) : res(404, {});
    r = p.match(/^\/repos\/([^/]+\/[^/]+)\/git\/trees\/main$/);
    if (r) {
      const files = repos.get(r[1]);
      return res(200, { tree: [...files].map(([fp, buf]) => { const s = sha(buf); blobs.set(s, buf); return { path: fp, type: 'blob', sha: s }; }) });
    }
    r = p.match(/^\/repos\/[^/]+\/[^/]+\/git\/blobs\/(\w+)$/);
    if (r) return res(200, { content: blobs.get(r[1]).toString('base64') });
    r = p.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/);
    if (r && m === 'PUT') {
      const files = repos.get(r[1]);
      const b = JSON.parse(o.body);
      if (files.has(r[2]) && b.sha !== sha(files.get(r[2]))) return res(409, {});
      const buf = Buffer.from(b.content, 'base64');
      files.set(r[2], buf);
      commits++;
      return res(200, { content: { sha: sha(buf) } });
    }
    return res(404, { url });
  }
  return { fetchFn, repos, commits: () => commits };
}

function computer(name) {
  const dir = path.join(tmp, name);
  const store = new DataStore(dir);
  return { store, stateFile: path.join(dir, 'sync-state.json'), backups: 0 };
}
const cv = (id, name, updatedAt, fileId) => ({ id, name, updatedAt, sections: fileId ? [{ items: [{ fileId }] }] : [] });
const names = (pc) => pc.store.loadCvs().cvs.map((c) => c.name).sort();

(async () => {
  const gh = fakeGitHub();
  const A = computer('A'), B = computer('B');
  const run = (pc, now, token = 'good') => syncNow({ fetchFn: gh.fetchFn, store: pc.store, cfg: { token }, stateFile: pc.stateFile, now, beforeLocalWrite: () => pc.backups++ });

  await test('wrong key gives auth error', async () => {
    await assert.rejects(run(A, 1, 'bad'), (e) => e.code === 'auth');
  });

  await test('first sync creates the private repo and uploads records + attachments', async () => {
    A.store.saveCvs({ version: 1, cvs: [cv('a', 'Ahmet', 100, 'f1.pdf'), cv('b', 'Banu', 200)] });
    fs.writeFileSync(path.join(A.store.attachDir, 'f1.pdf'), 'PDF-A');
    const r = await run(A, 1000);
    assert.strictEqual(r.repo, 'me/cv-maker-data');
    assert.strictEqual(r.sent, 2);
    assert.strictEqual(r.filesOut, 1);
    assert.strictEqual(r.localChanged, false);
    assert.strictEqual(A.backups, 0);
    const files = gh.repos.get('me/cv-maker-data');
    assert.ok(files.has('cvs.json') && files.has('attachments/f1.pdf'));
  });

  await test('second computer receives records and attachments, its own records go up', async () => {
    B.store.saveCvs({ version: 1, cvs: [cv('c', 'Cem', 300)] });
    const r = await run(B, 2000);
    assert.deepStrictEqual(names(B), ['Ahmet', 'Banu', 'Cem']);
    assert.strictEqual(fs.readFileSync(path.join(B.store.attachDir, 'f1.pdf'), 'utf8'), 'PDF-A');
    assert.strictEqual(r.received, 2);
    assert.strictEqual(r.filesIn, 1);
    assert.strictEqual(B.backups, 1, 'backup taken before local records changed');
    await run(A, 2100);
    assert.deepStrictEqual(names(A), ['Ahmet', 'Banu', 'Cem']);
  });

  await test('newer edit wins', async () => {
    const d = B.store.loadCvs(); d.cvs.find((c) => c.id === 'a').name = 'Ahmet Y.'; d.cvs.find((c) => c.id === 'a').updatedAt = 2500;
    B.store.saveCvs(d);
    await run(B, 2600);
    await run(A, 2700);
    assert.ok(names(A).includes('Ahmet Y.'));
  });

  await test('deletion on one computer reaches the other', async () => {
    const d = A.store.loadCvs(); d.cvs = d.cvs.filter((c) => c.id !== 'b'); A.store.saveCvs(d);
    await run(A, 3000);
    await run(B, 3100);
    assert.deepStrictEqual(names(B), ['Ahmet Y.', 'Cem']);
    // and does not come back on the next round
    await run(A, 3200);
    assert.deepStrictEqual(names(A), ['Ahmet Y.', 'Cem']);
  });

  await test('nothing to do: no commits, no backups', async () => {
    const c0 = gh.commits(), b0 = B.backups;
    const r = await run(B, 4000);
    assert.strictEqual(gh.commits(), c0);
    assert.strictEqual(B.backups, b0);
    assert.strictEqual(r.received + r.sent, 0);
  });

  await test('merge: edited elsewhere after deletion is kept', async () => {
    const m = merge({ local: [], remote: [cv('x', 'X', 900)], deleted: {}, known: ['x'], lastSync: 500, now: 1000 });
    assert.strictEqual(m.cvs.length, 1);
    const m2 = merge({ local: [cv('y', 'Y', 1200)], remote: [], deleted: { y: 1000 }, known: [], lastSync: 0, now: 1300 });
    assert.strictEqual(m2.cvs.length, 1);
    assert.ok(!m2.deleted.y);
  });

  console.log(`\n${passed} sync tests passed`);
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
