'use strict';
/* Tests for lib/datastore.js: backups, restore, attachment safekeeping, import of portable data. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DataStore } = require('../lib/datastore');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-test-'));
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

// A legacy portable folder (uses real data when CVM_LEGACY points to one).
const legacy = path.join(tmp, 'portable', 'CV Maker Data');
if (process.env.CVM_LEGACY) {
  fs.cpSync(process.env.CVM_LEGACY, legacy, { recursive: true });
} else {
  fs.mkdirSync(path.join(legacy, 'attachments'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'cvs.json'), JSON.stringify({ version: 1, cvs: [
    { id: 'a', name: 'Ahmet', updatedAt: 100, sections: [{ items: [{ fileId: 'f1.pdf' }] }] },
    { id: 'b', name: 'Banu', updatedAt: 200, sections: [] },
  ] }));
  fs.writeFileSync(path.join(legacy, 'settings.json'), JSON.stringify({ uiLang: 'tr', theme: 'dark', customTemplates: [{ id: 't1', name: 'Benim' }], updateUrl: 'x' }));
  fs.writeFileSync(path.join(legacy, 'attachments', 'f1.pdf'), 'PDF');
}
fs.mkdirSync(path.join(legacy, 'chromium'), { recursive: true });
fs.writeFileSync(path.join(legacy, 'chromium', 'junk'), 'cache');
const legacyBefore = JSON.stringify(fs.readdirSync(legacy).sort()) + fs.readFileSync(path.join(legacy, 'cvs.json'), 'utf8');
const legacyCvs = J(path.join(legacy, 'cvs.json')).cvs;

const dataDir = path.join(tmp, 'appdata', 'CV Maker', 'data');
const store = new DataStore(dataDir);

test('empty store: no backup, nothing to import yet', () => {
  assert.strictEqual(store.backup('daily'), null);
  assert.deepStrictEqual(store.listBackups(), []);
  assert.deepStrictEqual(store.importedSources(), []);
});

test('import into a fresh install brings every CV, attachment and setting', () => {
  const r = store.importLegacy(legacy);
  assert.strictEqual(r.added, legacyCvs.length);
  const cvs = store.loadCvs().cvs;
  assert.deepStrictEqual(cvs.map((c) => c.id).sort(), legacyCvs.map((c) => c.id).sort());
  assert.deepStrictEqual(cvs, legacyCvs, 'CV content must be identical');
  for (const f of fs.readdirSync(path.join(legacy, 'attachments'))) assert.ok(fs.existsSync(path.join(store.attachDir, f)), f);
  const st = store.loadSettings();
  assert.strictEqual(st.uiLang, J(path.join(legacy, 'settings.json')).uiLang);
  assert.strictEqual(st.updateUrl, '');
  assert.ok(fs.existsSync(path.join(store.backupDir, r.archive, 'cvs.json')), 'legacy archive');
  assert.ok(!fs.existsSync(path.join(store.backupDir, r.archive, 'chromium')), 'cache not archived');
  assert.ok(store.importedSources().includes(path.resolve(legacy).toLowerCase()));
});

test('legacy folder is left exactly as it was', () => {
  const after = JSON.stringify(fs.readdirSync(legacy).sort()) + fs.readFileSync(path.join(legacy, 'cvs.json'), 'utf8');
  assert.strictEqual(after, legacyBefore);
});

test('re-import merges by id: newer edit wins, nothing lost', () => {
  const data = store.loadCvs();
  data.cvs[0].name = 'edited here'; data.cvs[0].updatedAt = Date.now() + 1000;
  data.cvs.push({ id: 'new-local', name: 'only here', updatedAt: 1, sections: [] });
  store.saveCvs(data);
  const r = store.importLegacy(legacy);
  assert.strictEqual(r.added, 0);
  const cvs = store.loadCvs().cvs;
  assert.strictEqual(cvs.find((c) => c.id === data.cvs[0].id).name, 'edited here');
  assert.ok(cvs.find((c) => c.id === 'new-local'));
  assert.strictEqual(cvs.length, legacyCvs.length + 1);
  assert.ok(store.listBackups().some((b) => b.reason === 'before-import'));
});

test('daily backup only once per day', () => {
  const n1 = store.dailyBackup();
  const n2 = store.dailyBackup();
  assert.ok(n1);
  assert.strictEqual(n2, null);
});

test('restore puts an old state back and saves the current one first', () => {
  const before = store.listBackups().find((b) => b.reason === 'daily');
  const snapshot = fs.readFileSync(path.join(store.backupDir, before.name, 'cvs.json'), 'utf8');
  store.saveCvs({ version: 1, cvs: [] });
  const r = store.restoreBackup(before.name);
  assert.strictEqual(fs.readFileSync(store.cvsFile, 'utf8'), snapshot);
  const safety = J(path.join(store.backupDir, r.safety, 'cvs.json'));
  assert.deepStrictEqual(safety.cvs, []);
  assert.throws(() => store.restoreBackup('../../etc'));
});

test('unused attachments are moved to backups, and come back on restore', () => {
  fs.writeFileSync(path.join(store.attachDir, 'zz.png'), 'IMG');
  const bk = store.backup('manual');
  const data = store.loadCvs();
  data.cvs.push({ id: 'z', sections: [{ items: [{ fileId: 'zz.png' }] }] });
  store.saveCvs(data);
  const withZ = store.backup('manual');
  store.gcAttachments([]);
  assert.ok(!fs.existsSync(path.join(store.attachDir, 'zz.png')));
  assert.ok(fs.existsSync(path.join(store.removedDir, 'zz.png')));
  store.restoreBackup(withZ);
  assert.ok(fs.existsSync(path.join(store.attachDir, 'zz.png')));
  assert.ok(bk);
});

test('backups are never deleted', () => {
  const n = store.listBackups().length;
  for (let i = 0; i < 5; i++) store.backup('manual');
  assert.strictEqual(store.listBackups().length, n + 5);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed`);
