'use strict';
/* Turns a CV into a language-resolved display model, and the model into HTML. */

const CONTACT_KEYS = ['email', 'phone', 'address', 'website', 'linkedin', 'github'];

const ICONS = {
  email: '<path d="M2 4h20v16H2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m2 5 10 8 10-8" fill="none" stroke="currentColor" stroke-width="2"/>',
  phone: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/>',
  address: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/>',
  website: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" fill="none" stroke="currentColor" stroke-width="2"/>',
  linkedin: '<path d="M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.5 9h3v12h-3zM9 9h2.9v1.7h.04c.4-.76 1.38-1.56 2.85-1.56 3.05 0 3.6 2 3.6 4.6V21h-3v-6.4c0-1.5 0-3.5-2.1-3.5s-2.4 1.6-2.4 3.4V21H9z" fill="currentColor"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2z" fill="currentColor"/>',
  clip: '<path d="M16.5 6.5 8 15a2.12 2.12 0 0 0 3 3l8.5-8.5a4.24 4.24 0 0 0-6-6L5 12a6.36 6.36 0 0 0 9 9l7-7" fill="none" stroke="currentColor" stroke-width="2"/>',
};
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ''}</svg>`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOCALES = { tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' };

function formatter(lang) {
  const loc = LOCALES[lang] || lang;
  const monthFmt = new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' });
  const f = {
    label: (k) => tr(lang, k),
    month(v) {
      if (!v) return '';
      const [y, m] = String(v).split('-').map(Number);
      if (!y) return String(v);
      if (!m) return String(y);
      return monthFmt.format(new Date(y, m - 1, 1));
    },
    day(v) {
      if (!v) return '';
      const [y, m, d] = String(v).split('-').map(Number);
      if (!y || !m || !d) return String(v);
      return dayFmt.format(new Date(y, m - 1, d));
    },
    range(a, b, current) {
      const s = f.month(a);
      const e = current ? tr(lang, 'present') : f.month(b);
      if (s && e) return `${s} – ${e}`;
      return s || e || '';
    },
  };
  return f;
}

function sectionTitle(s, lang) {
  return (s.title && s.title.trim()) || tr(lang, 'sec.' + s.type);
}

function buildModel(cv, uiLang) {
  const lang = cv.lang && cv.lang !== 'auto' ? cv.lang : uiLang;
  const f = formatter(lang);
  const P = cv.personal;
  const val = (k) => (P[k] && P[k].visible !== false ? String(P[k].value || '').trim() : '');

  const contacts = [];
  const details = [];
  for (const k of cv.personalOrder) {
    if (k === 'fullName' || k === 'jobTitle') continue;
    let v = val(k);
    if (!v) continue;
    if (k === 'birthDate') v = f.day(v);
    const entry = { key: k, label: tr(lang, 'field.' + k), value: v };
    (CONTACT_KEYS.includes(k) ? contacts : details).push(entry);
  }
  for (const c of cv.customFields) {
    if (c.visible === false || !String(c.value || '').trim()) continue;
    details.push({ key: 'custom', label: c.label || '', value: c.value });
  }

  const sections = [];
  const attachments = [];
  for (const s of cv.sections) {
    if (!s.visible) continue;
    const T = SECTION_TYPES[s.type];
    const items = s.items.filter((it) => it.visible !== false).map((it) => T.view(it, f)).filter((v) => Object.values(v).some((x) => x && x !== 0));
    if (s.type === 'documents') {
      for (const it of s.items) if (it.visible !== false && it.fileId && it.append !== false) attachments.push({ fileId: it.fileId, mime: it.mime, fileName: it.fileName });
    }
    if (!items.length) continue;
    sections.push({ id: s.id, type: s.type, title: sectionTitle(s, lang), side: !!s.side, compact: !!T.compact, inline: !!T.inline, items });
  }

  return {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    design: cv.design,
    photo: cv.photo.visible !== false && cv.photo.data && cv.design.photoShape !== 'none' ? cv.photo.data : '',
    name: val('fullName'),
    jobTitle: val('jobTitle'),
    contacts,
    details,
    detailsTitle: tr(lang, 'sec.personal'),
    contactTitle: tr(lang, 'sec.contact'),
    attachedLabel: tr(lang, 'attachedAtEnd'),
    sections,
    attachments,
  };
}

/* ---------- HTML ---------- */

function textBlock(t) {
  if (!t) return '';
  const lines = String(t).split(/\r?\n/);
  let html = '', list = null;
  const flush = () => { if (list) { html += `<ul>${list.join('')}</ul>`; list = null; } };
  for (const raw of lines) {
    const m = raw.match(/^\s*[-•*▪–]\s+(.*)$/);
    if (m) { (list = list || []).push(`<li>${esc(m[1])}</li>`); continue; }
    flush();
    if (raw.trim()) html += `<p>${esc(raw)}</p>`;
  }
  flush();
  return `<div class="cv-text">${html}</div>`;
}

function levelHtml(level, style) {
  if (!level || style === 'text') return '';
  if (style === 'dots') {
    let d = '';
    for (let i = 1; i <= 5; i++) d += `<i class="${i <= level ? 'on' : ''}"></i>`;
    return `<span class="lvl-dots">${d}</span>`;
  }
  return `<span class="lvl-bar"><i style="width:${(level / 5) * 100}%"></i></span>`;
}

function sectionHtml(sec, m) {
  const style = m.design.skillStyle;
  let body;
  if (sec.inline || (sec.compact && style === 'text' && sec.type !== 'languages')) {
    body = `<div class="cv-chips">${sec.items.map((it) => `<span class="chip">${esc(it.title)}</span>`).join('')}</div>`;
  } else if (sec.compact) {
    body = `<div class="cv-compact">${sec.items.map((it) => `
      <div class="cv-citem">
        <div class="cv-cline"><span class="cv-ctitle">${esc(it.title)}</span>${it.subtitle ? `<span class="cv-csub">${esc(it.subtitle)}</span>` : ''}</div>
        ${levelHtml(it.level, style)}
      </div>`).join('')}</div>`;
  } else if (sec.type === 'summary') {
    body = sec.items.map((it) => textBlock(it.text)).join('');
  } else {
    body = sec.items.map((it) => `
      <div class="cv-item">
        <div class="cv-item-head">
          <div class="cv-item-titles">
            ${it.title ? `<div class="cv-item-title">${esc(it.title)}</div>` : ''}
            ${it.subtitle || it.location ? `<div class="cv-item-sub">${esc([it.subtitle, it.location].filter(Boolean).join(' · '))}</div>` : ''}
          </div>
          ${it.date ? `<div class="cv-item-date">${esc(it.date)}</div>` : ''}
        </div>
        ${it.extra ? `<div class="cv-item-extra">${esc(it.extra)}</div>` : ''}
        ${textBlock(it.text)}
        ${it.attached ? `<div class="cv-item-attached">${icon('clip')} ${esc(m.attachedLabel)}</div>` : ''}
      </div>`).join('');
  }
  return `<section class="cv-sec sec-${sec.type}"><h2 class="cv-h"><span>${esc(sec.title)}</span></h2>${body}</section>`;
}

function contactsHtml(m, cls) {
  if (!m.contacts.length) return '';
  return `<div class="${cls}">${m.contacts.map((c) => `<span class="cv-contact">${icon(c.key)}<span dir="auto">${esc(c.value)}</span></span>`).join('')}</div>`;
}

function detailsHtml(m, asSection) {
  if (!m.details.length) return '';
  const rows = m.details.map((d) => `<div class="cv-detail"><span class="k">${esc(d.label)}</span><span class="v" dir="auto">${esc(d.value)}</span></div>`).join('');
  return asSection
    ? `<section class="cv-sec sec-personal"><h2 class="cv-h"><span>${esc(m.detailsTitle)}</span></h2><div class="cv-details">${rows}</div></section>`
    : `<div class="cv-details">${rows}</div>`;
}

const photoHtml = (m) => (m.photo ? `<div class="cv-photo"><img src="${m.photo}" alt=""></div>` : '');

function renderCvHtml(m) {
  const d = m.design;
  const font = (FONTS[d.font] || FONTS.segoe).css;
  const cls = [`cv`, `layout-${d.layout}`, `head-${d.headingStyle}`, `photo-${d.photoShape}`, `density-${d.density}`, `side-${d.sidebarSide}`].join(' ');
  const vars = `--accent:${d.accent};--sb-bg:${d.sidebarBg};--sb-text:${d.sidebarText};--font:${font};--fs:${d.fontSize}pt;`;
  const twoCol = d.layout !== 'classic';
  const mainSecs = m.sections.filter((s) => !twoCol || !s.side);
  const sideSecs = twoCol ? m.sections.filter((s) => s.side) : [];
  const name = `<h1 class="cv-name">${esc(m.name)}</h1>${m.jobTitle ? `<div class="cv-title">${esc(m.jobTitle)}</div>` : ''}`;
  let inner;

  if (d.layout === 'sidebar') {
    inner = `
      <aside class="cv-side">
        ${photoHtml(m)}
        ${m.contacts.length ? `<section class="cv-sec sec-contact"><h2 class="cv-h"><span>${esc(m.contactTitle)}</span></h2>${contactsHtml(m, 'cv-contacts col')}</section>` : ''}
        ${detailsHtml(m, true)}
        ${sideSecs.map((s) => sectionHtml(s, m)).join('')}
      </aside>
      <main class="cv-main">
        <header class="cv-header">${name}</header>
        ${mainSecs.map((s) => sectionHtml(s, m)).join('')}
      </main>`;
  } else if (d.layout === 'banner') {
    inner = `
      <header class="cv-banner">
        ${photoHtml(m)}
        <div class="cv-banner-text">${name}${contactsHtml(m, 'cv-contacts row')}</div>
      </header>
      <div class="cv-cols">
        <main class="cv-main">${mainSecs.map((s) => sectionHtml(s, m)).join('')}</main>
        <aside class="cv-side">${detailsHtml(m, true)}${sideSecs.map((s) => sectionHtml(s, m)).join('')}</aside>
      </div>`;
  } else if (d.layout === 'split') {
    inner = `
      <header class="cv-header split">
        ${photoHtml(m)}
        <div class="cv-header-text">${name}${contactsHtml(m, 'cv-contacts row')}</div>
      </header>
      <div class="cv-cols">
        <main class="cv-main">${mainSecs.map((s) => sectionHtml(s, m)).join('')}</main>
        <aside class="cv-side">${detailsHtml(m, true)}${sideSecs.map((s) => sectionHtml(s, m)).join('')}</aside>
      </div>`;
  } else {
    inner = `
      <header class="cv-header classic">
        <div class="cv-header-text">${name}${contactsHtml(m, 'cv-contacts row')}</div>
        ${photoHtml(m)}
      </header>
      ${detailsHtml(m, true)}
      ${mainSecs.map((s) => sectionHtml(s, m)).join('')}`;
  }
  return `<div class="${cls}" dir="${m.dir}" lang="${m.lang}" style="${vars}">${inner}</div>`;
}

/* Background painted on every printed page so the sidebar column continues. */
function pageBackground(m) {
  const d = m.design;
  if (d.layout !== 'sidebar') return '#ffffff';
  const leftVisual = (d.sidebarSide === 'start') !== (m.dir === 'rtl');
  return `linear-gradient(to ${leftVisual ? 'right' : 'left'}, ${d.sidebarBg} 0, ${d.sidebarBg} 70mm, #ffffff 70mm)`;
}

