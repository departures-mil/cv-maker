'use strict';
/* global S, h, t, tr, modal, toast, confirmDialog, openMenu, changed, persistCvs, persistSettings, switchCv, renderEditor, renderPreview,
   renderCvSelect, resolvedCvLang, clone, uid, newItem, newSection, newCv, normalizeCv, buildModel, renderCvHtml, exportHtmlDocument,
   exportName, withBusy, allTemplates, FONTS, pickDesign, BUILTIN_TEMPLATES, SECTION_TYPES, CHK, AV, AIX, FC, api, setSetting, esc */
/* CV Maker 2.2 — "Analiz ve YZ" sekmesi: CV puanı ve denetimler, hedef ülke, tek sayfaya sığdırma, iş ilanı eşleşmesi ve
   yapay zekâ ile uyarlama, metin iyileştirme, ön yazı, 3 dilli çeviri kopyası, belge geçerlilik takvimi, paylaşım sürümü. */
/** replaceChildren, null/false öğeleri atlayarak ("null" yazısı çıkmasın). */
function fillEl(el, ...kids) { el.replaceChildren(...kids.flat().filter((x) => x !== null && x !== undefined && x !== false)); return el; }

const Pro = (() => {
  const cvLang = () => resolvedCvLang();
  const locale = () => ({ tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' }[S.settings.uiLang] || 'tr-TR');
  const isAv = (cv = S.cur) => AV.isAviationCv(cv);
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return String(d || ''); } };
  const fmtDay = (v) => { const x = AV.parseDay(v); return x ? fmtDate(x) : String(v || ''); };
  const region = (code) => { try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(code); } catch { return code; } };
  const fieldName = (k) => t('field.' + k);
  const busyBtn = async (btn, fn) => {
    const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> ' + esc(t('ai.working'));
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
  };
  const aiErr = (e) => {
    if (e && e.name === 'AbortError') return;
    const st = e && e.cause && e.cause.status;
    toast(st === 401 || st === 403 ? t('ai.errKey') : st === 429 ? t('ai.errQuota') : e && e.noAi ? t('ai.errNone') : t('ai.errNet'), 'err', 7000);
  };
  const viaNote = (via, provider) => h('p', { class: 'muted small ai-via' }, via === 'offline' ? '⚡ ' + t('ai.viaOffline') : via === 'local' ? '🖥 ' + t('ai.viaLocal') : '☁ ' + t('ai.viaCloud', { p: (FC.usage && FC.usage.PROVIDERS[provider] && FC.usage.PROVIDERS[provider].name) || provider || '' }));

  /* ---------------------------------------------------------------- analiz ---------- */
  let last = null;
  function analyze() {
    last = CHK.analyzeCv(S.cur, { lang: cvLang(), pages: S.pages || 0, templates: allTemplates() });
    return last;
  }
  function issueText(x) {
    const p = Object.assign({}, x.params);
    if (typeof p.item === 'string' && p.item.startsWith('@')) p.item = t(p.item.slice(1));
    if (p.f) p.f = fieldName(p.f);
    if (p.c) p.c = region(p.c);
    if (p.d) p.d = fmtDay(p.d);
    return t('chk.' + x.id, p);
  }
  /* önizleme araç çubuğundaki puan rozeti */
  function updateBadge() {
    const b = document.getElementById('score-badge');
    if (!b) return;
    const r = analyze();
    const err = r.issues.filter((x) => x.sev === 'error').length;
    b.className = `score-badge g-${r.grade}`;
    b.innerHTML = `<b>${r.score}</b><span>${esc(t('an.scoreShort'))}</span>${err ? `<i>${err}</i>` : ''}`;
    b.title = t('an.badgeTitle');
    b.onclick = () => openTab('analysis');
  }
  function openTab(name) {
    S.tab = name;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
    renderEditor();
  }
  /** Bir öğeyi içerik sekmesinde açıp gösterir. */
  function reveal(target) {
    if (!target) return;
    openTab('content');
    let sel = null;
    if (target.itemId) { S.open.add(target.sectionId); S.open.add(target.itemId); sel = `[data-id="${target.itemId}"]`; }
    else if (target.sectionId) { S.open.add(target.sectionId); sel = `[data-id="${target.sectionId}"]`; }
    else if (target.type) {
      const s = S.cur.sections.find((x) => x.type === target.type);
      if (s) { S.open.add(s.id); sel = `[data-id="${s.id}"]`; } else { addSection(target.type); return; }
    } else if (target.personal) { S.open.add(target.personal === 'photo' ? 'photo' : 'personal'); sel = target.personal === 'photo' ? '[data-id="photo"]' : `.prow[data-id="${target.personal}"]`; }
    renderEditor();
    setTimeout(() => {
      const el = sel && document.querySelector('#editor ' + sel);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
      const inp = el.querySelector('input:not([type=checkbox]):not([type=range]), textarea, select');
      if (inp) inp.focus({ preventScroll: true });
    }, 80);
  }
  function addSection(type) {
    const s = newSection(type);
    const docIdx = S.cur.sections.findIndex((x) => x.type === 'documents');
    if (docIdx >= 0) S.cur.sections.splice(docIdx, 0, s); else S.cur.sections.push(s);
    S.open.add(s.id); S.open.add(s.items[0] && s.items[0].id);
    changed(true);
    reveal({ sectionId: s.id, itemId: s.items[0] && s.items[0].id });
  }
  function applyFix(x) {
    const cv = S.cur;
    const f = x.fix || '';
    if (f === 'hidePhoto') { cv.photo.visible = false; changed(true); }
    else if (f.startsWith('hideField:')) { const k = f.slice(10); if (cv.personal[k]) cv.personal[k].visible = false; changed(true); }
    else if (f.startsWith('addSection:')) addSection(f.slice(11));
    else if (f === 'applyAts') { cv.design = Object.assign(pickDesign(BUILTIN_TEMPLATES.find((tp) => tp.id === 'ats')), {}); changed(true); toast(t('an.atsApplied'), 'ok'); }
    else if (f === 'skillText') { cv.design.skillStyle = 'text'; changed(true); }
    else if (f === 'fitPage') return fitPage();
    else if (f === 'addVisaField') {
      const c = { id: uid(), label: t('an.visaLabel'), labels: { tr: tr('tr', 'an.visaLabel'), en: tr('en', 'an.visaLabel'), ar: tr('ar', 'an.visaLabel') }, value: '', visible: true };
      cv.customFields.push(c); cv.personalOrder.push('c:' + c.id); changed(true); reveal({ personal: 'c:' + c.id });
      return;
    } else if (f === 'improve' && x.target) { reveal(x.target); return; }
    else if (f === 'addSummary') { reveal({ type: 'summary' }); return; }
    else if (x.target) { reveal(x.target); return; }
    renderEditor();
  }

  function scoreCard(r) {
    const counts = { error: 0, warn: 0, info: 0 };
    r.issues.forEach((x) => counts[x.sev]++);
    const deg = Math.round((r.score / 100) * 360);
    return h('div', { class: 'ed-card open static an-score' },
      h('div', { class: 'ed-card-body an-score-body' },
        h('div', { class: `an-ring g-${r.grade}`, style: `--deg:${deg}deg` }, h('div', null, h('b', null, String(r.score)), h('span', null, t('an.grade', { g: r.grade })))),
        h('div', { class: 'an-score-text' },
          h('h3', null, t('an.title')),
          h('p', { class: 'muted small' }, t('an.desc')),
          h('div', { class: 'an-counts' },
            h('span', { class: 'sev-chip error' }, t('an.errors', { n: counts.error })),
            h('span', { class: 'sev-chip warn' }, t('an.warns', { n: counts.warn })),
            h('span', { class: 'sev-chip info' }, t('an.infos', { n: counts.info })),
            h('span', { class: 'sev-chip' }, t('pagesApprox', { n: S.pages || 1 }))))));
  }
  function countryCard() {
    const cv = S.cur;
    const codes = Object.keys(CHK.COUNTRIES).sort((a, b) => region(a).localeCompare(region(b), locale()));
    const rule = CHK.countryRule(cv.targetCountry);
    const hint = rule ? t('an.cRule.' + CHK.COUNTRIES[cv.targetCountry]) : t('an.countryHint');
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '🌍'), h('span', { class: 'ed-card-title' }, t('an.country'))),
      h('div', { class: 'ed-card-body' },
        h('select', { class: 'input', onchange: (e) => { cv.targetCountry = e.target.value; changed(); renderEditor(); } },
          h('option', { value: '' }, t('an.countryNone')),
          codes.map((c) => h('option', { value: c, selected: cv.targetCountry === c }, region(c)))),
        h('p', { class: 'muted small' }, hint)));
  }
  function issuesCard(r) {
    const list = h('div', { class: 'an-issues' });
    if (!r.issues.length) list.append(h('div', { class: 'an-ok' }, '✔ ' + t('an.allGood')));
    for (const x of r.issues) {
      const canFix = x.fix && !/^(improve|addSummary)$/.test(x.fix);
      list.append(h('div', { class: `an-issue sev-${x.sev}` },
        h('span', { class: 'an-dot' }),
        h('div', { class: 'an-msg' }, issueText(x)),
        canFix ? h('button', { class: 'btn small primary', onclick: () => applyFix(x) }, t('an.fix'))
          : x.target || x.fix ? h('button', { class: 'btn small', onclick: () => applyFix(x) }, t('an.show')) : null));
    }
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '🔎'), h('span', { class: 'ed-card-title' }, t('an.issues')), h('span', { class: 'ed-badge' }, r.issues.length)),
      h('div', { class: 'ed-card-body' }, list,
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', onclick: fitPage }, '📏 ' + t('fit.title')),
          h('button', { class: 'btn', onclick: () => applyFix({ fix: 'applyAts' }) }, '🤖 ' + t('an.useAts')))));
  }

  /* ---------------------------------------------------------------- belge takvimi ---------- */
  function expiryCard() {
    const days = S.settings.expiryDays || 90;
    const list = AV.expiringItems(S.cvs, new Date(), 3650).filter((x) => x.daysLeft <= Math.max(days, 365));
    const rows = list.length ? list.map((x) => h('div', { class: `exp-row ${x.expired ? 'expired' : x.daysLeft <= days ? 'soon' : ''}` },
      h('span', { class: 'exp-days' }, x.expired ? t('exp.expired') : t('exp.left', { n: x.daysLeft })),
      h('div', { class: 'exp-text' }, h('b', null, x.title ? (x.title.startsWith('@') ? t(x.title.slice(1)) : x.title) : t('sec.' + x.type)), h('span', { class: 'muted small' }, ` · ${t('sec.' + x.type)} · ${fmtDay(x.expiry)}${x.cvId !== S.cur.id ? ' · ' + x.cvName : ''}`)),
      h('button', { class: 'btn small', onclick: () => { if (x.cvId !== S.cur.id) switchCv(x.cvId); reveal({ sectionId: x.sectionId, itemId: x.itemId }); } }, t('an.show'))))
      : [h('p', { class: 'muted small' }, t('exp.none'))];
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '📅'), h('span', { class: 'ed-card-title' }, t('exp.title'))),
      h('div', { class: 'ed-card-body' },
        h('p', { class: 'muted small' }, t('exp.desc')),
        h('div', { class: 'exp-list' }, rows),
        h('label', { class: 'ed-field inline' }, h('span', null, t('exp.remind')),
          h('select', { class: 'input', style: 'width:auto', onchange: (e) => { setSetting('expiryDays', Number(e.target.value)); renderEditor(); } },
            [30, 60, 90, 180].map((n) => h('option', { value: n, selected: n === days }, t('exp.days', { n })))))));
  }
  /** Açılışta: süresi dolan / dolacak belgeler için bildirim (günde bir kez). */
  function remindExpiry() {
    const days = S.settings.expiryDays || 90;
    const list = AV.expiringItems(S.cvs, new Date(), days);
    if (!list.length) return;
    const today = new Date().toISOString().slice(0, 10);
    if (FC.storage.get('cv.expiryNotified', '') === today) return;
    FC.storage.set('cv.expiryNotified', today);
    const expired = list.filter((x) => x.expired).length;
    const msg = expired ? t('exp.toastExpired', { n: expired, m: list.length - expired }) : t('exp.toastSoon', { n: list.length, d: list[0].daysLeft });
    const tst = toast(msg, expired ? 'err' : 'info', 9000);
    if (tst && tst.addEventListener) tst.addEventListener('click', () => openTab('analysis'));
    try { const n = new Notification('CV Maker', { body: msg, silent: false }); n.onclick = () => { window.focus(); openTab('analysis'); }; } catch { }
  }

  /* ---------------------------------------------------------------- tek sayfaya sığdır ---------- */
  function fitPage() {
    const cv = S.cur;
    const body = h('div', { class: 'fit' });
    const draw = () => {
      renderPreview();
      const pages = S.pages || 1;
      const now = new Date().getFullYear();
      const old = [];
      for (const s of cv.sections) if (s.type === 'experience' || s.type === 'education' || s.type === 'courses') {
        for (const it of s.items) {
          const end = it.current ? now : Number(String(it.end || it.start || '').slice(0, 4));
          if (end && now - end >= 12 && it.visible !== false) old.push({ s, it, end });
        }
      }
      const optional = cv.sections.filter((s) => ['references', 'hobbies', 'courses', 'volunteer', 'awards', 'publications', 'custom'].includes(s.type) && s.visible && s.items.length);
      const long = [];
      for (const s of cv.sections) for (const it of s.items) {
        const text = it.description || it.text || '';
        if (it.visible !== false && s.visible && text.split(/\s+/).length > 60) long.push({ s, it, n: text.split(/\s+/).length });
      }
      fillEl(body, 
        h('div', { class: `fit-pages ${pages <= 1 ? 'ok' : ''}` }, pages <= 1 ? '✔ ' + t('fit.onePage') : t('fit.nowPages', { n: pages })),
        h('p', { class: 'muted small' }, t('fit.desc')),
        h('h4', null, t('fit.step1')),
        h('label', { class: 'ed-check' }, h('input', { type: 'checkbox', checked: cv.design.density === 'compact', onchange: (e) => { cv.design.density = e.target.checked ? 'compact' : 'normal'; changed(); draw(); } }), t('fit.compact')),
        old.length ? h('h4', null, t('fit.step2')) : null,
        ...old.map((o) => h('label', { class: 'ed-check' }, h('input', { type: 'checkbox', checked: o.it.visible === false, onchange: (e) => { o.it.visible = !e.target.checked; changed(); draw(); } }),
          t('fit.hideOld', { item: SECTION_TYPES[o.s.type].summary(o.it) || '…', y: o.end }))),
        optional.length ? h('h4', null, t('fit.step3')) : null,
        ...optional.map((s) => h('label', { class: 'ed-check' }, h('input', { type: 'checkbox', checked: !s.visible, onchange: (e) => { s.visible = !e.target.checked; changed(); draw(); } }),
          t('fit.hideSection', { s: s.title || t('sec.' + s.type) }))),
        long.length ? h('h4', null, t('fit.step4')) : null,
        ...long.map((o) => h('div', { class: 'fit-long' }, h('span', null, t('fit.longItem', { item: SECTION_TYPES[o.s.type].summary(o.it) || t('sec.' + o.s.type), n: o.n })),
          h('button', { class: 'btn small', onclick: () => improveField(o.s, o.it, o.it.description !== undefined ? 'description' : 'text', null, { shorten: true, after: draw }) }, '✦ ' + t('fit.shorten')))),
        h('p', { class: 'muted small' }, t('fit.noShrink')));
    };
    draw();
    modal({ title: t('fit.title'), body, buttons: [{ label: t('close'), kind: 'primary' }] });
  }

  /* ---------------------------------------------------------------- iş ilanı eşleşmesi + uyarlama ---------- */
  function postingCard() {
    const cv = S.cur;
    const ta = h('textarea', { class: 'input', rows: 6, dir: 'auto', placeholder: t('job.placeholder') }, S.posting || '');
    ta.oninput = () => { S.posting = ta.value; };
    const out = h('div', { class: 'job-out' });
    const showMatch = () => {
      if (!ta.value.trim()) { toast(t('job.empty'), 'err'); return null; }
      const r = CHK.matchPosting(cv, ta.value);
      const add = (k) => {
        let s = cv.sections.find((x) => x.type === 'skills');
        if (!s) { s = newSection('skills', false); cv.sections.push(s); }
        s.items.push(Object.assign(newItem('skills'), { name: k.replace(/^\p{Ll}/u, (c) => c.toLocaleUpperCase(cvLang() === 'tr' ? 'tr-TR' : undefined)) }));
        changed(); showMatch();
      };
      fillEl(out, 
        h('div', { class: 'job-score' }, h('div', { class: 'bar' }, h('i', { style: `width:${r.score}%` })), h('b', null, `%${r.score}`), h('span', { class: 'muted small' }, t('job.matchDesc', { m: r.matched.length, n: r.keywords.length }))),
        r.matched.length ? h('div', { class: 'kw-group' }, h('span', { class: 'muted small' }, t('job.matched')), h('div', { class: 'chips' }, r.matched.map((k) => h('span', { class: 'kw ok' }, k)))) : null,
        r.missing.length ? h('div', { class: 'kw-group' }, h('span', { class: 'muted small' }, t('job.missing')), h('div', { class: 'chips' }, r.missing.map((k) => h('button', { class: 'kw miss', title: t('job.addSkill'), onclick: () => add(k) }, '＋ ' + k)))) : null,
        r.missing.length ? h('p', { class: 'muted small' }, t('job.missingHint')) : null);
      return r;
    };
    const aiBtn = h('button', { class: 'btn primary', onclick: () => busyBtn(aiBtn, () => tailorAi(ta.value)) }, '✦ ' + t('job.tailor'));
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '🎯'), h('span', { class: 'ed-card-title' }, t('job.title'))),
      h('div', { class: 'ed-card-body' },
        h('p', { class: 'muted small' }, t('job.desc')), ta,
        h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: showMatch }, '🔍 ' + t('job.analyze')), aiBtn),
        out));
  }
  async function tailorAi(posting) {
    if (!posting.trim()) { toast(t('job.empty'), 'err'); return; }
    let r;
    try { r = await AIX.tailor(S.cur, posting, cvLang(), isAv()); } catch (e) {
      // yapay zekâ yoksa çevrim dışı anahtar kelime eşleşmesi zaten kullanılabilir
      if (e && e.noAi) toast(t('job.offlineOnly'), 'info', 7000); else aiErr(e);
      return;
    }
    const d = r.data || {};
    const src = S.cur;
    const checks = {};
    const row = (key, label, content, on = true) => {
      checks[key] = h('input', { type: 'checkbox', checked: on });
      return h('label', { class: 'tl-row' }, checks[key], h('div', null, h('b', null, label), content));
    };
    const expItems = new Map();
    for (const s of src.sections) for (const it of s.items) expItems.set(it.id, { s, it });
    const bullets = (Array.isArray(d.bullets) ? d.bullets : []).filter((b) => b && expItems.has(b.itemId) && b.text);
    const skills = (Array.isArray(d.skills) ? d.skills : []).filter(Boolean).slice(0, 12);
    const skillChecks = skills.map((k) => { const c = h('input', { type: 'checkbox', checked: true }); return { k, c, el: h('label', { class: 'kw ok sel' }, c, k) }; });
    const body = h('div', { class: 'tailor' },
      h('div', { class: 'job-score' }, h('div', { class: 'bar' }, h('i', { style: `width:${Number(d.score) || 0}%` })), h('b', null, `%${Number(d.score) || 0}`), h('span', { class: 'muted small' }, t('job.aiFit'))),
      (d.missing || []).length ? h('div', { class: 'kw-group' }, h('span', { class: 'muted small' }, t('job.missing')), h('div', { class: 'chips' }, d.missing.slice(0, 15).map((k) => h('span', { class: 'kw miss' }, k)))) : null,
      d.jobTitle ? row('title', t('job.newTitle'), h('div', { class: 'tl-text' }, d.jobTitle)) : null,
      d.summary ? row('summary', t('job.newSummary'), h('div', { class: 'tl-text' }, d.summary)) : null,
      skills.length ? h('div', { class: 'tl-row' }, h('span'), h('div', null, h('b', null, t('job.newSkills')), h('div', { class: 'chips' }, skillChecks.map((x) => x.el)))) : null,
      ...bullets.map((b, i) => row('b' + i, t('job.newBullets', { item: SECTION_TYPES[expItems.get(b.itemId).s.type].summary(expItems.get(b.itemId).it) }), h('div', { class: 'tl-text pre' }, b.text))),
      (d.advice || []).length ? h('div', { class: 'tl-advice' }, h('b', null, t('job.advice')), h('ul', null, d.advice.slice(0, 6).map((a) => h('li', null, a)))) : null,
      viaNote(r.via, r.provider));
    const apply = (cv) => {
      if (d.jobTitle && checks.title && checks.title.checked) cv.personal.jobTitle.value = d.jobTitle;
      if (d.summary && checks.summary && checks.summary.checked) {
        let s = cv.sections.find((x) => x.type === 'summary');
        if (!s) { s = newSection('summary'); cv.sections.unshift(s); }
        if (!s.items.length) s.items.push(newItem('summary'));
        s.items[0].text = d.summary;
      }
      const picked = skillChecks.filter((x) => x.c.checked).map((x) => x.k);
      if (picked.length) {
        let s = cv.sections.find((x) => x.type === 'skills');
        if (!s) { s = newSection('skills', false); cv.sections.push(s); }
        const have = new Set(s.items.map((x) => String(x.name || '').toLowerCase()));
        for (const k of picked) if (!have.has(k.toLowerCase())) s.items.push(Object.assign(newItem('skills'), { name: k }));
      }
      bullets.forEach((b, i) => {
        if (!checks['b' + i].checked) return;
        for (const s of cv.sections) for (const it of s.items) if (it.id === b.itemId || it._srcId === b.itemId) { if ('description' in it) it.description = b.text; }
      });
    };
    modal({
      title: t('job.tailorTitle'), body, wide: true,
      buttons: [
        { label: t('cancel') },
        { label: t('job.applyHere'), action: (close) => { apply(S.cur); close(); changed(true); toast(t('job.applied'), 'ok'); } },
        { label: t('job.applyCopy'), kind: 'primary', action: async (close) => {
          const company = await companyFromPosting(posting);
          const cv = clone(src);
          cv.id = uid();
          cv.name = `${src.name} – ${company || t('job.tailored')}`;
          cv.createdAt = cv.updatedAt = Date.now();
          delete cv.translation;
          // öğe kimlikleri korunur (madde önerileri onlara göre); yalnız CV kimliği yenidir
          apply(cv);
          S.cvs.push(cv); persistCvs(); close(); switchCv(cv.id); toast(t('job.copyCreated', { name: cv.name }), 'ok', 6000);
        } },
      ],
    });
  }
  async function companyFromPosting(posting) {
    const m = String(posting).match(/(?:şirket|firma|company|employer|الشركة)\s*[:：]\s*([^\n]{2,40})/i);
    return m ? m[1].trim() : '';
  }

  /* ---------------------------------------------------------------- metin iyileştirme ---------- */
  function improvable(s, f) {
    return f.type === 'textarea' && ['summary', 'experience', 'projects', 'volunteer', 'education', 'custom', 'awards', 'certificates', 'licences', 'typeRatings'].includes(s.type);
  }
  /** Düzenleyicideki "✦ İyileştir" düğmesi ve tek sayfaya sığdırmadaki "Kısalt". */
  async function improveField(s, it, key, textarea, opts = {}) {
    const text = String(it[key] || '').trim();
    if (!text) { toast(t('ai.emptyText'), 'err'); return; }
    const ctx = { kind: s.type === 'summary' ? 'summary' : 'bullets', lang: cvLang(), aviation: isAv(), role: it.position || it.role || it.degree || it.name || '', company: it.company || it.organization || it.school || '', jobTitle: S.cur.personal.jobTitle.value };
    const body = h('div', { class: 'improve' }, h('div', { class: 'ed-busy-box inline' }, h('div', { class: 'spinner' }), t('ai.working')));
    const ac = new AbortController();
    let result = null;
    const m = modal({
      title: opts.shorten ? t('fit.shorten') : t('ai.improveTitle'), body, wide: true, onClose: () => ac.abort(),
      buttons: [{ label: t('cancel') }, { label: t('ai.apply'), kind: 'primary', action: (close) => {
        const v = body.querySelector('textarea.new').value;
        it[key] = v; close(); changed(true);
        if (textarea) textarea.value = v;
        if (opts.after) opts.after();
        toast(t('ai.applied'), 'ok');
      } }],
    });
    try {
      const prompt = opts.shorten ? Object.assign({}, ctx, { kind: ctx.kind }) : ctx;
      if (opts.shorten) {
        const r = await AIX.ask(`Shorten the following CV text to about half its length. Keep all facts, numbers and "- " bullets, ${ctx.lang === 'ar' ? 'Arabic' : ctx.lang === 'en' ? 'English' : 'Turkish'}. Return ONLY the text.\n\n${text}`, { maxTokens: 800, signal: ac.signal });
        result = { text: r.text.trim(), via: r.via, provider: r.provider };
      } else {
        result = await AIX.improveText(text, Object.assign(prompt, { signal: ac.signal }));
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      if (!(e && e.noAi)) aiErr(e);
      result = AIX.improveOffline(text, ctx);
    }
    if (!m.wrap.isConnected) return;
    fillEl(body, 
      h('div', { class: 'cmp' },
        h('label', { class: 'ed-field' }, h('span', null, t('ai.before')), h('textarea', { class: 'input', rows: 9, dir: 'auto', readonly: true }, text)),
        h('label', { class: 'ed-field' }, h('span', null, t('ai.after')), h('textarea', { class: 'input new', rows: 9, dir: 'auto' }, result.text))),
      result.tips ? h('div', { class: 'tl-advice' }, h('b', null, t('ai.offlineTips')), h('ul', null, result.tips.map((k) => h('li', null, t('ai.' + k))))) : null,
      result.verbs ? h('div', { class: 'chips' }, result.verbs.map((v) => h('span', { class: 'kw' }, v))) : null,
      h('p', { class: 'muted small' }, t('ai.placeholderHint')),
      viaNote(result.via, result.provider));
  }

  /* ---------------------------------------------------------------- ön yazı ---------- */
  function lettersCard() {
    const cv = S.cur;
    const rows = cv.coverLetters.length ? cv.coverLetters.slice().reverse().map((L) => h('div', { class: 'letter-row' },
      h('div', null, h('b', null, [L.company, L.position].filter(Boolean).join(' – ') || t('cl.untitled')), h('div', { class: 'muted small' }, fmtDate(L.date) + ' · ' + t('lang.' + (L.lang || 'tr')))),
      h('div', { class: 'row-btns', style: 'margin:0' },
        h('button', { class: 'btn small', onclick: () => coverLetterDialog(L) }, t('open')),
        h('button', { class: 'btn small danger-ghost', onclick: async () => { if (await confirmDialog(t('cl.delete'), t('cl.deleteConfirm'), true)) { cv.coverLetters = cv.coverLetters.filter((x) => x !== L); changed(true); } } }, t('delete')))))
      : [h('p', { class: 'muted small' }, t('cl.none'))];
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '✉️'), h('span', { class: 'ed-card-title' }, t('cl.title')), h('span', { class: 'ed-badge' }, cv.coverLetters.length)),
      h('div', { class: 'ed-card-body' }, h('p', { class: 'muted small' }, t('cl.desc')), h('div', { class: 'letters' }, rows),
        h('div', { class: 'row-btns' }, h('button', { class: 'btn primary', onclick: () => coverLetterDialog() }, '＋ ' + t('cl.new')))));
  }
  function coverLetterDialog(existing) {
    const cv = S.cur;
    const L = existing || { id: uid(), company: '', position: cv.personal.jobTitle.value || '', contact: '', tone: 'professional', posting: S.posting || '', text: '', lang: cvLang(), date: Date.now() };
    const inp = (k, ph) => h('input', { class: 'input', value: L[k] || '', dir: 'auto', placeholder: ph || '', oninput: (e) => { L[k] = e.target.value; } });
    const tone = h('select', { class: 'input', onchange: (e) => { L.tone = e.target.value; } }, ['professional', 'formal', 'warm'].map((x) => h('option', { value: x, selected: L.tone === x }, t('cl.tone.' + x))));
    const lang = h('select', { class: 'input', onchange: (e) => { L.lang = e.target.value; text.dir = e.target.value === 'ar' ? 'rtl' : 'ltr'; } }, ['tr', 'en', 'ar'].map((x) => h('option', { value: x, selected: L.lang === x }, t('lang.' + x))));
    const posting = h('textarea', { class: 'input', rows: 4, dir: 'auto', placeholder: t('job.placeholder'), oninput: (e) => { L.posting = e.target.value; } }, L.posting || '');
    const text = h('textarea', { class: 'input letter-text', rows: 14, dir: L.lang === 'ar' ? 'rtl' : 'ltr', oninput: (e) => { L.text = e.target.value; } }, L.text || '');
    const via = h('div');
    const gen = h('button', { class: 'btn primary', onclick: () => busyBtn(gen, async () => {
      try {
        const r = await AIX.coverLetter(cv, { company: L.company, position: L.position, contact: L.contact, tone: L.tone, posting: L.posting, lang: L.lang, aviation: isAv() });
        L.text = r.text; via.replaceChildren(viaNote(r.via, r.provider));
      } catch (e) {
        if (!(e && e.noAi)) aiErr(e);
        L.text = AIX.coverLetterOffline(cv, L, (k, p) => { let s = tr(L.lang, k); for (const [a, b] of Object.entries(p || {})) s = s.split(`{${a}}`).join(b); return s; });
        via.replaceChildren(viaNote('offline'));
      }
      text.value = L.text;
    }) }, '✦ ' + t('cl.generate'));
    const save = () => { L.text = text.value; L.date = Date.now(); if (!cv.coverLetters.includes(L)) cv.coverLetters.push(L); changed(true); };
    const body = h('div', { class: 'cl-form' },
      h('div', { class: 'field-grid' },
        h('label', { class: 'ed-field' }, h('span', null, t('cl.company')), inp('company')),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.position')), inp('position')),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.contact')), inp('contact', t('cl.contactPh'))),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.tone')), tone),
        h('label', { class: 'ed-field' }, h('span', null, t('cl.lang')), lang),
        h('div', { class: 'ed-field', style: 'justify-content:end' }, gen),
        h('label', { class: 'ed-field full' }, h('span', null, t('cl.posting')), posting)),
      via,
      h('label', { class: 'ed-field' }, h('span', null, t('cl.text')), text));
    modal({
      title: t('cl.title'), body, wide: true,
      buttons: [
        { label: t('close') },
        { label: '⧉ ' + t('cl.copy'), action: () => { navigator.clipboard.writeText(text.value).then(() => toast(t('cl.copied'), 'ok')); } },
        { label: '📄 PDF', action: () => { save(); letterPdf(L); } },
        { label: t('save'), kind: 'primary', action: (close) => { save(); close(); toast(t('saved'), 'ok'); } },
      ],
    });
  }
  function letterPdf(L) {
    const cv = S.cur;
    const m = buildModel(cv, S.settings.uiLang);
    const dir = L.lang === 'ar' ? 'rtl' : 'ltr';
    const font = (FONTS[m.design.font] || FONTS.segoe).css;
    const contacts = m.contacts.map((c) => `<span dir="ltr">${esc(c.value)}</span>`).join(' · ');
    const date = new Date().toLocaleDateString({ tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' }[L.lang], { day: 'numeric', month: 'long', year: 'numeric' });
    const paras = String(L.text || '').split(/\n{2,}|\r?\n/).filter((x) => x.trim()).map((p) => `<p>${esc(p)}</p>`).join('');
    const html = `<!doctype html><html lang="${L.lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(t('cl.title'))}</title><style>
      @page { size: A4; margin: 22mm 22mm 20mm; }
      body { font-family: ${font}; font-size: 11pt; line-height: 1.55; color: #1f2937; margin: 0; }
      .head { border-bottom: 2px solid ${m.design.accent}; padding-bottom: 8px; margin-bottom: 18px; }
      .name { font-size: 20pt; font-weight: 700; color: #111827; } .title { color: ${m.design.accent}; font-weight: 600; margin-top: 2px; }
      .contacts { color: #4b5563; font-size: 9.5pt; margin-top: 6px; } .date { text-align: end; color: #4b5563; margin-bottom: 18px; }
      p { margin: 0 0 10px; text-align: justify; }
    </style></head><body><div class="head"><div class="name">${esc(m.name)}</div>${m.jobTitle ? `<div class="title">${esc(m.jobTitle)}</div>` : ''}<div class="contacts">${contacts}</div></div>
    <div class="date">${esc(date)}</div>${paras}</body></html>`;
    withBusy(t('exporting'), async () => {
      const r = await api.exportPdf({ html, attachments: [], defaultName: `${exportName().replace(/ - CV$/, '')} - ${t('cl.fileName')}${L.company ? ' - ' + L.company.replace(/[\\/:*?"<>|]+/g, '') : ''}`, title: t('exportPdf'), open: S.settings.openAfterExport, meta: { title: `${m.name} – ${t('cl.title')}`, author: m.name, lang: L.lang } });
      if (r && r.ok) toast(t('savedTo', { path: r.path }), 'ok', 5000);
    });
  }

  /* ---------------------------------------------------------------- çeviri kopyası ---------- */
  function translateCard() {
    const cv = S.cur;
    const from = cvLang();
    const links = S.cvs.filter((c) => c.translation && c.translation.of === cv.id);
    const src = cv.translation && S.cvs.find((c) => c.id === cv.translation.of);
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '🌐'), h('span', { class: 'ed-card-title' }, t('trn.title'))),
      h('div', { class: 'ed-card-body' },
        h('p', { class: 'muted small' }, t('trn.desc')),
        h('div', { class: 'row-btns' }, ['tr', 'en', 'ar'].filter((l) => l !== from).map((l) => {
          const b = h('button', { class: 'btn', onclick: () => busyBtn(b, () => translateTo(cv, l)) }, `${t('trn.to')} ${t('lang.' + l)}`);
          return b;
        })),
        src ? h('p', { class: 'small' }, t('trn.isCopyOf', { name: src.name, l: t('lang.' + cv.translation.to) })) : null,
        links.length ? h('div', { class: 'small' }, t('trn.copies'), ' ', links.map((c) => h('button', { class: 'btn small', style: 'margin-inline-start:6px', onclick: () => switchCv(c.id) }, `${c.name}${stale(c) ? ' ⟳' : ''}`))) : null));
  }
  function stale(c) {
    const src = c.translation && S.cvs.find((x) => x.id === c.translation.of);
    return !!(src && (src.updatedAt || 0) > (c.translation.at || 0));
  }
  async function translateTo(src, to, target) {
    const from = src.lang && src.lang !== 'auto' ? src.lang : S.settings.uiLang;
    let res;
    try {
      res = await AIX.translateCv(src, from, to, isAv(src));
    } catch (e) {
      if (!(e && e.noAi)) aiErr(e);
      res = AIX.translateOffline(src, from, to);
    }
    const cv = clone(src);
    AIX.applyStrings(cv, res.map);
    cv.lang = to;
    cv.translation = { of: src.id, from, to, at: src.updatedAt || Date.now(), via: res.via };
    delete cv.coverLetters; cv.coverLetters = [];
    if (target) {
      cv.id = target.id; cv.name = target.name; cv.design = target.design; cv.createdAt = target.createdAt;
      cv.updatedAt = Date.now();
      S.cvs[S.cvs.indexOf(target)] = cv;
    } else {
      cv.id = uid();
      cv.name = `${src.name} (${to.toUpperCase()})`;
      cv.createdAt = cv.updatedAt = Date.now();
      S.cvs.push(cv);
    }
    persistCvs();
    switchCv(cv.id);
    if (res.via === 'offline') toast(t('trn.offlineDone', { n: res.done || 0, m: res.total }), 'info', 9000);
    else toast(t('trn.done', { l: t('lang.' + to) }), 'ok', 6000);
  }
  /** İçerik sekmesinin üstünde: kaynak CV bu çeviriden sonra değiştiyse uyarı. */
  function banner() {
    const cv = S.cur;
    if (!cv.translation || !stale(cv)) return null;
    const src = S.cvs.find((x) => x.id === cv.translation.of);
    const b = h('button', { class: 'btn small primary', onclick: () => busyBtn(b, () => translateTo(src, cv.translation.to, cv)) }, '⟳ ' + t('trn.update'));
    return h('div', { class: 'banner warn' },
      h('span', null, '⟳ ' + t('trn.stale', { name: src.name })),
      h('div', { class: 'row-btns', style: 'margin:0' }, b,
        h('button', { class: 'btn small', onclick: () => { cv.translation.at = src.updatedAt; changed(true); } }, t('trn.dismiss'))));
  }
  const cvLabel = (c) => (c.name || 'CV') + (stale(c) ? ' ⟳' : '');

  /* ---------------------------------------------------------------- yapay zekâ durumu ---------- */
  function aiCard() {
    const md = AIX.mode();
    const a = AIX.cloud(), l = AIX.local();
    const status = md === 'cloud' ? t('ai.statusCloud', { p: (FC.usage.PROVIDERS[a.provider] || {}).name || a.provider }) : md === 'local' ? t('ai.statusLocal', { m: l.model }) : a ? t('ai.statusNoNet') : t('ai.statusOffline');
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '✦'), h('span', { class: 'ed-card-title' }, t('ai.title'))),
      h('div', { class: 'ed-card-body' },
        h('div', { class: `ai-status ${md}` }, status),
        h('p', { class: 'muted small' }, t('ai.ownKey')),
        h('div', { class: 'row-btns' }, h('button', { class: 'btn small', onclick: () => window.openSettings && window.openSettings('cv-ai') }, '⚙ ' + t('ai.settings')))));
  }

  /* ---------------------------------------------------------------- sekme ---------- */
  function analysisPanel() {
    const r = analyze();
    return h('div', { class: 'panel' }, scoreCard(r), issuesCard(r), countryCard(), postingCard(), lettersCard(), translateCard(), expiryCard(), aiCard());
  }

  /* ---------------------------------------------------------------- paylaşım sürümü ---------- */
  function shareExport() {
    const cv = S.cur;
    const keys = ['phone', 'address', 'birthDate', 'birthPlace', 'nationality', 'maritalStatus', 'children', 'gender', 'militaryStatus'].filter((k) => cv.personal[k] && (k === 'phone' ? cv.personal.phone.numbers.some((n) => n.value) : cv.personal[k].value));
    const boxes = {};
    const def = new Set(['phone', 'address', 'birthDate', 'birthPlace', 'maritalStatus', 'children']);
    const body = h('div', null, h('p', { class: 'muted small' }, t('share.desc')),
      ...keys.map((k) => h('label', { class: 'ed-check' }, boxes[k] = h('input', { type: 'checkbox', checked: def.has(k) }), fieldName(k))),
      cv.photo.data ? h('label', { class: 'ed-check' }, boxes.photo = h('input', { type: 'checkbox', checked: false }), t('photo')) : null,
      h('label', { class: 'ed-check' }, boxes.refs = h('input', { type: 'checkbox', checked: true }), t('share.refs')),
      h('label', { class: 'ed-check' }, boxes.docs = h('input', { type: 'checkbox', checked: true }), t('share.docs')));
    modal({
      title: t('share.title'), body,
      buttons: [{ label: t('cancel') }, { label: t('exportPdf'), kind: 'primary', action: (close) => {
        const c = clone(cv);
        for (const k of keys) if (boxes[k].checked) c.personal[k].visible = false;
        if (boxes.photo && boxes.photo.checked) c.photo.visible = false;
        for (const s of c.sections) {
          if (s.type === 'references' && boxes.refs.checked) for (const it of s.items) { it.phones = []; it.email = ''; }
          if (s.type === 'documents' && boxes.docs.checked) for (const it of s.items) it.append = false;
        }
        if (c.qr && c.qr.kind === 'vcard' && boxes.phone && boxes.phone.checked) c.qr.on = false;
        close();
        const m = buildModel(c, S.settings.uiLang);
        withBusy(t('exporting'), async () => {
          const r = await api.exportPdf({ html: exportHtmlDocument(m), attachments: m.attachments, defaultName: exportName() + ' (' + t('share.suffix') + ')', title: t('exportPdf'), open: S.settings.openAfterExport, meta: pdfMeta(c, m) });
          if (r && r.ok) toast(t('savedTo', { path: r.path }), 'ok', 5000);
        });
      } }],
    });
  }
  /** PDF üst bilgisi: başlık, yazar, konu, anahtar kelimeler (beceriler) — ATS ve arama okur. */
  function pdfMeta(cv, m) {
    const skills = [];
    for (const s of cv.sections) if (s.visible && ['skills', 'licences', 'typeRatings'].includes(s.type)) for (const it of s.items) if (it.visible !== false) skills.push(it.name || it.aircraft);
    return { title: [m.name, m.jobTitle].filter(Boolean).join(' – ') + ' – CV', author: m.name, subject: m.jobTitle || 'CV', keywords: skills.filter(Boolean), lang: m.lang };
  }

  /* ---------------------------------------------------------------- QR kartı (Tasarım) ---------- */
  function qrCard() {
    const cv = S.cur;
    const q = cv.qr;
    const url = h('input', { class: 'input', dir: 'ltr', value: q.url || '', placeholder: 'https://…', oninput: (e) => { q.url = e.target.value.trim(); changed(); } });
    return h('div', { class: 'ed-card open static' },
      h('div', { class: 'ed-card-head static' }, h('span', { class: 'ed-card-icon' }, '▦'), h('span', { class: 'ed-card-title' }, t('qr.title'))),
      h('div', { class: 'ed-card-body field-grid' },
        h('label', { class: 'ed-check full' }, h('input', { type: 'checkbox', checked: q.on, onchange: (e) => { q.on = e.target.checked; changed(true); } }), t('qr.on')),
        h('label', { class: 'ed-field' }, h('span', null, t('qr.kind')),
          h('select', { class: 'input', disabled: !q.on, onchange: (e) => { q.kind = e.target.value; changed(true); } },
            ['vcard', 'linkedin', 'website', 'github', 'url'].map((k) => h('option', { value: k, selected: q.kind === k }, t('qr.k.' + k))))),
        q.kind === 'url' ? h('label', { class: 'ed-field' }, h('span', null, t('qr.url')), url) : h('span'),
        h('p', { class: 'muted small full' }, t('qr.hint'))));
  }

  /* ---------------------------------------------------------------- yardımcı: datalist ---------- */
  let dlId = 0;
  function datalist(name) {
    const id = 'dl-' + name + '-' + (++dlId);
    return { id, el: h('datalist', { id }, AV.avList(name, cvLang()).map((v) => h('option', { value: v }))) };
  }

  return {
    analyze, analysisPanel, updateBadge, openTab, reveal, improvable, improveField, fitPage, banner, cvLabel, stale, remindExpiry,
    shareExport, pdfMeta, qrCard, datalist, coverLetterDialog, translateTo, issueText, fmtDate, fmtDay, aiErr, viaNote, busyBtn, isAv,
  };
})();
