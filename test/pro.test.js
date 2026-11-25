// 2.2 birim testleri: CV analizi (tutarlılık, ATS, hedef ülke, belge geçerliliği), ilan anahtar kelime eşleşmesi,
// havacılık sözlüğü, veri deposunda şifreleme (sahte şifreleyici) ve sürüm geçmişi.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AV = require('../src/aviation.js');
const CHK = require('../src/checks.js');
const { DataStore } = require('../lib/datastore.js');

const NOW = new Date(2026, 10, 25);
function cv(extra = {}) {
  const P = {};
  for (const k of ['fullName', 'jobTitle', 'email', 'address', 'birthDate', 'nationality', 'maritalStatus', 'gender', 'drivingLicense', 'militaryStatus']) P[k] = { value: '', visible: true };
  P.phone = { value: '', visible: true, numbers: [{ id: 'p', value: '+90 532 000 00 00', apps: ['call'] }] };
  Object.assign(P.fullName, { value: 'Ayşe Yılmaz' }); P.jobTitle.value = 'Captain'; P.email.value = 'ayse@example.com';
  return Object.assign({
    id: 'c1', name: 'CV', personal: P, customFields: [], photo: { data: '', visible: true }, design: { templateId: 'modern', layout: 'sidebar', skillStyle: 'bars', photoShape: 'circle' },
    sections: [
      { id: 's1', type: 'summary', visible: true, items: [{ id: 'i1', text: 'Captain with 4,200 hours on the A320 family, line training captain and safety focused leader with a strong CRM background in multi-crew operations.' }] },
      { id: 's2', type: 'experience', visible: true, items: [
        { id: 'e1', position: 'Captain', company: 'Airline A', start: '2019-03', current: true, description: '- Led crews of 6 on 1,200 sectors\n- Reduced fuel burn by 3%' },
        { id: 'e2', position: 'First Officer', company: 'Airline B', start: '2012-01', end: '2018-01', description: '- Responsible for flight planning' },
      ] },
      { id: 's3', type: 'education', visible: true, items: [{ id: 'd1', school: 'ITU', degree: 'BSc', start: '2008-09', end: '2012-06' }] },
      { id: 's4', type: 'skills', visible: true, items: ['CRM', 'MCC', 'ETOPS', 'LVO', 'PBN'].map((name, i) => ({ id: 'k' + i, name })) },
      { id: 's5', type: 'languages', visible: true, items: [{ id: 'l1', name: 'English', level: 'fluent', icao: '' }] },
      { id: 's6', type: 'licences', visible: true, items: [{ id: 'x1', name: 'ATPL(A)', authority: 'EASA', expiry: '2026-12-20' }] },
      { id: 's7', type: 'medical', visible: true, items: [{ id: 'm1', medClass: 'class1', expiry: '2026-01-10' }] },
      { id: 's8', type: 'flightHours', visible: true, items: [{ id: 'f1', aircraft: 'A320', total: '4200' }] },
    ],
  }, extra);
}

test('analiz: belge geçerliliği, ICAO, zayıf ifade, ATS, boşluk', () => {
  const r = CHK.analyzeCv(cv(), { lang: 'en', now: NOW, pages: 1, templates: [{ id: 'modern' }] });
  const ids = r.issues.map((x) => x.id);
  assert.ok(ids.includes('expired'), 'süresi dolan medical');
  assert.ok(ids.includes('expiring'), 'yaklaşan lisans');
  assert.ok(ids.includes('noIcao'), 'pilot + İngilizce + ICAO yok');
  assert.ok(ids.includes('weakVerb'), '"Responsible for"');
  assert.ok(ids.includes('atsColumns') && ids.includes('atsBars'));
  assert.ok(ids.includes('gap'), '2018-01 → 2019-03 boşluk');
  assert.ok(!ids.includes('noFlightHours') && !ids.includes('noLicence'));
  assert.strictEqual(r.issues[0].sev, 'error', 'hatalar önce');
  assert.ok(r.score < 100 && r.score > 0);
});

test('analiz: hatalı tarih ve e-posta, ATS şablonunda ATS uyarısı yok', () => {
  const c = cv();
  c.personal.email.value = 'yanlis@';
  c.sections[1].items[1].end = '2011-01';
  c.design = { templateId: 'ats', layout: 'classic', skillStyle: 'text', photoShape: 'none' };
  const ids = CHK.analyzeCv(c, { lang: 'tr', now: NOW, templates: [{ id: 'ats', ats: true }] }).issues.map((x) => x.id);
  assert.ok(ids.includes('badEmail') && ids.includes('endBeforeStart'));
  assert.ok(!ids.includes('atsColumns') && !ids.includes('atsBars'));
});

test('hedef ülke: ABD fotoğraf ve doğum tarihi istemez, Körfez vize ister', () => {
  const us = cv({ targetCountry: 'US', photo: { data: 'data:image/jpeg;base64,xx', visible: true } });
  us.personal.birthDate.value = '1990-01-01';
  const a = CHK.analyzeCv(us, { now: NOW }).issues;
  assert.ok(a.some((x) => x.id === 'cPhotoAvoid' && x.fix === 'hidePhoto'));
  assert.ok(a.some((x) => x.id === 'cHide' && x.params.f === 'birthDate' && x.fix === 'hideField:birthDate'));
  const ae = CHK.analyzeCv(cv({ targetCountry: 'AE' }), { now: NOW }).issues.map((x) => x.id);
  assert.ok(ae.includes('cVisa') && ae.includes('cPhotoWant') && ae.includes('cWant'));
});

