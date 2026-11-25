'use strict';
/* global S, h, t, tr, modal, toast, confirmDialog, promptDialog, changed, persistCvs, switchCv, renderEditor, clone, uid, newItem, newSection,
   newCv, normalizeCv, buildModel, renderCvHtml, pickDesign, BUILTIN_TEMPLATES, SECTION_TYPES, LANGUAGE_LEVELS, PERSONAL_FIELDS, AV, AIX, FC, api,
   Pro, fillEl, pdfjsLib, newPhone, resolvedCvLang, persistApps, setSetting, esc */
/* CV Maker 2.2 — Başvurular sekmesi (başvuru takibi), CV sürüm geçmişi, meslek şablonuyla yeni CV,
   içe/dışa aktarma (LinkedIn PDF, JSON Resume, Europass XML) ve Ayarlar kartları (Yapay zekâ, Gizlilik ve güvenlik). */
const Apps = (() => {
  const locale = () => ({ tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' }[S.settings.uiLang] || 'tr-TR');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmt = (v) => { if (!v) return ''; const x = AV.parseDay(v); return x ? x.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : v; };

  /* ================================================================ başvuru takibi ================ */
  const STATUSES = ['planned', 'applied', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];
  const ACTIVE = new Set(['planned', 'applied', 'interview', 'offer']);
  /** Başvuruya eklenen CV'nin o anki hâli (fotoğraf verisi dahil değil; boyutu küçük tutar). */
  function snapshotOf(cv) {
    const c = clone(cv);
    c.photo = Object.assign({}, c.photo, { original: '' });
    c.coverLetters = [];
    return c;
  }
  function appsPanel() {
    const list = S.applications;
    const f = S.appFilter || { status: 'active', q: '' };
    S.appFilter = f;
    const counts = {};
    for (const a of list) counts[a.status] = (counts[a.status] || 0) + 1;
    const active = list.filter((a) => ACTIVE.has(a.status)).length;
    const q = f.q.trim().toLocaleLowerCase();
    const shown = list.filter((a) => (f.status === 'all' || (f.status === 'active' ? ACTIVE.has(a.status) : a.status === f.status))
      && (!q || [a.company, a.position, a.location, a.notes].join(' ').toLocaleLowerCase().includes(q)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.created - a.created);
    const stat = (k, n, label) => h('button', { class: `app-stat${f.status === k ? ' on' : ''}`, onclick: () => { f.status = k; renderEditor(); } }, h('b', null, String(n)), h('span', null, label));
    const search = h('input', { class: 'input', placeholder: t('app.search'), value: f.q, oninput: (e) => { f.q = e.target.value; const pos = e.target.selectionStart; renderEditor(); const i = document.querySelector('.app-search input'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } });
    const rows = shown.length ? shown.map(appRow) : [h('div', { class: 'app-empty' }, h('div', { class: 'big' }, '🗂'), h('p', null, list.length ? t('app.noMatch') : t('app.empty')))];
    return h('div', { class: 'panel' },
      h('div', { class: 'ed-card open static' }, h('div', { class: 'ed-card-body' },
        h('div', { class: 'app-stats' },
          stat('active', active, t('app.active')), stat('all', list.length, t('app.all')),
          stat('interview', counts.interview || 0, t('app.st.interview')), stat('offer', (counts.offer || 0) + (counts.accepted || 0), t('app.st.offer')), stat('rejected', counts.rejected || 0, t('app.st.rejected'))),
        h('div', { class: 'app-search' }, search, h('button', { class: 'btn primary', onclick: () => editApp() }, '＋ ' + t('app.add'))),
        h('p', { class: 'muted small' }, t('app.desc')))),
      h('div', { class: 'app-list' }, rows));
  }
  function appRow(a) {
    const overdue = a.nextDate && ACTIVE.has(a.status) && a.nextDate <= today();
    const sel = h('select', { class: `input st st-${a.status}`, onclick: (e) => e.stopPropagation(), onchange: (e) => setStatus(a, e.target.value) },
      STATUSES.map((s) => h('option', { value: s, selected: a.status === s }, t('app.st.' + s))));
    return h('div', { class: `app-card st-${a.status}`, onclick: () => editApp(a) },
      h('div', { class: 'app-main' },
        h('div', { class: 'app-title' }, h('b', null, a.company || '—'), a.position ? h('span', null, ' · ' + a.position) : null),
        h('div', { class: 'muted small' }, [a.location, a.date ? t('app.appliedOn', { d: fmt(a.date) }) : '', a.cvName ? '📄 ' + a.cvName : ''].filter(Boolean).join(' · ')),
        a.nextDate ? h('div', { class: `app-next${overdue ? ' due' : ''}` }, (overdue ? '⏰ ' : '🗓 ') + fmt(a.nextDate) + (a.nextNote ? ' — ' + a.nextNote : '')) : null),
      h('div', { class: 'app-side' }, sel,
        a.snapshot ? h('button', { class: 'btn small', title: t('app.viewCv'), onclick: (e) => { e.stopPropagation(); viewSnapshot(a); } }, '👁 CV') : null));
  }
  function setStatus(a, st) {
    if (a.status === st) return;
    a.status = st;
    (a.log = a.log || []).push({ d: Date.now(), status: st });
    persistApps();
    renderEditor();
  }
  function editApp(existing, presetCv) {
    const a = existing ? clone(existing) : { id: uid(), created: Date.now(), company: '', position: S.cur.personal.jobTitle.value || '', location: '', url: '', date: today(), status: 'applied', cvId: (presetCv || S.cur).id, contact: '', salary: '', nextDate: '', nextNote: '', notes: '', letterId: '' };
    const inp = (k, o = {}) => h('input', Object.assign({ class: 'input', value: a[k] || '', dir: 'auto', oninput: (e) => { a[k] = e.target.value; } }, o));
    const dateInp = (k) => h('input', { class: 'input', type: 'date', value: a[k] || '', onchange: (e) => { a[k] = e.target.value; } });
    const cvSel = h('select', { class: 'input', onchange: (e) => { a.cvId = e.target.value; drawLetters(); } },
      h('option', { value: '' }, '—'), S.cvs.map((c) => h('option', { value: c.id, selected: a.cvId === c.id }, c.name)));
    const letterSel = h('select', { class: 'input', onchange: (e) => { a.letterId = e.target.value; } });
    const drawLetters = () => {
      const cv = S.cvs.find((c) => c.id === a.cvId);
      letterSel.replaceChildren(h('option', { value: '' }, '—'), ...((cv && cv.coverLetters) || []).map((L) => h('option', { value: L.id, selected: a.letterId === L.id }, [L.company, L.position].filter(Boolean).join(' – ') || t('cl.untitled'))));
    };
    drawLetters();
    const status = h('select', { class: 'input', onchange: (e) => { a.status = e.target.value; } }, STATUSES.map((s) => h('option', { value: s, selected: a.status === s }, t('app.st.' + s))));
    const snapNote = h('p', { class: 'muted small' }, existing && existing.snapshot ? t('app.snapKept', { d: fmt(new Date(existing.snapshot.updatedAt || existing.created).toISOString().slice(0, 10)) }) : t('app.snapNew'));
    const resnap = h('label', { class: 'ed-check' }, h('input', { type: 'checkbox', checked: !existing || !existing.snapshot }), t('app.resnap'));
    const log = (existing && existing.log || []).slice().reverse().map((x) => h('div', { class: 'muted small' }, `${new Date(x.d).toLocaleDateString(locale())} → ${t('app.st.' + x.status)}`));
    const body = h('div', { class: 'app-form' },
      h('div', { class: 'field-grid' },
        h('label', { class: 'ed-field' }, h('span', null, t('cl.company')), inp('company')),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.position')), inp('position')),
        h('label', { class: 'ed-field' }, h('span', null, t('field.location')), inp('location')),
        h('label', { class: 'ed-field' }, h('span', null, t('app.url')), inp('url', { dir: 'ltr', placeholder: 'https://…' })),
        h('label', { class: 'ed-field' }, h('span', null, t('app.date')), dateInp('date')),
        h('label', { class: 'ed-field' }, h('span', null, t('app.status')), status),
        h('label', { class: 'ed-field' }, h('span', null, t('app.cv')), cvSel),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.title')), letterSel),
        h('label', { class: 'ed-field' }, h('span', null, t('app.contact')), inp('contact')),
        h('label', { class: 'ed-field' }, h('span', null, t('app.salary')), inp('salary')),
        h('label', { class: 'ed-field' }, h('span', null, t('app.nextDate')), dateInp('nextDate')),
        h('label', { class: 'ed-field' }, h('span', null, t('app.nextNote')), inp('nextNote', { placeholder: t('app.nextPh') })),
        h('label', { class: 'ed-field full' }, h('span', null, t('app.notes')), h('textarea', { class: 'input', rows: 4, dir: 'auto', oninput: (e) => { a.notes = e.target.value; } }, a.notes || ''))),
      snapNote, resnap, log.length ? h('div', { class: 'app-log' }, h('b', null, t('app.log')), log) : null);
    modal({
      title: existing ? t('app.edit') : t('app.add'), body, wide: true,
      buttons: [
        existing ? { label: t('delete'), kind: 'danger', action: async (close) => { if (await confirmDialog(t('app.delete'), t('app.deleteConfirm', { c: existing.company || '—' }), true)) { S.applications = S.applications.filter((x) => x.id !== existing.id); persistApps(); close(); renderEditor(); } } } : null,
        a.url ? { label: '↗ ' + t('app.openUrl'), action: () => FC.ui.openUrl(a.url) } : null,
        { label: t('cancel') },
        { label: t('save'), kind: 'primary', action: (close) => {
          const cv = S.cvs.find((c) => c.id === a.cvId);
          a.cvName = cv ? cv.name : '';
          if (cv && resnap.querySelector('input').checked) a.snapshot = snapshotOf(cv);
          const L = cv && cv.coverLetters.find((x) => x.id === a.letterId);
          if (L) a.letter = clone(L);
          if (!existing || existing.status !== a.status) (a.log = a.log || []).push({ d: Date.now(), status: a.status });
          const i = S.applications.findIndex((x) => x.id === a.id);
          if (i >= 0) S.applications[i] = a; else S.applications.push(a);
          persistApps(); close();
          if (S.tab !== 'apps') Pro.openTab('apps'); else renderEditor();
          toast(t('saved'), 'ok');
        } },
      ].filter(Boolean),
    });
  }
  function viewSnapshot(a) {
    const cv = normalizeCv(clone(a.snapshot));
    const m = buildModel(cv, S.settings.uiLang);
    modal({
      title: t('app.sentCv', { c: a.company || '' }), wide: true,
      body: h('div', { class: 'snap-view' }, h('div', { class: 'snap-sheet', html: renderCvHtml(m) }), a.letter ? h('div', { class: 'snap-letter' }, h('b', null, t('cl.title')), h('div', { class: 'pre' }, a.letter.text)) : null),
      buttons: [
        { label: t('app.openAsCv'), action: (close) => { cv.id = uid(); cv.name = `${a.cvName || cv.name} – ${a.company || ''}`.trim(); cv.createdAt = cv.updatedAt = Date.now(); S.cvs.push(cv); persistCvs(); close(); switchCv(cv.id); Pro.openTab('content'); } },
        { label: t('close'), kind: 'primary' },
      ],
    });
  }
  function remindApps() {
    const due = S.applications.filter((a) => a.nextDate && ACTIVE.has(a.status) && a.nextDate <= today());
    if (!due.length) return;
    const key = 'cv.appsNotified';
    if (FC.storage.get(key, '') === today()) return;
    FC.storage.set(key, today());
    const msg = t('app.dueToast', { n: due.length, c: due[0].company || '—' });
    setTimeout(() => toast(msg, 'info', 9000), 2500);
    try { const n = new Notification('CV Maker', { body: msg }); n.onclick = () => { window.focus(); Pro.openTab('apps'); }; } catch { }
  }

  /* ================================================================ sürüm geçmişi ================ */
  let snapTimer = null, snapDirty = false;
  /** Düzenleme sırasında en çok 3 dakikada bir anlık görüntü (aynıysa yazılmaz). */
  function onChanged() {
    snapDirty = true;
    if (snapTimer) return;
    snapTimer = setTimeout(() => { snapTimer = null; snapNow(); }, 180000);
  }
  function snapNow(cv = S.cur) {
    if (!snapDirty && cv === S.cur) return Promise.resolve(null);
    snapDirty = false;
    return api.historySnapshot(JSON.parse(JSON.stringify(cv))).catch(() => null);
  }
  function forceSnap(cv = S.cur) { snapDirty = true; return snapNow(cv); }
  async function historyDialog() {
    await forceSnap();
    const cv = S.cur;
    const list = await api.historyList(cv.id);
    const preview = h('div', { class: 'hist-preview' }, h('p', { class: 'muted' }, t('hist.pick')));
    let picked = null;
    const items = h('div', { class: 'hist-list' }, list.length ? list.map((x, i) => {
      const row = h('button', { class: 'hist-row', onclick: async () => {
        items.querySelectorAll('.hist-row').forEach((r) => r.classList.toggle('on', r === row));
        picked = await api.historyRead(cv.id, x.name);
        normalizeCv(picked);
        preview.replaceChildren(h('div', { class: 'snap-sheet', html: renderCvHtml(buildModel(picked, S.settings.uiLang)) }));
      } }, h('b', null, x.date ? new Date(x.date).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) : x.name), h('span', { class: 'muted small' }, (i === 0 ? t('hist.latest') + ' · ' : '') + t('hist.counts', { s: x.sections, i: x.items })));
      return row;
    }) : h('p', { class: 'muted small' }, t('hist.none')));
    modal({
      title: t('hist.title') + ' — ' + cv.name, wide: true,
      body: h('div', null, h('p', { class: 'muted small' }, t('hist.desc')), h('div', { class: 'hist' }, items, preview)),
      buttons: [
        { label: t('close') },
        { label: t('hist.asCopy'), action: (close) => { if (!picked) return toast(t('hist.pick'), 'err'); const c = clone(picked); c.id = uid(); c.name = `${cv.name} (${t('hist.old')})`; c.createdAt = c.updatedAt = Date.now(); delete c.translation; S.cvs.push(c); persistCvs(); close(); switchCv(c.id); } },
        { label: t('hist.restore'), kind: 'primary', action: async (close) => {
          if (!picked) return toast(t('hist.pick'), 'err');
          if (!(await confirmDialog(t('hist.restore'), t('hist.restoreConfirm')))) return;
          await forceSnap(cv);
          const c = clone(picked); c.id = cv.id; c.name = cv.name; c.updatedAt = Date.now();
          S.cvs[S.cvs.indexOf(cv)] = c;
          persistCvs(); close(); switchCv(c.id); toast(t('hist.restored'), 'ok');
        } },
      ],
    });
  }

  /* ================================================================ meslek şablonuyla yeni CV ================ */
  function newCvDialog() {
    const lang = S.settings.uiLang;
    let pick = 'general';
    const name = h('input', { class: 'input', value: t('untitledCv') });
    const fill = h('input', { type: 'checkbox', checked: true });
    const cvLangSel = h('select', { class: 'input' }, ['auto', 'tr', 'en', 'ar'].map((l) => h('option', { value: l }, t('lang.' + l))));
    const grid = h('div', { class: 'prof-grid' }, Object.entries(AV.PROFESSIONS).map(([k, p]) => h('button', { class: `prof${k === pick ? ' on' : ''}`, 'data-k': k, onclick: (e) => {
      pick = k; grid.querySelectorAll('.prof').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      if (p.title && (!name.value || name.value === t('untitledCv') || Object.values(AV.PROFESSIONS).some((x) => x.title && Object.values(x.title).includes(name.value)))) name.value = p.title[lang] || p.title.en;
      else if (!p.title && Object.values(AV.PROFESSIONS).some((x) => x.title && Object.values(x.title).includes(name.value))) name.value = t('untitledCv');
      e.currentTarget.blur();
    } }, h('span', { class: 'prof-icon' }, p.icon), h('b', null, t('prof.' + k)), h('span', { class: 'muted small' }, t('prof.' + k + '.d')))));
    modal({
      title: t('cvNew'), wide: true,
      body: h('div', null, grid,
        h('div', { class: 'field-grid', style: 'margin-top:14px' },
          h('label', { class: 'ed-field' }, h('span', null, t('cvNamePrompt')), name),
          h('label', { class: 'ed-field' }, h('span', null, t('cvLanguage')), cvLangSel),
          h('label', { class: 'ed-check full' }, fill, t('prof.fill')))),
      buttons: [{ label: t('cancel') }, { label: t('create'), kind: 'primary', action: (close) => {
        close();
        createFromProfession(pick, name.value.trim() || t('untitledCv'), fill.checked, cvLangSel.value);
      } }],
    });
  }
  function createFromProfession(key, name, fill, cvLang) {
    const p = AV.PROFESSIONS[key];
    const cv = newCv(name);
    cv.lang = cvLang || 'auto';
    const L = cv.lang === 'auto' ? S.settings.uiLang : cv.lang;
    cv.sections = p.sections.map((type) => newSection(type));
    const tpl = BUILTIN_TEMPLATES.find((x) => x.id === p.template);
    if (tpl) cv.design = pickDesign(tpl);
    if (fill && p.title) cv.personal.jobTitle.value = p.title[L] || p.title.en;
    if (fill && p.skills) {
      const s = cv.sections.find((x) => x.type === 'skills');
      if (s) s.items = (p.skills[L] || p.skills.en).map((n) => Object.assign(newItem('skills'), { name: n }));
    }
    if (fill && p.aviation) {
      const lg = cv.sections.find((x) => x.type === 'languages');
      if (lg) lg.items = [Object.assign(newItem('languages'), { name: tr(L, 'lang.en.name'), level: 'advanced', icao: key === 'pilot' || key === 'atc' ? '4' : '' })];
    }
    if (key === 'ats') cv.photo.visible = false;
    if (cv.sections.find((x) => x.type === 'references')) cv.sections.find((x) => x.type === 'references').items = [];
    if (cv.sections.find((x) => x.type === 'documents')) cv.sections.find((x) => x.type === 'documents').items = [];
    S.cvs.push(normalizeCv(cv));
    persistCvs();
    switchCv(cv.id);
    Pro.openTab('content');
    toast(t('prof.created'), 'ok');
  }

  /* ================================================================ içe / dışa aktarma ================ */
  const pickFile = (accept) => new Promise((res) => {
    const i = h('input', { type: 'file', accept, hidden: true, onchange: () => res(i.files[0] || null) });
    document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000);
  });
  const readText = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });

  /* ---- JSON Resume (jsonresume.org v1) ---- */
  const LEVEL_TO_JR = { native: 'Native speaker', fluent: 'Fluent', advanced: 'Advanced', intermediate: 'Intermediate', beginner: 'Elementary' };
  const JR_TO_LEVEL = (s) => { s = String(s || '').toLowerCase(); return /native|mother|ana dil/.test(s) ? 'native' : /fluent|c2|full professional/.test(s) ? 'fluent' : /advanced|c1|professional working/.test(s) ? 'advanced' : /intermediate|b1|b2|limited/.test(s) ? 'intermediate' : s ? 'beginner' : ''; };
  const visibleItems = (cv, type) => cv.sections.filter((s) => s.type === type && s.visible).flatMap((s) => s.items.filter((i) => i.visible !== false));
  const ymd = (v) => String(v || '');
  function toJsonResume(cv) {
    const P = cv.personal, v = (k) => (P[k] && P[k].visible !== false ? String(P[k].value || '') : '');
    const profiles = [['LinkedIn', v('linkedin')], ['GitHub', v('github')]].filter((x) => x[1]).map(([network, url]) => ({ network, url }));
    const summary = visibleItems(cv, 'summary').map((x) => x.text).join('\n\n');
    return {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: { name: v('fullName'), label: v('jobTitle'), image: '', email: v('email'), phone: (P.phone.numbers || []).map((n) => n.value).filter(Boolean)[0] || '', url: v('website'), summary, location: { address: v('address') }, profiles },
      work: visibleItems(cv, 'experience').map((x) => ({ name: x.company, position: x.position, location: x.location, startDate: ymd(x.start), endDate: x.current ? '' : ymd(x.end), summary: '', highlights: AIx(x.description) })),
      volunteer: visibleItems(cv, 'volunteer').map((x) => ({ organization: x.organization, position: x.role, startDate: ymd(x.start), endDate: x.current ? '' : ymd(x.end), highlights: AIx(x.description) })),
      education: visibleItems(cv, 'education').map((x) => ({ institution: x.school, area: x.field, studyType: x.degree, startDate: ymd(x.start), endDate: x.current ? '' : ymd(x.end), score: x.grade })),
      awards: visibleItems(cv, 'awards').map((x) => ({ title: x.title, date: ymd(x.date), awarder: x.issuer, summary: x.description })),
      certificates: [...visibleItems(cv, 'certificates').map((x) => ({ name: x.name, date: ymd(x.date), issuer: x.issuer, url: x.url })),
        ...visibleItems(cv, 'licences').map((x) => ({ name: x.name, date: ymd(x.date), issuer: x.authority })),
        ...visibleItems(cv, 'typeRatings').map((x) => ({ name: `Type rating: ${x.aircraft}${x.privilege ? ' (' + x.privilege + ')' : ''}`, date: ymd(x.date) }))],
      publications: visibleItems(cv, 'publications').map((x) => ({ name: x.title, publisher: x.publisher, releaseDate: ymd(x.date), url: x.url, summary: x.description })),
      skills: visibleItems(cv, 'skills').map((x) => ({ name: x.name, level: x.level ? String(x.level) + '/5' : '' })),
      languages: visibleItems(cv, 'languages').map((x) => ({ language: x.name, fluency: [LEVEL_TO_JR[x.level] || '', x.icao ? 'ICAO Level ' + x.icao : ''].filter(Boolean).join(', ') })),
      interests: visibleItems(cv, 'hobbies').map((x) => ({ name: x.name })),
      references: visibleItems(cv, 'references').map((x) => ({ name: x.name, reference: [x.position, x.company].filter(Boolean).join(', ') })),
      projects: visibleItems(cv, 'projects').map((x) => ({ name: x.name, description: x.description, startDate: ymd(x.start), endDate: x.current ? '' : ymd(x.end), url: x.url, roles: x.role ? [x.role] : [] })),
      meta: { canonical: '', version: 'v1.0.0', lastModified: new Date(cv.updatedAt || Date.now()).toISOString(), generator: 'CV Maker' },
    };
  }
  function AIx(text) { return String(text || '').split(/\r?\n/).map((l) => l.replace(/^\s*[-•*▪–]\s+/, '').trim()).filter(Boolean); }
  const jrDate = (s) => { const m = String(s || '').match(/^(\d{4})(?:-(\d{2}))?/); return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : ''; };
  const bulletsOf = (arr, sum) => [sum || '', ...(arr || []).map((x) => '- ' + x)].filter(Boolean).join('\n');
  function fromJsonResume(j) {
    const b = j.basics || {};
    const cv = newCv(b.name || 'JSON Resume');
    const P = cv.personal;
    P.fullName.value = b.name || ''; P.jobTitle.value = b.label || ''; P.email.value = b.email || ''; P.website.value = b.url || '';
    P.address.value = [b.location && b.location.address, b.location && b.location.city, b.location && b.location.countryCode].filter(Boolean).join(', ');
    if (b.phone) P.phone.numbers = [newPhone(b.phone)];
    for (const p of b.profiles || []) { if (/linkedin/i.test(p.network)) P.linkedin.value = p.url || p.username || ''; if (/github/i.test(p.network)) P.github.value = p.url || p.username || ''; }
    const sec = (type, items) => { const s = newSection(type, false); s.items = items.map((x) => Object.assign(newItem(type), x)); return s; };
    cv.sections = [
      sec('summary', b.summary ? [{ text: b.summary }] : []),
      sec('experience', (j.work || []).map((w) => ({ position: w.position, company: w.name || w.company, location: w.location || '', start: jrDate(w.startDate), end: jrDate(w.endDate), current: !w.endDate && !!w.startDate, description: bulletsOf(w.highlights, w.summary) }))),
      sec('education', (j.education || []).map((e) => ({ degree: e.studyType, school: e.institution, field: e.area, start: jrDate(e.startDate), end: jrDate(e.endDate), grade: e.score || '' }))),
      sec('skills', (j.skills || []).map((s) => ({ name: s.name, level: Number(String(s.level || '').match(/\d/)) || 3 }))),
      sec('languages', (j.languages || []).map((l) => ({ name: l.language, level: JR_TO_LEVEL(l.fluency), icao: (String(l.fluency || '').match(/ICAO[^\d]*(\d)/i) || [])[1] || '' }))),
      sec('certificates', (j.certificates || []).map((c) => ({ name: c.name, issuer: c.issuer, date: jrDate(c.date), url: c.url || '' }))),
      sec('projects', (j.projects || []).map((p) => ({ name: p.name, role: (p.roles || [])[0] || '', start: jrDate(p.startDate), end: jrDate(p.endDate), url: p.url || '', description: bulletsOf(p.highlights, p.description) }))),
      sec('volunteer', (j.volunteer || []).map((v) => ({ role: v.position, organization: v.organization, start: jrDate(v.startDate), end: jrDate(v.endDate), description: bulletsOf(v.highlights, v.summary) }))),
      sec('awards', (j.awards || []).map((a) => ({ title: a.title, issuer: a.awarder, date: jrDate(a.date), description: a.summary || '' }))),
      sec('publications', (j.publications || []).map((p) => ({ title: p.name, publisher: p.publisher, date: jrDate(p.releaseDate), url: p.url || '', description: p.summary || '' }))),
      sec('hobbies', (j.interests || []).map((i) => ({ name: i.name }))),
      sec('references', (j.references || []).map((r) => ({ name: r.name, position: r.reference || '' }))),
    ].filter((s) => s.items.length || ['summary', 'experience', 'education', 'skills', 'languages'].includes(s.type));
    return normalizeCv(cv);
  }

  /* ---- Europass XML (SkillsPassport v3.4) ---- */
  const CEFR = { fluent: 'C2', advanced: 'C1', intermediate: 'B1', beginner: 'A2' };
  function xmlEsc(s) { return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])); }
  function epDate(tag, v) {
    const [y, m, d] = String(v || '').split('-');
    if (!y) return '';
    return `<${tag} year="${y}"${m ? ` month="--${m}"` : ''}${d ? ` day="---${d}"` : ''}/>`;
  }
  function toEuropass(cv) {
    const P = cv.personal, v = (k) => (P[k] && P[k].visible !== false ? String(P[k].value || '').trim() : '');
    const lang = cv.lang && cv.lang !== 'auto' ? cv.lang : S.settings.uiLang;
    const parts = v('fullName').split(/\s+/);
    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : v('fullName'), last = parts.length > 1 ? parts.slice(-1)[0] : '';
    const html = (t2) => xmlEsc(String(t2 || '').split(/\r?\n/).filter(Boolean).map((l) => /^\s*[-•*▪–]\s+/.test(l) ? '<li>' + l.replace(/^\s*[-•*▪–]\s+/, '') + '</li>' : '<p>' + l + '</p>').join('').replace(/(<li>.*?<\/li>)+/g, (m) => '<ul>' + m + '</ul>'));
    const period = (it) => `<Period>${epDate('From', it.start)}${it.current ? '<Current>true</Current>' : epDate('To', it.end)}</Period>`;
    const phones = (P.phone.visible !== false ? P.phone.numbers : []).filter((n) => n.value).map((n) => `<Telephone><Contact>${xmlEsc(n.value)}</Contact><Use><Code>mobile</Code></Use></Telephone>`).join('');
    const langs = visibleItems(cv, 'languages');
    const mother = langs.filter((l) => l.level === 'native');
    const foreign = langs.filter((l) => l.level !== 'native');
    const certs = [...visibleItems(cv, 'licences').map((x) => ({ title: x.name, desc: [x.authority, x.number].filter(Boolean).join(' – '), date: x.date })),
      ...visibleItems(cv, 'typeRatings').map((x) => ({ title: x.aircraft, desc: x.privilege, date: x.date })),
      ...visibleItems(cv, 'certificates').map((x) => ({ title: x.name, desc: x.issuer, date: x.date }))];
    const hours = visibleItems(cv, 'flightHours');
    const other = [visibleItems(cv, 'skills').map((x) => x.name).join(', '), hours.length ? hours.map((x) => `${x.aircraft}: ${x.total || 0} h${x.pic ? ' (PIC ' + x.pic + ')' : ''}`).join('; ') : ''].filter(Boolean).join('\n');
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    return `<?xml version="1.0" encoding="UTF-8"?>
<SkillsPassport xmlns="http://europass.cedefop.europa.eu/Europass" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://europass.cedefop.europa.eu/Europass http://europass.cedefop.europa.eu/xml/v3.4.0/EuropassSchema.xsd" locale="${lang}">
  <DocumentInfo><DocumentType>ECV</DocumentType><CreationDate>${now}</CreationDate><LastUpdateDate>${now}</LastUpdateDate><XSDVersion>V3.4</XSDVersion><Generator>CV Maker</Generator><Comment>CV Maker</Comment></DocumentInfo>
  <LearnerInfo>
    <Identification>
      <PersonName><FirstName>${xmlEsc(first)}</FirstName><Surname>${xmlEsc(last)}</Surname></PersonName>
      <ContactInfo>
        ${v('address') ? `<Address><Contact><AddressLine>${xmlEsc(v('address'))}</AddressLine></Contact></Address>` : ''}
        ${v('email') ? `<Email><Contact>${xmlEsc(v('email'))}</Contact></Email>` : ''}
        ${phones ? `<TelephoneList>${phones}</TelephoneList>` : ''}
        ${v('website') || v('linkedin') ? `<WebsiteList>${[v('website'), v('linkedin')].filter(Boolean).map((u) => `<Website><Contact>${xmlEsc(u)}</Contact><Use><Code>personal</Code></Use></Website>`).join('')}</WebsiteList>` : ''}
      </ContactInfo>
      ${v('birthDate') || v('nationality') ? `<Demographics>${epDate('Birthdate', v('birthDate'))}${v('nationality') ? `<NationalityList><Nationality><Label>${xmlEsc(v('nationality'))}</Label></Nationality></NationalityList>` : ''}</Demographics>` : ''}
    </Identification>
    ${v('jobTitle') ? `<Headline><Type><Code>position</Code><Label>Position</Label></Type><Description><Label>${xmlEsc(v('jobTitle'))}</Label></Description></Headline>` : ''}
    <WorkExperienceList>${visibleItems(cv, 'experience').map((x) => `
      <WorkExperience>${period(x)}<Position><Label>${xmlEsc(x.position)}</Label></Position><Activities>${html(x.description)}</Activities><Employer><Name>${xmlEsc(x.company)}</Name>${x.location ? `<ContactInfo><Address><Contact><Municipality>${xmlEsc(x.location)}</Municipality></Contact></Address></ContactInfo>` : ''}</Employer></WorkExperience>`).join('')}
    </WorkExperienceList>
    <EducationList>${visibleItems(cv, 'education').map((x) => `
      <Education>${period(x)}<Title>${xmlEsc([x.degree, x.field].filter(Boolean).join(' – '))}</Title><Activities>${html(x.description)}</Activities><Organisation><Name>${xmlEsc(x.school)}</Name></Organisation></Education>`).join('')}${certs.map((c) => `
      <Education>${c.date ? `<Period>${epDate('From', c.date)}</Period>` : ''}<Title>${xmlEsc(c.title)}</Title><Activities>${xmlEsc(c.desc || '')}</Activities></Education>`).join('')}
    </EducationList>
    <Skills>
      <Linguistic>
        <MotherTongueList>${mother.map((l) => `<MotherTongue><Description><Label>${xmlEsc(l.name)}</Label></Description></MotherTongue>`).join('')}</MotherTongueList>
        <ForeignLanguageList>${foreign.map((l) => { const c = CEFR[l.level] || 'B1'; return `<ForeignLanguage><Description><Label>${xmlEsc(l.name)}</Label></Description><ProficiencyLevel><Listening>${c}</Listening><Reading>${c}</Reading><SpokenInteraction>${c}</SpokenInteraction><SpokenProduction>${c}</SpokenProduction><Writing>${c}</Writing></ProficiencyLevel>${l.icao ? `<Certificate><Title>ICAO Language Proficiency Level ${l.icao}</Title></Certificate>` : ''}</ForeignLanguage>`; }).join('')}</ForeignLanguageList>
      </Linguistic>
      ${other ? `<Other><Description>${xmlEsc(other)}</Description></Other>` : ''}
      ${v('drivingLicense') ? `<Driving><Description><Licence>${xmlEsc(v('drivingLicense'))}</Licence></Description></Driving>` : ''}
    </Skills>
  </LearnerInfo>
</SkillsPassport>
`;
  }

  /* ---- LinkedIn "PDF olarak kaydet" profil dosyası ---- */
  const HEAD = {
    contact: /^(contact|iletişim|معلومات الاتصال|kontakt|coordonnées)$/i,
    skills: /^(top skills|en önemli yetenekler|başlıca yetenekler|أهم المهارات|top-kenntnisse|principales compétences)$/i,
    languages: /^(languages|diller|اللغات|sprachen|langues)$/i,
    certificates: /^(certifications|sertifikalar|الشهادات|bescheinigungen|certifications)$/i,
    awards: /^(honors-awards|honors & awards|ödüller|onur ve ödüller|الأوسمة والجوائز)$/i,
    publications: /^(publications|yayınlar|المنشورات)$/i,
    summary: /^(summary|özet|الملخص|zusammenfassung|résumé)$/i,
    experience: /^(experience|deneyim|الخبرة|berufserfahrung|expérience)$/i,
    education: /^(education|eğitim|التعليم|ausbildung|formation)$/i,
  };
  const MONTHS = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12,
    'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  };
  const PRESENT = /^(present|halen|günümüz|الحالي|حتى الآن|heute|aujourd'hui)$/i;
  function lnDate(s) {
    s = String(s || '').trim();
    if (PRESENT.test(s)) return { current: true };
    const m = s.match(/^(\S+)\s+(\d{4})$/);
    if (m && MONTHS[m[1].toLocaleLowerCase('tr-TR')]) return { v: `${m[2]}-${String(MONTHS[m[1].toLocaleLowerCase('tr-TR')]).padStart(2, '0')}` };
    const y = s.match(/^(\d{4})$/);
    return y ? { v: y[1] } : null;
  }
  const RANGE = /^(.+?)\s*[-–]\s*(.+?)(?:\s*\((.*)\))?$/;
  function parseRange(line) {
    const m = String(line).match(RANGE);
    if (!m) return null;
    const a = lnDate(m[1]), b = lnDate(m[2]);
    if (!a || !a.v || !b) return null;
    return { start: a.v, end: b.v || '', current: !!b.current };
  }
  async function readPdfLines(buf) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const rows = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const x = it.transform[4], y = vp.height - it.transform[5], size = Math.abs(it.transform[3]) || it.height;
        const col = x < vp.width * 0.33 ? 'L' : 'R';
        const row = rows.find((r) => r.col === col && Math.abs(r.y - y) < 2.5);
        if (row) { row.text += (row.lastX + 1 < x ? ' ' : '') + it.str; row.lastX = x + it.width; row.size = Math.max(row.size, size); }
        else rows.push({ col, y, x, size, text: it.str, lastX: x + it.width, page: p });
      }
      rows.sort((a, b) => (a.col === b.col ? a.y - b.y : a.col === 'L' ? -1 : 1));
      out.push(...rows.map((r) => ({ col: r.col, size: r.size, text: r.text.replace(/\s+/g, ' ').trim(), page: p })));
    }
    // sayfa altlıklarını ("Page 1 of 3") at
    return out.filter((r) => !/^(page|sayfa|صفحة)\s+\d+\s+(of|\/|من)\s+\d+$/i.test(r.text));
  }
  function parseLinkedIn(lines) {
    const cv = newCv('LinkedIn');
    const P = cv.personal;
    const L = lines.filter((r) => r.col === 'L'), R = lines.filter((r) => r.col === 'R');
    // sol sütun: başlık → satırlar
    const left = {}; let cur = null;
    for (const r of L) { const k = Object.keys(HEAD).find((x) => HEAD[x].test(r.text)); if (k) { cur = k; left[k] = []; } else if (cur) left[cur].push(r.text); }
    for (const x of left.contact || []) {
      if (/@/.test(x) && !P.email.value) P.email.value = x.replace(/\s/g, '');
      else if (/linkedin\.com/i.test(x)) P.linkedin.value = (P.linkedin.value + x).replace(/\s*\((linkedin|link)\)\s*/i, '').replace(/\s/g, '');
      else if (/^\+?[\d\s()-]{7,}/.test(x) && !P.phone.numbers[0].value) P.phone.numbers = [newPhone(x.replace(/\s*\((mobile|cep|mobil|جوال|home|work)\)/i, '').trim())];
      else if (/^(https?:\/\/|www\.)/i.test(x) && !P.website.value) P.website.value = x.replace(/\s*\(.*\)$/, '');
    }
    // sağ sütun: ad (en büyük yazı), unvan, konum, sonra bölümler
    const maxSize = Math.max(...R.map((r) => r.size));
    const nameIdx = R.findIndex((r) => r.size >= maxSize - 0.5);
    if (nameIdx >= 0) P.fullName.value = R[nameIdx].text;
    const sec = {}; cur = null;
    const head = [];
    for (let i = nameIdx + 1; i < R.length; i++) {
      const r = R[i];
      const k = Object.keys(HEAD).find((x) => HEAD[x].test(r.text));
      if (k) { cur = k; sec[k] = []; continue; }
      if (cur) sec[cur].push(r); else head.push(r.text);
    }
    if (head[0]) P.jobTitle.value = head[0];
    if (head.length > 1) P.address.value = head[head.length - 1];
    const S2 = (type, items) => { const s = newSection(type, false); s.items = items.map((x) => Object.assign(newItem(type), x)); return s; };
    const summary = (sec.summary || []).map((r) => r.text).join(' ');
    // deneyim: tarih satırına göre çözümle
    const exp = [];
    const E = sec.experience || [];
    let company = '';
    for (let i = 0; i < E.length; i++) {
      const rg = parseRange(E[i].text);
      if (!rg) continue;
      const title = E[i - 1] ? E[i - 1].text : '';
      const before = E[i - 2] ? E[i - 2].text : '';
      // tek şirkette birden çok görev: şirket satırının altında toplam süre satırı olur ("3 years 2 months")
      if (before && !parseRange(before) && !/^\d+\s*(year|yıl|ay|month|سنة|شهر)/i.test(before) && !exp.some((x) => x._descEnd === i - 2)) company = before;
      else if (E[i - 3] && /^\d+\s*(year|yıl|ay|month|سنة|شهر)/i.test(before)) company = E[i - 3].text;
      let j = i + 1;
      let location = '';
      if (E[j] && E[j].size <= E[i].size + 0.1 && E[j].text.length < 60 && /,|türkiye|turkey|emirates|arabia|qatar|area|bölgesi|المنطقة/i.test(E[j].text)) { location = E[j].text; j++; }
      const desc = [];
      while (j < E.length && !(E[j + 2] && parseRange(E[j + 2].text)) && !parseRange(E[j].text)) { desc.push(E[j].text); j++; }
      exp.push({ position: title, company, location, start: rg.start, end: rg.end, current: rg.current, description: desc.join('\n').replace(/^[•▪-]\s*/gm, '- '), _descEnd: j - 1 });
    }
    exp.forEach((x) => delete x._descEnd);
    // eğitim: okul satırı + "Derece, Alan · (2011 - 2015)"
    const edu = [];
    const Ed = sec.education || [];
    for (let i = 0; i < Ed.length; i++) {
      const m = Ed[i].text.match(/^(.*?)\s*·?\s*\((\d{4}|\S+ \d{4})\s*[-–]\s*(\d{4}|\S+ \d{4})?\)$/);
      if (!m) continue;
      const [deg, field] = m[1].split(/,\s*/);
      const a = lnDate(m[2]), b = m[3] ? lnDate(m[3]) : null;
      edu.push({ school: Ed[i - 1] ? Ed[i - 1].text : '', degree: deg || '', field: field || '', start: a && a.v || '', end: b && b.v || '' });
    }
    if (!edu.length) for (let i = 0; i + 1 < Ed.length; i += 2) edu.push({ school: Ed[i].text, degree: Ed[i + 1].text });
    cv.sections = [
      S2('summary', summary ? [{ text: summary }] : []),
      S2('experience', exp),
      S2('education', edu),
      S2('skills', (left.skills || []).map((n) => ({ name: n }))),
      S2('languages', (left.languages || []).map((x) => { const m = x.match(/^(.*?)\s*\((.*)\)$/); return { name: m ? m[1] : x, level: m ? JR_TO_LEVEL(m[2]) : '' }; })),
      S2('certificates', (left.certificates || []).map((n) => ({ name: n }))),
      S2('awards', (left.awards || []).map((n) => ({ title: n }))),
    ].filter((s) => s.items.length || ['summary', 'experience', 'education'].includes(s.type));
    cv.name = P.fullName.value ? `${P.fullName.value} (LinkedIn)` : 'LinkedIn';
    return normalizeCv(cv);
  }
  async function importLinkedIn() {
    const f = await pickFile('.pdf,application/pdf');
    if (!f) return;
    try {
      const lines = await readPdfLines(new Uint8Array(await f.arrayBuffer()));
      const cv = parseLinkedIn(lines);
      cv.design = clone(S.cur.design);
      S.cvs.push(cv); persistCvs(); switchCv(cv.id); Pro.openTab('content');
      const n = cv.sections.reduce((a, s) => a + s.items.length, 0);
      toast(t('imp.linkedinDone', { n }), 'ok', 9000);
    } catch (e) {
      console.error(e);
      toast(t('imp.linkedinFail'), 'err', 7000);
    }
  }
  async function importJsonResume() {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const cv = fromJsonResume(JSON.parse(await readText(f)));
      cv.design = clone(S.cur.design);
      S.cvs.push(cv); persistCvs(); switchCv(cv.id); Pro.openTab('content');
      toast(t('imported'), 'ok');
    } catch { toast(t('importFailed'), 'err'); }
  }
  async function exportJsonResume() {
    if (await api.saveText({ title: t('exp.jsonResume'), defaultName: S.cur.name + '.json', ext: 'json', text: JSON.stringify(toJsonResume(S.cur), null, 2), open: true })) toast(t('saved'), 'ok');
  }
  async function exportEuropass() {
    if (await api.saveText({ title: t('exp.europass'), defaultName: S.cur.name + ' - Europass.xml', ext: 'xml', text: toEuropass(S.cur), open: true })) toast(t('exp.europassDone'), 'ok', 7000);
  }

  /* ================================================================ Ayarlar kartları ================ */
  function aiSettingsCard() {
    const ui = FC.ui;
    const c = ui.card({ key: 'cv-ai', title: t('ai.title'), icon: 'sparkles' });
    const a = Object.assign({ provider: 'gemini', key: '', model: '' }, FC.storage.get('ai', null) || {});
    const l = Object.assign({ on: false, url: 'http://127.0.0.1:11434', model: 'llama3.1' }, FC.storage.get('ai.local', null) || {});
    const AI = FC.onboarding.AI;
    const prov = h('select', { class: 'input' }, Object.keys(AI).map((k) => h('option', { value: k, selected: a.provider === k }, AI[k].name)));
    const key = h('input', { class: 'input ltr', type: 'password', dir: 'ltr', value: a.key, placeholder: t('ai.keyPh'), autocomplete: 'off' });
    const model = h('input', { class: 'input ltr', dir: 'ltr', value: a.model || '', placeholder: AIX.MODELS[a.provider] || '' });
    const link = h('div', { class: 'small' });
    const status = h('div', { class: 'small' });
    const drawLink = () => { link.replaceChildren(h('a', { href: '#', onclick: (e) => { e.preventDefault(); FC.ui.openUrl(AI[prov.value].key); } }, '↗ ' + t('ai.getKey', { p: AI[prov.value].name })), h('div', { class: 'muted' }, FC.t('fc.ai.' + prov.value + '.note'))); model.placeholder = AIX.MODELS[prov.value] || ''; };
    prov.onchange = drawLink; drawLink();
    const save = () => { const v = { provider: prov.value, key: key.value.trim(), model: model.value.trim() }; FC.storage.set('ai', v); return v; };
    key.onchange = save; model.onchange = save;
    const test = h('button', { class: 'btn small', onclick: async () => {
      const v = save();
      status.textContent = t('ai.testing');
      const r = await FC.onboarding.testAi(v.provider, v.key);
      status.textContent = r === 'ok' ? '✔ ' + t('ai.keyOk') : r === 'bad' ? '✖ ' + t('ai.keyBad') : '… ' + t('ai.keyUnknown');
    } }, t('ai.test'));
    const clear = h('button', { class: 'btn small danger-ghost', onclick: () => { key.value = ''; save(); status.textContent = t('ai.keyRemoved'); } }, t('ai.removeKey'));
    // yerel model (Ollama)
    const lOn = h('input', { type: 'checkbox', checked: l.on });
    const lUrl = h('input', { class: 'input ltr', dir: 'ltr', value: l.url });
    const lModel = h('input', { class: 'input ltr', dir: 'ltr', value: l.model });
    const lStatus = h('div', { class: 'small' });
    const saveL = () => FC.storage.set('ai.local', { on: lOn.checked, url: lUrl.value.trim() || 'http://127.0.0.1:11434', model: lModel.value.trim() });
    for (const x of [lOn, lUrl, lModel]) x.onchange = saveL;
    const lTest = h('button', { class: 'btn small', onclick: async () => {
      saveL(); lStatus.textContent = t('ai.testing');
      try {
        const r = await fetch((lUrl.value.trim() || 'http://127.0.0.1:11434').replace(/\/+$/, '') + '/api/tags');
        const j = await r.json();
        const names = (j.models || []).map((m) => m.name);
        lStatus.textContent = names.length ? '✔ ' + t('ai.localOk', { m: names.slice(0, 6).join(', ') }) : t('ai.localNoModel');
        if (names.length && !names.some((n) => n.startsWith(lModel.value.trim()))) { lModel.value = names[0]; saveL(); }
      } catch { lStatus.textContent = '✖ ' + t('ai.localFail'); }
    } }, t('ai.test'));
    c.append(
      h('p', { class: 'card-desc' }, t('ai.settingsDesc')),
      h('div', { class: 'field-grid' },
        h('label', { class: 'ed-field' }, h('span', null, t('ai.provider')), prov),
        h('label', { class: 'ed-field' }, h('span', null, t('ai.model')), model),
        h('label', { class: 'ed-field full' }, h('span', null, t('ai.key')), key)),
      link, h('div', { class: 'row-btns' }, test, clear), status,
      h('h4', { class: 'set-sub' }, '🖥 ' + t('ai.localTitle')),
      h('p', { class: 'muted small' }, t('ai.localDesc')),
      h('label', { class: 'ed-check' }, lOn, t('ai.localOn')),
      h('div', { class: 'field-grid' }, h('label', { class: 'ed-field' }, h('span', null, t('ai.localUrl')), lUrl), h('label', { class: 'ed-field' }, h('span', null, t('ai.model')), lModel)),
      h('div', { class: 'row-btns' }, lTest, h('button', { class: 'btn small', onclick: () => FC.ui.openUrl('https://ollama.com/download') }, '↗ Ollama')), lStatus,
      h('p', { class: 'muted small' }, t('ai.offlineNote')));
    return c;
  }
  function privacyCard() {
    const c = FC.ui.card({ key: 'cv-privacy', title: t('sec.privacy'), icon: 'shield' });
    const body = h('div');
    const draw = async () => {
      const s = await api.securityGet();
      const box = h('input', { type: 'checkbox', checked: s.encrypt, disabled: !s.available && !s.encrypt });
      box.onchange = async () => {
        const on = box.checked;
        if (!(await confirmDialog(t('sec.encrypt'), on ? t('sec.encryptOnConfirm') : t('sec.encryptOffConfirm')))) { box.checked = !on; return; }
        try { await api.securitySet(on); toast(on ? t('sec.encryptedOk') : t('sec.decryptedOk'), 'ok', 6000); } catch (e) { toast(t('sec.encryptFail') + ': ' + (e.message || e), 'err', 8000); }
        draw();
      };
      fillEl(body,
        h('label', { class: 'check' }, box, t('sec.encrypt')),
        h('p', { class: 'muted small' }, s.available ? t('sec.encryptDesc') : t('sec.encryptNA')),
        s.encrypt ? h('p', { class: 'small warn-text' }, '⚠ ' + t('sec.encryptWarn')) : null,
        h('p', { class: 'muted small' }, t('sec.historyDesc')),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn small', onclick: () => { document.querySelector('.cv-settings .modal-header .icon-btn')?.click(); historyDialog(); } }, '🕘 ' + t('hist.title')),
          h('button', { class: 'btn small', onclick: () => { document.querySelector('.cv-settings .modal-header .icon-btn')?.click(); Pro.shareExport(); } }, '🔒 ' + t('share.title'))));
    };
    draw();
    c.append(body);
    return c;
  }

  return {
    appsPanel, editApp, remindApps, onChanged, snapNow, forceSnap, historyDialog, newCvDialog, createFromProfession,
    importLinkedIn, importJsonResume, exportJsonResume, exportEuropass, toJsonResume, fromJsonResume, toEuropass, parseLinkedIn,
    aiSettingsCard, privacyCard, STATUSES,
  };
})();
