'use strict';
/* CV analizi (çevrim dışı): kalite puanı, tutarlılık denetimi (tarih çakışması, boşluk, eksik bilgi, zayıf ifade),
   ATS uyumluluğu, hedef ülkeye göre öneriler, belge geçerliliği ve iş ilanı anahtar kelime eşleşmesi.
   Saf işlevler: tarayıcıda global CHK, Node testlerinde module.exports. Mesaj metinleri i18n'de 'chk.<id>' anahtarlarıdır. */
(function (g) {
  const AVX = typeof module !== 'undefined' && module.exports ? require('./aviation.js') : g.AV;

  /* ---------- tarih yardımcıları ---------- */
  function ym(v) {
    const [y, m] = String(v || '').split('-').map(Number);
    return y ? y * 12 + ((m || 1) - 1) : null;
  }
  const nowYm = (now) => now.getFullYear() * 12 + now.getMonth();

  /* ---------- metin yardımcıları ---------- */
  const WEAK = {
    tr: [/^sorumlu(ydum|yum)?\b/i, /^görev(li)? (aldım|yaptım)/i, /^çalıştım\b/i, /^yardımcı oldum/i, /^ilgilendim/i, /^katıldım/i, /\bsorumluluğundaydı\b/i],
    en: [/^responsible for\b/i, /^worked (on|in|as)\b/i, /^helped\b/i, /^assisted (with|in)\b/i, /^duties included\b/i, /^involved in\b/i, /^tasked with\b/i],
    ar: [/^مسؤول عن/, /^عملت (في|على)/, /^ساعدت/, /^شاركت في/],
  };
  const bullets = (t) => String(t || '').split(/\r?\n/).map((l) => l.replace(/^\s*[-•*▪–]\s+/, '').trim()).filter(Boolean);
  const firstWord = (l) => (l.split(/\s+/)[0] || '').toLocaleLowerCase().replace(/[.,;:!?]/g, '');
  const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

  /* ---------- hedef ülke kuralları ---------- */
  const COUNTRIES = {
    TR: 'tr', AE: 'gulf', SA: 'gulf', QA: 'gulf', KW: 'gulf', BH: 'gulf', OM: 'gulf', JO: 'mena', EG: 'mena', IQ: 'mena', LB: 'mena',
    US: 'anglo', CA: 'anglo', GB: 'anglo', IE: 'anglo', AU: 'anglo', NZ: 'anglo',
    DE: 'dach', AT: 'dach', CH: 'dach', FR: 'eu', NL: 'eu', BE: 'eu', ES: 'eu', IT: 'eu', SE: 'eu', PL: 'eu', AZ: 'tr', SY: 'mena', LY: 'mena',
  };
  const PERSONAL_SENSITIVE = ['birthDate', 'birthPlace', 'gender', 'maritalStatus', 'children', 'nationality', 'militaryStatus'];
  const RULES = {
    anglo: { photo: 'avoid', hide: PERSONAL_SENSITIVE, maxPages: 2 },
    gulf: { photo: 'recommended', want: ['nationality', 'birthDate', 'drivingLicense'], visa: true, maxPages: 3 },
    mena: { photo: 'recommended', want: ['nationality', 'birthDate'], maxPages: 3 },
    tr: { photo: 'recommended', want: ['birthDate', 'drivingLicense'], military: true, maxPages: 2 },
    dach: { photo: 'optional', want: ['birthDate'], hide: ['children', 'gender'], maxPages: 2 },
    eu: { photo: 'optional', hide: ['children', 'gender', 'maritalStatus'], maxPages: 2 },
  };
  const countryRule = (code) => RULES[COUNTRIES[code]] || null;

  /* ---------- analiz ---------- */
  /**
   * @param cv     CV verisi (normalizeCv sonrası)
   * @param o      { lang, pages, now, templates }
   * @returns { score, grade, issues: [{id, sev, params, target, fix}] , stats }
   */
  function analyzeCv(cv, o = {}) {
    const lang = o.lang || 'tr';
    const now = o.now || new Date();
    const issues = [];
    const add = (id, sev, params, target, fix) => issues.push({ id, sev, params: params || {}, target: target || null, fix: fix || null });
    const P = cv.personal || {};
    const pv = (k) => (P[k] && P[k].visible !== false ? String(P[k].value || '').trim() : '');
    const sec = (type) => (cv.sections || []).filter((s) => s.type === type && s.visible !== false);
    const items = (type) => sec(type).flatMap((s) => s.items.filter((it) => it.visible !== false).map((it) => ({ s, it })));
    const phones = ((P.phone && P.phone.visible !== false && P.phone.numbers) || []).filter((n) => String(n.value || '').trim());

    // kimlik ve iletişim
    if (!pv('fullName')) add('noName', 'error', null, { personal: 'fullName' });
    if (!pv('jobTitle')) add('noJobTitle', 'warn', null, { personal: 'jobTitle' });
    const email = pv('email');
    if (!email) add('noEmail', 'error', null, { personal: 'email' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) add('badEmail', 'error', { v: email }, { personal: 'email' });
    if (!phones.length) add('noPhone', 'warn', null, { personal: 'phone' });
    else if (phones.some((n) => !/^\s*(\+|00)/.test(n.value))) add('phoneNoCountry', 'info', null, { personal: 'phone' });

    // özet
    const summary = items('summary').map((x) => x.it.text || '').join('\n').trim();
    if (!summary) add('noSummary', 'warn', null, { type: 'summary' }, 'addSummary');
    else if (words(summary) > 110) add('summaryLong', 'warn', { n: words(summary) }, { type: 'summary' });
    else if (words(summary) < 15) add('summaryShort', 'info', { n: words(summary) }, { type: 'summary' });

    // deneyim: tarihler, açıklama, çakışma, boşluk, zayıf ifade, sayılar
    const exp = items('experience');
    if (!exp.length) add('noExperience', 'warn', null, { type: 'experience' });
    const periods = [];
    const firstWords = {};
    let withNumbers = 0, withText = 0;
    for (const { s, it } of exp) {
      const label = it.position || it.company || '';
      const tgt = { sectionId: s.id, itemId: it.id };
      const a = ym(it.start), b = it.current ? nowYm(now) : ym(it.end);
      if (!a) add('noDates', 'warn', { item: label }, tgt);
      else if (b !== null && b < a) add('endBeforeStart', 'error', { item: label }, tgt);
      else if (a > nowYm(now) + 1) add('futureStart', 'warn', { item: label }, tgt);
      if (a && !it.current && !it.end) add('noEnd', 'info', { item: label }, tgt);
      if (a) periods.push({ a, b: b === null ? a : b, label, tgt });
      const bl = bullets(it.description);
      if (!bl.length) add('noDescription', 'warn', { item: label }, tgt);
      else {
        withText++;
        if (/\d/.test(it.description)) withNumbers++;
        const weak = (WEAK[lang] || []).concat(WEAK.en);
        if (bl.some((l) => weak.some((r) => r.test(l)))) add('weakVerb', 'info', { item: label }, tgt, 'improve');
        for (const l of bl) { const w = firstWord(l); if (w.length > 2) firstWords[w] = (firstWords[w] || 0) + 1; }
        if (bl.some((l) => words(l) > 40)) add('longBullet', 'info', { item: label }, tgt, 'improve');
      }
    }
    for (const [w, n] of Object.entries(firstWords)) if (n >= 3) add('repeatVerb', 'info', { w, n });
    if (withText >= 2 && withNumbers === 0) add('noNumbers', 'info');
    periods.sort((x, y) => x.a - y.a);
    for (let i = 1; i < periods.length; i++) {
      const p = periods[i - 1], q = periods[i];
      if (q.a < p.b - 1) add('overlap', 'info', { a: p.label, b: q.label }, q.tgt);
      else if (q.a - p.b > 6) add('gap', 'info', { a: p.label, b: q.label, m: q.a - p.b }, q.tgt);
    }
    if (periods.length) {
      const last = Math.max(...periods.map((p) => p.b));
      if (nowYm(now) - last > 6) add('gapNow', 'info', { m: nowYm(now) - last });
    }

    // eğitim
    const edu = items('education');
    if (!edu.length) add('noEducation', 'warn', null, { type: 'education' });
    for (const { s, it } of edu) {
      const a = ym(it.start), b = ym(it.end);
      if (a && b && b < a) add('endBeforeStart', 'error', { item: it.school || it.degree || '' }, { sectionId: s.id, itemId: it.id });
    }

    // beceri ve dil
    if (items('skills').length < 4) add('fewSkills', 'info', { n: items('skills').length }, { type: 'skills' });
    const langs = items('languages');
    if (!langs.length) add('noLanguages', 'warn', null, { type: 'languages' });

    // havacılık
    const aviation = AVX.isAviationCv(cv);
    if (aviation) {
      const pilot = /pilot|kaptan|captain|first officer|طيار/i.test(pv('jobTitle'));
      if (pilot && !items('flightHours').length) add('noFlightHours', 'warn', null, { type: 'flightHours' }, 'addSection:flightHours');
      if (pilot && !items('licences').length) add('noLicence', 'warn', null, { type: 'licences' }, 'addSection:licences');
      if (pilot && !items('medical').length) add('noMedical', 'info', null, { type: 'medical' }, 'addSection:medical');
      const english = langs.find(({ it }) => /ingiliz|english|الإنجليزية|انجليزي/i.test(it.name || ''));
      if (english && !english.it.icao && (pilot || /controller|kontrolör|مراقب/i.test(pv('jobTitle')))) add('noIcao', 'warn', null, { sectionId: english.s.id, itemId: english.it.id });
    }
    for (const x of AVX.expiringItems([cv], now, 90)) {
      add(x.expired ? 'expired' : 'expiring', x.expired ? 'error' : 'warn', { item: x.title, d: x.expiry, n: Math.abs(x.daysLeft) }, { sectionId: x.sectionId, itemId: x.itemId });
    }

    // ATS ve sayfa
    const d = cv.design || {};
    const tpl = (o.templates || []).find((t) => t.id === d.templateId);
    const ats = !!(tpl && tpl.ats);
    if (!ats) {
      if (d.layout && d.layout !== 'classic') add('atsColumns', 'info', null, null, 'applyAts');
      if (d.skillStyle && d.skillStyle !== 'text' && items('skills').length) add('atsBars', 'info', null, null, 'skillText');
    }
    const pages = o.pages || 0;
    const rule = countryRule(cv.targetCountry);
    const maxPages = rule ? rule.maxPages : 2;
    if (pages > maxPages) add('tooManyPages', 'warn', { n: pages, max: maxPages }, null, 'fitPage');

    // hedef ülke
    if (rule) {
      const photoOn = !!(cv.photo && cv.photo.data && cv.photo.visible !== false && d.photoShape !== 'none');
      if (rule.photo === 'avoid' && photoOn) add('cPhotoAvoid', 'warn', { c: cv.targetCountry }, null, 'hidePhoto');
      if (rule.photo === 'recommended' && !photoOn) add('cPhotoWant', 'info', { c: cv.targetCountry }, { personal: 'photo' });
      for (const k of rule.hide || []) if (pv(k)) add('cHide', 'warn', { c: cv.targetCountry, f: k }, { personal: k }, 'hideField:' + k);
      for (const k of rule.want || []) if (!pv(k)) add('cWant', 'info', { c: cv.targetCountry, f: k }, { personal: k });
      if (rule.visa && !(cv.customFields || []).some((c) => /vize|visa|إقامة|تأشيرة|iqama/i.test(c.label + ' ' + JSON.stringify(c.labels || {})))) add('cVisa', 'info', { c: cv.targetCountry }, null, 'addVisaField');
      if (rule.military && !pv('militaryStatus') && pv('gender') && /erkek|male|ذكر/i.test(pv('gender'))) add('cMilitary', 'info', null, { personal: 'militaryStatus' });
    }

    const W = { error: 12, warn: 6, info: 2 };
    const score = Math.max(0, Math.min(100, 100 - issues.reduce((a, x) => a + W[x.sev], 0)));
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';
    const order = { error: 0, warn: 1, info: 2 };
    issues.sort((a, b) => order[a.sev] - order[b.sev]);
    return { score, grade, issues, stats: { experience: exp.length, pages, aviation, ats } };
  }

  /* ---------- iş ilanı anahtar kelime eşleşmesi ---------- */
  const STOP = new Set((
    've veya ile için bir bu şu da de ki ise gibi olan olarak en çok daha her tüm ilgili alanında konusunda sahip tercihen tercih edilir aranıyor aranan adaylar aday ' +
    'pozisyon pozisyonu iş işe işin firma firmamız şirket şirketimiz bünyesinde ekibimize ekip olmak yapmak yapabilen bilen bilgisi bilgi deneyim deneyimli tecrübe tecrübeli yıl yıllık en az iyi düzeyde seviyede ' +
    'the and or for with a an to of in on at by from as is are be will we you our your their this that these those who which have has having must should can able ' +
    'experience experienced years year least strong good excellent knowledge skills skill ability candidate candidates required requirements preferred plus job role position company team work working ' +
    'looking seeking holding mandatory essential desirable ideal ideally minimum maximum including within across must-have opportunity apply applicants join responsibilities duties zorunlu aranmaktadır beklenmektedir sahibi olan ' +
    'في من على إلى عن مع أو و ال هذا هذه التي الذي لدى ذات خبرة سنوات سنة المرشح المرشحين مطلوب يفضل القدرة العمل الوظيفة الشركة فريق'
  ).split(/\s+/));
  const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFKC');
  function tokenize(text) {
    return norm(text).replace(/[“”"'’()[\]{}<>|\\/:;!?،؛.,*•▪–—=+]/g, ' ').split(/\s+/).map((w) => w.replace(/^-+|-+$/g, '')).filter(Boolean);
  }
  const keep = (w) => (w.length >= 3 || /^[a-z]\d/.test(w)) && !STOP.has(w) && !/^\d+$/.test(w);

  /** İlandan en önemli anahtar kelimeleri (tek kelime + iki kelimelik ifade) çıkarır. */
  function extractKeywords(posting, max = 30) {
    const toks = tokenize(posting);
    const freq = new Map();
    const bump = (k, n = 1) => freq.set(k, (freq.get(k) || 0) + n);
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (keep(w)) bump(w, /\d/.test(w) ? 1.5 : 1);   // A320, B737, DGR-63 gibi tip/kod adları daha ağır
      const n = toks[i + 1];
      if (n && keep(w) && keep(n)) bump(w + ' ' + n, 1.2);
    }
    // iki kelimelik ifade en az 2 kez geçmiyorsa ve tek kelimeler zaten varsa ifadeyi at
    for (const [k, v] of [...freq]) if (k.includes(' ') && v < 2.4) freq.delete(k);
    return [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, max).map(([k]) => k);
  }
  function cvText(cv) {
    const parts = [];
    // varsayılan bölüm başlıkları da metne girer ("Type Ratings", "Lisanslar" …): ilandaki genel terimler eşleşsin
    const T = typeof g.tr === 'function' ? g.tr : null;
    const P = cv.personal || {};
    for (const k of Object.keys(P)) if (P[k] && P[k].value) parts.push(P[k].value);
    for (const c of cv.customFields || []) parts.push(c.label, c.value);
    for (const s of cv.sections || []) {
      if (s.visible === false) continue;
      parts.push(s.title);
      if (T) for (const l of ['tr', 'en', 'ar']) parts.push(T(l, 'sec.' + s.type));
      for (const it of s.items || []) if (it.visible !== false) for (const [k, v] of Object.entries(it)) if (typeof v === 'string' && !/^(id|fileId|mime)$/.test(k)) parts.push(v);
    }
    return parts.filter(Boolean).join('\n');
  }
  /** Türkçe ekleri hesaba katan gevşek eşleşme: "yönetimi" ↔ "yönetim", "pilots" ↔ "pilot". */
  function stemMatch(hay, kw) {
    if (hay.includes(kw)) return true;
    const stems = kw.split(' ').map((w) => (w.length > 5 ? w.slice(0, Math.max(5, w.length - 3)) : w));
    return stems.every((st) => hay.includes(st));
  }
  function matchPosting(cv, posting) {
    const keywords = extractKeywords(posting);
    const hay = ' ' + tokenize(cvText(cv)).join(' ') + ' ';
    const matched = [], missing = [];
    for (const k of keywords) (stemMatch(hay, k) ? matched : missing).push(k);
    const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
    return { score, keywords, matched, missing };
  }

  const api = { analyzeCv, matchPosting, extractKeywords, tokenize, cvText, countryRule, COUNTRIES, RULES, ym, bullets };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.CHK = api;
})(typeof window !== 'undefined' ? window : globalThis);