function exportHtmlDocument(m) {
  return `<!doctype html><html lang="${m.lang}" dir="${m.dir}"><head><meta charset="utf-8"><title>CV</title>
<style>${CV_CSS}
@page { size: A4; margin: 12mm 0; }
@page :first { margin-top: 0; }
html { background: ${pageBackground(m)}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; }
.cv { min-height: auto; background: transparent !important; }
</style></head><body>${renderCvHtml(m)}</body></html>`;
}

const CV_CSS = `
.cv { --gap: 10px; box-sizing: border-box; width: 210mm; min-height: 297mm; font-family: var(--font); font-size: var(--fs); line-height: 1.4; color: #1f2937; background: #fff; text-align: start; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cv *, .cv *::before, .cv *::after { box-sizing: border-box; }
.cv.density-compact { --gap: 6px; line-height: 1.3; }
.cv.density-relaxed { --gap: 14px; line-height: 1.5; }
.cv p { margin: 0 0 3px; }
.cv ul { margin: 2px 0 4px; padding-inline-start: 16px; }
.cv li { margin: 1px 0; }
.cv .ic { width: 1em; height: 1em; flex: none; color: var(--accent); vertical-align: -0.12em; }
.cv-name { margin: 0; font-size: 2.3em; line-height: 1.1; font-weight: 700; color: #111827; }
.cv-title { margin-top: 3px; font-size: 1.2em; color: var(--accent); font-weight: 600; }
.cv-sec { margin-top: calc(var(--gap) * 1.6); }
.cv-h { margin: 0 0 var(--gap); font-size: 1.15em; font-weight: 700; color: var(--accent); break-after: avoid; page-break-after: avoid; }
.cv.head-line .cv-h { border-bottom: 1.5px solid var(--accent); padding-bottom: 3px; }
.cv.head-bar .cv-h { border-inline-start: 4px solid var(--accent); padding-inline-start: 8px; color: #111827; }
.cv.head-caps .cv-h { text-transform: uppercase; font-size: 0.95em; display: flex; align-items: center; gap: 8px; }
.cv.head-caps .cv-h::after { content: ''; flex: 1; height: 1px; background: currentColor; opacity: .35; }
.cv:not([dir=rtl]).head-caps .cv-h { letter-spacing: .12em; }
.cv.head-boxed .cv-h span { display: inline-block; background: var(--accent); color: #fff; padding: 2px 10px; border-radius: 3px; }
.cv.head-plain .cv-h { font-size: 1.35em; font-weight: 600; }
.cv-item { margin-bottom: var(--gap); break-inside: avoid; page-break-inside: avoid; }
.cv-item-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.cv-item-title { font-weight: 700; color: #111827; }
.cv-item-sub { color: #4b5563; font-weight: 600; }
.cv-item-date { color: #6b7280; white-space: nowrap; font-size: .92em; }
.cv-item-extra { color: #6b7280; font-size: .92em; }
.cv-item-attached { color: var(--accent); font-size: .88em; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.cv-text { margin-top: 3px; color: #374151; }
.cv-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.cv .chip { border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); color: inherit; padding: 1px 8px; border-radius: 999px; font-size: .92em; }
.cv-compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 18px; }
.cv-citem { break-inside: avoid; }
.cv-cline { display: flex; justify-content: space-between; gap: 6px; }
.cv-ctitle { font-weight: 600; }
.cv-csub { color: #6b7280; font-size: .92em; }
.lvl-bar { display: block; height: 5px; margin-top: 3px; background: color-mix(in srgb, var(--accent) 18%, #e5e7eb); border-radius: 3px; overflow: hidden; }
.lvl-bar i { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
.lvl-dots { display: inline-flex; gap: 3px; margin-top: 3px; }
.lvl-dots i { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 20%, #e5e7eb); }
.lvl-dots i.on { background: var(--accent); }
.cv-contacts { display: flex; gap: 4px 14px; }
.cv-contacts.row { flex-wrap: wrap; margin-top: 8px; color: #374151; }
.cv-contacts.col { flex-direction: column; gap: 6px; }
.cv-contact { display: inline-flex; align-items: center; gap: 6px; word-break: break-word; }
.cv-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 18px; }
.cv-detail { display: flex; gap: 6px; }
.cv-detail .k { color: #6b7280; white-space: nowrap; }
.cv-detail .k::after { content: ':'; }
.cv-detail .v { font-weight: 600; }
.cv-photo img { display: block; width: 32mm; height: 42mm; object-fit: cover; }
.cv.photo-rounded .cv-photo img { border-radius: 10px; }
.cv.photo-circle .cv-photo img { width: 36mm; height: 36mm; border-radius: 50%; }

/* classic */
.cv.layout-classic { padding: 14mm 16mm; }
.cv-header.classic { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid var(--accent); }
.cv.layout-classic .cv-photo img { width: 30mm; height: 39mm; }
.cv.layout-classic.photo-circle .cv-photo img { width: 32mm; height: 32mm; }

/* sidebar */
.cv.layout-sidebar { display: grid; grid-template-columns: 70mm 1fr; background: linear-gradient(to right, var(--sb-bg) 0 70mm, #fff 70mm); }
.cv.layout-sidebar[dir=rtl] { background: linear-gradient(to left, var(--sb-bg) 0 70mm, #fff 70mm); }
.cv.layout-sidebar.side-end { grid-template-columns: 1fr 70mm; background: linear-gradient(to left, var(--sb-bg) 0 70mm, #fff 70mm); }
.cv.layout-sidebar.side-end[dir=rtl] { background: linear-gradient(to right, var(--sb-bg) 0 70mm, #fff 70mm); }
.cv.layout-sidebar.side-end .cv-side { order: 2; }
.cv.layout-sidebar .cv-side { padding: 14mm 8mm 10mm; color: var(--sb-text); }
.cv.layout-sidebar .cv-side .cv-h { color: var(--sb-text); }
.cv.layout-sidebar.head-line .cv-side .cv-h { border-color: var(--sb-text); }
.cv.layout-sidebar.head-bar .cv-side .cv-h { border-color: var(--accent); }
.cv.layout-sidebar .cv-side .ic { color: var(--sb-text); opacity: .85; }
.cv.layout-sidebar .cv-side .cv-photo { display: flex; justify-content: center; margin-bottom: 6mm; }
.cv.layout-sidebar .cv-side .cv-photo img { box-shadow: 0 0 0 3px color-mix(in srgb, var(--sb-text) 30%, transparent); }
.cv.layout-sidebar .cv-side .cv-details, .cv-side .cv-details, .cv-side .cv-compact { grid-template-columns: 1fr; }
.cv-side .cv-detail { flex-direction: column; gap: 0; }
.cv.layout-sidebar .cv-side .cv-detail .k, .cv.layout-sidebar .cv-side .cv-csub { color: inherit; opacity: .75; }
.cv.layout-sidebar .cv-side .cv-sec:first-child { margin-top: 0; }
.cv.layout-sidebar .cv-main { padding: 14mm 12mm 10mm; }
.cv.layout-sidebar .cv-header { padding-bottom: 8px; }
.cv.layout-sidebar .cv-main .cv-sec:nth-child(2) { margin-top: 10px; }

/* banner */
.cv.layout-banner .cv-banner { display: flex; align-items: center; gap: 18px; padding: 12mm 16mm 10mm; background: var(--accent); color: #fff; }
.cv.layout-banner .cv-banner .cv-name, .cv.layout-banner .cv-banner .cv-title, .cv.layout-banner .cv-banner .cv-contacts, .cv.layout-banner .cv-banner .ic { color: #fff; }
.cv.layout-banner .cv-banner .cv-title { opacity: .9; }
.cv.layout-banner .cv-banner .cv-photo img { box-shadow: 0 0 0 3px rgba(255,255,255,.6); }
.cv-cols { display: grid; grid-template-columns: 1fr 62mm; gap: 9mm; padding: 4mm 14mm 12mm; }
.cv.side-start .cv-cols { grid-template-columns: 62mm 1fr; }
.cv.side-start .cv-cols .cv-side { order: -1; }
.cv-cols .cv-side .cv-compact, .cv-cols .cv-side .cv-details { grid-template-columns: 1fr; }
.cv.layout-banner .cv-cols .cv-side { background: var(--sb-bg); color: var(--sb-text); padding: 1px 5mm 5mm; margin-top: 6mm; border-radius: 6px; }
.cv.layout-banner .cv-cols .cv-side .cv-sec:first-child { margin-top: 4mm; }

/* split */
.cv.layout-split .cv-header.split { display: flex; align-items: center; gap: 18px; padding: 14mm 14mm 8mm; border-bottom: 1px solid #e5e7eb; }
.cv.layout-split .cv-cols .cv-side { border-inline-start: 1px solid #e5e7eb; padding-inline-start: 7mm; }
.cv.layout-split.side-start .cv-cols .cv-side { border-inline-start: 0; border-inline-end: 1px solid #e5e7eb; padding-inline-start: 0; padding-inline-end: 7mm; }
`;