test('ilan eşleşmesi: kod adları ve ekler', () => {
  const m = CHK.matchPosting(cv(), 'A320 captain wanted. ATPL holder with ETOPS and LVO experience. Strong CRM skills are required. A320 type rating mandatory.');
  assert.ok(m.matched.includes('a320'), JSON.stringify(m));
  assert.ok(m.matched.includes('etops') && m.matched.includes('crm'));
  assert.ok(!m.keywords.includes('the') && !m.keywords.includes('mandatory'));
  assert.ok(m.score >= 50, String(m.score));
  const tr = CHK.matchPosting(cv(), 'Ekip kaynak yönetimi tecrübesi olan, A320 tip yetkili kaptan pilot aranıyor.');
  assert.ok(tr.keywords.includes('a320') && !tr.keywords.includes('aranıyor'));
});

test('havacılık: geçerlilik listesi, sözlük ve öneri listeleri', () => {
  const list = AV.expiringItems([cv()], NOW, 90);
  assert.deepStrictEqual(list.map((x) => x.type), ['medical', 'licences']);
  assert.ok(list[0].expired && list[0].title === '@med.class1');
  assert.strictEqual(AV.parseDay('2027-02').getDate(), 28, 'yalnız ay → ayın son günü');
  assert.strictEqual(AV.glossaryTranslate('Kaptan Pilot', 'tr', 'en'), 'Captain');
  assert.strictEqual(AV.glossaryTranslate('Lisans', 'tr', 'en', 'degree'), "Bachelor's Degree");
  assert.strictEqual(AV.glossaryTranslate('Lisans', 'tr', 'ar'), 'رخصة');
  assert.strictEqual(AV.glossaryTranslate('Captain', 'en', 'ar'), 'كابتن طيار');
  assert.strictEqual(AV.glossaryTranslate('serbest metin', 'tr', 'en'), null);
  for (const name of ['licence', 'authority', 'privilege', 'certificate']) {
    const L = AV.AV_LISTS[name];
    assert.ok(L.tr.length === L.en.length && L.en.length === L.ar.length, name + ' listeleri aynı uzunlukta (sıra eşleşmesi)');
  }
  assert.ok(AV.isAviationCv(cv()));
  for (const p of Object.values(AV.PROFESSIONS)) for (const s of p.sections) assert.ok(typeof s === 'string');
});

test('veri deposu: şifreleme açılır/kapanır, açılamayan veri üzerine yazılmaz', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-enc-'));
  const key = 7;
  const xor = (b) => Buffer.from(b.map((x) => x ^ key));
  const cipher = { available: () => true, encrypt: xor, decrypt: xor };
  const st = new DataStore(dir, cipher);
  const data = { version: 1, cvs: [{ id: 'a', name: 'Gizli', sections: [] }], applications: [{ id: 'x', company: 'Şirket' }] };
  st.saveCvs(data);
  assert.ok(!st.encryptionOn());
  st.setEncryption(true);
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'cvs.json'), 'utf8'));
  assert.strictEqual(raw.enc, 'os', 'dosya şifreli');
  assert.ok(!fs.readFileSync(path.join(dir, 'cvs.json'), 'utf8').includes('Gizli'));
  assert.deepStrictEqual(st.loadCvs(), data, 'açılıyor');
  assert.ok(st.listBackups().some((b) => b.reason === 'security'), 'şifreleme öncesi yedek');
  // başka hesap: çözülemez → yükleme hatası, kaydetme reddedilir, dosya bozulmaz
  const other = new DataStore(dir, { available: () => true, encrypt: xor, decrypt: () => { throw new Error('dpapi'); } });
  assert.strictEqual(other.loadCvs(), null);
  assert.strictEqual(other.loadError, 'decrypt');
  assert.throws(() => other.saveCvs({ version: 1, cvs: [] }));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'cvs.json'), 'utf8')).enc, 'os');
  st.setEncryption(false);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'cvs.json'), 'utf8')).cvs[0].name, 'Gizli');
});

test('sürüm geçmişi: aynısı yazılmaz, fotoğraf bir kez saklanır, seyreltme', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-hist-'));
  const st = new DataStore(dir);
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
  const c = { id: 'cv-1', name: 'X', photo: { data: photo, visible: true }, sections: [{ type: 'summary', items: [{ text: 'a' }] }] };
  assert.ok(st.snapshot(c, new Date(2026, 10, 20, 10)));
  assert.strictEqual(st.snapshot(Object.assign({}, c, { updatedAt: 99 }), new Date(2026, 10, 20, 11)), null, 'değişiklik yoksa yazılmaz');
  c.sections[0].items[0].text = 'b';
  assert.ok(st.snapshot(c, new Date(2026, 10, 20, 12)));
  assert.strictEqual(fs.readdirSync(path.join(dir, 'history', 'photos')).length, 1, 'fotoğraf tek kopya');
  const list = st.listHistory('cv-1');
  assert.strictEqual(list.length, 2);
  const back = st.readHistory('cv-1', list[1].name);
  assert.strictEqual(back.photo.data, photo, 'fotoğraf geri gelir');
  assert.strictEqual(back.sections[0].items[0].text, 'a');
  // 10 gün önceki aynı güne ait 3 sürümden 1'i kalır
  for (let i = 0; i < 3; i++) { c.sections[0].items[0].text = 'old' + i; st.snapshot(c, new Date(2026, 10, 1, 9 + i)); }
  c.sections[0].items[0].text = 'new'; st.snapshot(c, new Date(2026, 10, 25, 9));
  const days = st.listHistory('cv-1').map((x) => x.name.slice(0, 10));
  assert.strictEqual(days.filter((d) => d === '2026-11-01').length, 1);
  assert.throws(() => st.listHistory('../x'));
});
