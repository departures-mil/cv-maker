'use strict';
/* global I18N, tr, SECTION_TYPES, PERSONAL_FIELDS, LANGUAGE_LEVELS, FONTS, BUILTIN_TEMPLATES, DESIGN_KEYS,
   pickDesign, newItem, newSection, newCv, normalizeCv, buildSample, buildModel, renderCvHtml, exportHtmlDocument, uid, pdfjsLib */

// window.api is provided by preload.js
const $ = (s, r = document) => r.querySelector(s);

const S = {
  info: null,
  settings: null,
  cvs: [],
  cur: null,
  tab: 'content',
  open: new Set(),
  history: { stack: [], index: -1 },
  update: { state: 'idle', manifest: null, progress: 0, error: '' },
};

const DEFAULT_SETTINGS = {
  uiLang: null,
  theme: 'light',
  autoUpdate: true,
  openAfterExport: true,
  zoom: 'fit',
  lastCvId: null,
  customTemplates: [],
  updateUrl: '',
};

/* ---------- helpers ---------- */

function t(key, params) {
  let s = tr(S.settings.uiLang, key);
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
  return s;
}

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function debounce(fn, ms) {
  let tmr = null, args = null;
  const d = (...a) => { args = a; clearTimeout(tmr); tmr = setTimeout(() => { tmr = null; fn(...args); }, ms); };
  d.flush = () => { if (tmr) { clearTimeout(tmr); tmr = null; fn(...args); } };
  return d;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const allTemplates = () => [...BUILTIN_TEMPLATES, ...S.settings.customTemplates];
const templateName = (tpl) => (tpl.builtin ? t('tpl.' + tpl.id) : tpl.name);

function toast(msg, kind = 'info', ms = 3200) {
  const el = h('div', { class: `toast ${kind}` }, msg);
  $('#toast-root').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}

/* ---------- persistence ---------- */

const persistCvs = debounce(() => {
  api.saveCvs({ version: 1, cvs: S.cvs });
}, 400);
window.addEventListener('beforeunload', () => {
  api.saveCvsSync({ version: 1, cvs: S.cvs });
  api.saveSettingsSync(S.settings);
});
const persistSettings = debounce(() => api.saveSettings(S.settings), 200);

function setSetting(k, v) { S.settings[k] = v; persistSettings(); }

/* ---------- history (undo / redo) ---------- */

function resetHistory() {
  S.history = { stack: [JSON.stringify(S.cur)], index: 0 };
  updateUndoButtons();
}
const pushHistory = debounce(() => {
  const snap = JSON.stringify(S.cur);
  const hs = S.history;
  if (hs.stack[hs.index] === snap) return;
  hs.stack = hs.stack.slice(0, hs.index + 1);
  hs.stack.push(snap);
  if (hs.stack.length > 150) hs.stack.shift();
  hs.index = hs.stack.length - 1;
  updateUndoButtons();
}, 350);

function undoRedo(dir) {
  pushHistory.flush();
  const hs = S.history;
  const ni = hs.index + dir;
  if (ni < 0 || ni >= hs.stack.length) return;
  hs.index = ni;
  const restored = JSON.parse(hs.stack[ni]);
  const idx = S.cvs.findIndex((c) => c.id === S.cur.id);
  S.cvs[idx] = restored;
  S.cur = restored;
  persistCvs();
  renderEditor();
  renderPreview();
  updateUndoButtons();
}
function updateUndoButtons() {
  $('#btn-undo').disabled = S.history.index <= 0;
  $('#btn-redo').disabled = S.history.index >= S.history.stack.length - 1;
}

/* Call after any change to the current CV. structural=true rebuilds the editor. */
function changed(structural = false) {
  S.cur.updatedAt = Date.now();
  persistCvs();
  pushHistory();
  schedulePreview();
  if (structural) renderEditor();
}

/* ---------- boot ---------- */

async function boot() {
  S.info = await api.info();
  const stored = await api.load();
  S.settings = Object.assign({}, DEFAULT_SETTINGS, stored.settings || {});
  if (!S.settings.uiLang) {
    const nav = (navigator.language || 'tr').slice(0, 2);
    S.settings.uiLang = ['tr', 'en', 'ar'].includes(nav) ? nav : 'tr';
  }
  S.cvs = (stored.cvs && stored.cvs.cvs) || [];
  S.cvs.forEach(normalizeCv);
  if (!S.cvs.length) {
    S.cvs.push(normalizeCv(buildSample(S.settings.uiLang)));
  }
  S.cur = S.cvs.find((c) => c.id === S.settings.lastCvId) || S.cvs[0];
  persistCvs();
  persistSettings();

  document.head.append(h('style', null, CV_CSS));
  document.title = S.info.title;
  bindTopbar();
  applyTheme();
  applyLanguage();
  resetHistory();
  window.addEventListener('resize', debounce(fitPreview, 100));
  api.onFullscreen(() => {});
  api.onUpdateProgress((p) => {
    S.update.progress = p.total ? p.received / p.total : 0;
    S.update.received = p.received;
    S.update.total = p.total;
    renderUpdateProgress();
  });
  if (S.settings.autoUpdate) {
    setTimeout(() => checkUpdates(true), 2500);
    // Keep checking while the program stays open.
    setInterval(() => { if (S.settings.autoUpdate && ['idle', 'none', 'error'].includes(S.update.state)) checkUpdates(true); }, 30 * 60 * 1000);
  }
  api.onNotifyClick(() => { if (S.update.state === 'available') openSettings(); });
  gcAttachments();
}

function gcAttachments() {
  const ids = [];
  for (const cv of S.cvs) for (const s of cv.sections) for (const it of s.items) if (it.fileId) ids.push(it.fileId);
  // Keep files referenced from undo history of the current CV too.
  for (const snap of S.history.stack) for (const m of snap.matchAll(/"fileId":"([^"]+)"/g)) ids.push(m[1]);
  api.gcAttachments(ids);
}

function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
}

function applyLanguage() {
  const lang = S.settings.uiLang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $('#lang-select').value = lang;
  $('#app-title').textContent = S.info.title;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  renderCvSelect();
  renderEditor();
  renderPreview();
  renderUpdateBanner();
}

/* ---------- top bar ---------- */

function bindTopbar() {
  $('#btn-min').onclick = () => api.minimize();
  $('#btn-close').onclick = () => api.close();
  $('#btn-fullscreen').onclick = () => api.toggleFullscreen();
  $('#btn-undo').onclick = () => undoRedo(-1);
  $('#btn-redo').onclick = () => undoRedo(1);
  $('#lang-select').onchange = (e) => { setSetting('uiLang', e.target.value); applyLanguage(); };
  $('#cv-select').onchange = (e) => switchCv(e.target.value);
  $('#btn-cv-menu').onclick = (e) => openMenu(e.currentTarget, [
    { label: t('cvNew'), icon: '＋', action: newCvAction },
    { label: t('cvDuplicate'), icon: '⧉', action: duplicateCv },
    { label: t('cvRename'), icon: '✎', action: renameCv },
    '-',
    { label: t('cvImport'), icon: '⇩', action: importCv },
    { label: t('cvExportFile'), icon: '⇧', action: exportCvFile },
    '-',
    { label: t('cvDelete'), icon: '🗑', danger: true, action: deleteCv, disabled: S.cvs.length < 2 },
  ]);
  $('#btn-export').onclick = (e) => openMenu(e.currentTarget, [
    { label: t('exportPdf'), icon: '📄', action: exportPdf },
    { label: t('exportDocx'), icon: '📝', action: exportDocx },
    { label: t('exportJpeg'), icon: '🖼', action: exportJpeg },
  ]);
  $('#btn-settings').onclick = openSettings;
  for (const tab of document.querySelectorAll('.tab')) {
    tab.onclick = () => {
      S.tab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === tab));
      renderEditor();
    };
  }
  $('#zoom-in').onclick = () => setZoom(currentZoom() + 0.1);
  $('#zoom-out').onclick = () => setZoom(currentZoom() - 0.1);
  $('#zoom-fit').onclick = () => setZoom('fit');

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.shiftKey && k === 'z') { e.preventDefault(); undoRedo(-1); }
    else if (e.ctrlKey && (k === 'y' || (e.shiftKey && k === 'z'))) { e.preventDefault(); undoRedo(1); }
    else if (e.ctrlKey && k === 'p') { e.preventDefault(); exportPdf(); }
    else if (e.key === 'Escape') closeMenu();
  });
}

function renderCvSelect() {
  const sel = $('#cv-select');
  sel.replaceChildren(...S.cvs.map((c) => h('option', { value: c.id }, c.name || 'CV')));
  sel.value = S.cur.id;
}

function switchCv(id) {
  const cv = S.cvs.find((c) => c.id === id);
  if (!cv) return;
  S.cur = cv;
  setSetting('lastCvId', id);
  S.open.clear();
  resetHistory();
  renderCvSelect();
  renderEditor();
  renderPreview();
}

async function newCvAction() {
  const name = await promptDialog(t('cvNew'), t('cvNamePrompt'), t('untitledCv'));
  if (name === null) return;
  const cv = newCv(name || t('untitledCv'));
  cv.design = clone(S.cur.design);
  S.cvs.push(cv);
  persistCvs();
  switchCv(cv.id);
}
function duplicateCv() {
  const cv = clone(S.cur);
  cv.id = uid();
  cv.name = `${S.cur.name} (${t('copy')})`;
  cv.createdAt = cv.updatedAt = Date.now();
  // Attachments are shared by fileId; gc only removes unreferenced files, so sharing is safe.
  S.cvs.push(cv);
  persistCvs();
  switchCv(cv.id);
}
async function renameCv() {
  const name = await promptDialog(t('cvRename'), t('cvNamePrompt'), S.cur.name);
  if (!name) return;
  S.cur.name = name;
  persistCvs();
  renderCvSelect();
}
async function deleteCv() {
  if (S.cvs.length < 2) return;
  if (!(await confirmDialog(t('cvDelete'), t('cvDeleteConfirm', { name: S.cur.name }), true))) return;
  S.cvs = S.cvs.filter((c) => c !== S.cur);
  persistCvs();
  switchCv(S.cvs[0].id);
  gcAttachments();
}
async function importCv() {
  try {
    const cv = await api.importCv({ title: t('cvImport') });
    if (!cv) return;
    cv.id = uid();
    S.cvs.push(normalizeCv(cv));
    persistCvs();
    switchCv(cv.id);
    toast(t('imported'), 'ok');
  } catch {
    toast(t('importFailed'), 'err');
  }
}
async function exportCvFile() {
  if (await api.exportCv({ cv: S.cur, defaultName: S.cur.name, title: t('cvExportFile') })) toast(t('saved'), 'ok');
}

/* ---------- menus / dialogs ---------- */

function closeMenu() { $('#menu-root').replaceChildren(); }
function openMenu(anchor, items) {
  closeMenu();
  const r = anchor.getBoundingClientRect();
  const menu = h('div', { class: 'menu' }, items.map((it) => it === '-' ? h('div', { class: 'menu-sep' }) :
    h('button', { class: `menu-item${it.danger ? ' danger' : ''}`, disabled: it.disabled, onclick: () => { closeMenu(); it.action(); } },
      h('span', { class: 'mi-icon' }, it.icon || ''), it.label)));
  const overlay = h('div', { class: 'menu-overlay', onmousedown: closeMenu });
  $('#menu-root').append(overlay, menu);
  const mw = menu.offsetWidth;
  const rtl = document.documentElement.dir === 'rtl';
  let left = rtl ? r.left : r.right - mw;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  menu.style.left = left + 'px';
  menu.style.top = Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
}

function modal({ title, body, buttons, wide, onClose }) {
  const root = $('#modal-root');
  const close = () => { wrap.remove(); onClose && onClose(); };
  const footer = h('div', { class: 'modal-foot' }, (buttons || []).map((b) =>
    h('button', { class: `btn ${b.kind || ''}`, onclick: () => b.action ? b.action(close) : close() }, b.label)));
  const wrap = h('div', { class: 'modal-wrap', onmousedown: (e) => { if (e.target === wrap) close(); } },
    h('div', { class: `modal${wide ? ' wide' : ''}` },
      h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { class: 'icon-btn', onclick: close, title: t('close') }, '✕')),
      h('div', { class: 'modal-body' }, body),
      buttons && buttons.length ? footer : null));
  root.append(wrap);
  return { close, wrap };
}

function confirmDialog(title, message, danger) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v, close) => { done = true; close(); resolve(v); };
    modal({
      title, body: h('p', null, message),
      onClose: () => { if (!done) resolve(false); },
      buttons: [
        { label: t('cancel'), action: (c) => finish(false, c) },
        { label: danger ? t('delete') : t('ok'), kind: danger ? 'danger' : 'primary', action: (c) => finish(true, c) },
      ],
    });
  });
}

function promptDialog(title, label, value) {
  return new Promise((resolve) => {
    let done = false;
    const input = h('input', { class: 'input', value: value || '' });
    const finish = (v, close) => { done = true; close(); resolve(v); };
    const m = modal({
      title, body: h('label', { class: 'field' }, h('span', null, label), input),
      onClose: () => { if (!done) resolve(null); },
      buttons: [
        { label: t('cancel'), action: (c) => finish(null, c) },
        { label: t('ok'), kind: 'primary', action: (c) => finish(input.value.trim(), c) },
      ],
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value.trim(), m.close); });
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

/* ---------- drag & drop sorting ---------- */

function sortable(container, selector, onDone) {
  let dragged = null;
  container.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const el = handle.closest(selector);
    if (el && el.parentElement === container) el.draggable = true;
  });
  container.addEventListener('dragstart', (e) => {
    const el = e.target.closest(selector);
    if (!el || el.parentElement !== container || !el.draggable) return;
    e.stopPropagation();
    dragged = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  container.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
    const over = e.target.closest(selector);
    if (!over || over === dragged || over.parentElement !== container) return;
    const r = over.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    container.insertBefore(dragged, after ? over.nextSibling : over);
  });
  container.addEventListener('dragend', (e) => {
    if (!dragged) return;
    e.stopPropagation();
    dragged.classList.remove('dragging');
    dragged.draggable = false;
    dragged = null;
    const ids = [...container.children].filter((c) => c.matches(selector)).map((c) => c.dataset.id);
    onDone(ids);
  });
}

function reorderBy(arr, ids, key = 'id') {
  const map = new Map(arr.map((x) => [typeof x === 'string' ? x : x[key], x]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
}

/* ---------- editor ---------- */

function renderEditor() {
  const ed = $('#editor');
  const scroll = ed.scrollTop;
  ed.replaceChildren(S.tab === 'design' ? designPanel() : contentPanel());
  ed.scrollTop = scroll;
  updateUndoButtons();
}

const iconBtn = (label, title, onclick, extra = '') => h('button', { class: `icon-btn ${extra}`, title, onclick: (e) => { e.stopPropagation(); onclick(e); } }, label);
const eyeBtn = (visible, onclick) => iconBtn(visible ? '👁' : '◌', visible ? t('hide') : t('show'), onclick, visible ? '' : 'off');

function card({ id, title, icon, badge, open, actions, body, hidden, handle = true, cls = '' }) {
  const isOpen = S.open.has(id) || open;
  const head = h('div', { class: 'card-head', onclick: () => { S.open.has(id) ? S.open.delete(id) : S.open.add(id); el.classList.toggle('open'); } },
    handle ? h('span', { class: 'drag-handle', title: t('dragToMove'), onclick: (e) => e.stopPropagation() }, '⠿') : null,
    icon ? h('span', { class: 'card-icon' }, icon) : null,
    h('span', { class: 'card-title' }, title),
    badge !== undefined ? h('span', { class: 'badge' }, badge) : null,
    h('span', { class: 'card-actions' }, actions || []),
    h('span', { class: 'chev' }, '▾'));
  const el = h('div', { class: `card ${cls}${isOpen ? ' open' : ''}${hidden ? ' is-hidden' : ''}`, 'data-id': id }, head, h('div', { class: 'card-body' }, body));
  return el;
}

function contentPanel() {
  const cv = S.cur;
  const wrap = h('div', { class: 'panel' });
  wrap.append(photoCard(), personalCard());

  const list = h('div', { class: 'section-list' }, cv.sections.map((s, i) => sectionCard(s, i)));
  sortable(list, '.card.section', (ids) => { cv.sections = reorderBy(cv.sections, ids); changed(true); });
  wrap.append(h('h4', { class: 'group-title' }, t('sections')), list);
  wrap.append(h('button', { class: 'btn add-section', onclick: (e) => addSectionMenu(e.currentTarget) }, '＋ ' + t('addSection')));
  return wrap;
}

function addSectionMenu(anchor) {
  openMenu(anchor, Object.keys(SECTION_TYPES).map((type) => ({
    icon: SECTION_TYPES[type].icon,
    label: t('sec.' + type),
    action: () => {
      const s = newSection(type);
      const docIdx = S.cur.sections.findIndex((x) => x.type === 'documents');
      if (type !== 'documents' && docIdx >= 0) S.cur.sections.splice(docIdx, 0, s);
      else S.cur.sections.push(s);
      S.open.add(s.id);
      changed(true);
      setTimeout(() => document.querySelector(`[data-id="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    },
  })));
}

/* photo */
function photoCard() {
  const cv = S.cur;
  const has = !!cv.photo.data;
  const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => openCropper(r.result);
    r.readAsDataURL(f);
    e.target.value = '';
  } });
  const body = h('div', { class: 'photo-row' },
    h('div', { class: 'photo-box', onclick: () => fileInput.click() },
      has ? h('img', { src: cv.photo.data }) : h('span', { class: 'muted' }, t('photoHint'))),
    h('div', { class: 'photo-actions' },
      h('button', { class: 'btn', onclick: () => fileInput.click() }, has ? t('photoChange') : t('photoChoose')),
      has ? h('button', { class: 'btn', onclick: () => openCropper(cv.photo.original || cv.photo.data) }, t('photoCrop')) : null,
      has ? h('button', { class: 'btn danger-ghost', onclick: () => { cv.photo.data = ''; cv.photo.original = ''; changed(true); } }, t('photoRemove')) : null,
      h('p', { class: 'muted small' }, t('photoNote')),
      fileInput));
  return card({
    id: 'photo', title: t('photo'), icon: '📷', handle: false, body, hidden: !cv.photo.visible,
    actions: [eyeBtn(cv.photo.visible, () => { cv.photo.visible = !cv.photo.visible; changed(true); })],
  });
}

function openCropper(src) {
  const W = 300, H = 400;
  const canvas = h('canvas', { width: W * 2, height: H * 2, class: 'crop-canvas', style: `width:${W}px;height:${H}px` });
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const st = { scale: 1, min: 1, x: 0, y: 0, rot: 0 };
  const zoom = h('input', { type: 'range', min: 1, max: 4, step: 0.01, value: 1, class: 'range' });
  const dims = () => (st.rot % 180 === 0 ? [img.width, img.height] : [img.height, img.width]);
  const clamp = () => {
    const [iw, ih] = dims();
    const w = iw * st.scale, hgt = ih * st.scale;
    st.x = Math.min(0, Math.max(W * 2 - w, st.x));
    st.y = Math.min(0, Math.max(H * 2 - hgt, st.y));
  };
  const draw = (target = ctx, k = 1) => {
    clamp();
    const [iw, ih] = dims();
    target.fillStyle = '#fff';
    target.fillRect(0, 0, W * 2 * k, H * 2 * k);
    target.save();
    target.translate((st.x + (iw * st.scale) / 2) * k, (st.y + (ih * st.scale) / 2) * k);
    target.rotate((st.rot * Math.PI) / 180);
    target.drawImage(img, (-img.width * st.scale * k) / 2, (-img.height * st.scale * k) / 2, img.width * st.scale * k, img.height * st.scale * k);
    target.restore();
  };
  const fit = () => {
    const [iw, ih] = dims();
    st.min = Math.max((W * 2) / iw, (H * 2) / ih);
    st.scale = st.min * Number(zoom.value);
    st.x = (W * 2 - iw * st.scale) / 2;
    st.y = (H * 2 - ih * st.scale) / 2;
  };
  img.onload = () => { fit(); draw(); };
  img.src = src;
  zoom.oninput = () => {
    const cx = W - st.x, cy = H - st.y;
    const ns = st.min * Number(zoom.value);
    st.x = W - (cx * ns) / st.scale;
    st.y = H - (cy * ns) / st.scale;
    st.scale = ns;
    draw();
  };
  let drag = null;
  canvas.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y }; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = (e) => { if (!drag) return; st.x = drag.sx + (e.clientX - drag.x) * 2; st.y = drag.sy + (e.clientY - drag.y) * 2; draw(); };
  canvas.onpointerup = () => { drag = null; };
  canvas.onwheel = (e) => { e.preventDefault(); zoom.value = Math.min(4, Math.max(1, Number(zoom.value) - e.deltaY * 0.001)); zoom.oninput(); };
  const rotate = () => { st.rot = (st.rot + 90) % 360; zoom.value = 1; fit(); draw(); };

  modal({
    title: t('photoCrop'),
    body: h('div', { class: 'cropper' }, canvas,
      h('div', { class: 'crop-tools' },
        h('label', { class: 'field inline' }, h('span', null, t('zoom')), zoom),
        h('button', { class: 'btn', onclick: rotate }, '⟳ ' + t('rotate'))),
      h('p', { class: 'muted small' }, t('cropHint'))),
    buttons: [
      { label: t('cancel') },
      { label: t('save'), kind: 'primary', action: (close) => {
        const out = document.createElement('canvas');
        out.width = 600; out.height = 800;
        draw(out.getContext('2d'), 600 / (W * 2));
        S.cur.photo.data = out.toDataURL('image/jpeg', 0.9);
        S.cur.photo.original = src.length < 6e6 ? src : '';
        S.cur.photo.visible = true;
        close();
        changed(true);
      } },
    ],
  });
}

/* personal info */

/* Localized date picker (selects instead of the native control, whose text follows the OS language). */
function datePicker(value, onChange, { withDay = false, disabled = false } = {}) {
  const loc = { tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' }[S.settings.uiLang] || 'tr-TR';
  const [y0, m0, d0] = String(value || '').split('-');
  const monthName = new Intl.DateTimeFormat(loc, { month: 'long' });
  const thisYear = new Date().getFullYear();
  const sel = (cls, opts, cur, ph) => h('select', { class: `input ${cls}`, disabled },
    h('option', { value: '' }, ph), opts.map(([v, l]) => h('option', { value: v, selected: v === cur }, l)));
  const day = withDay ? sel('dp-day', Array.from({ length: 31 }, (_, i) => { const v = String(i + 1).padStart(2, '0'); return [v, String(i + 1)]; }), d0, t('day')) : null;
  const month = sel('dp-month', Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), monthName.format(new Date(2000, i, 1))]), m0, t('month'));
  const year = sel('dp-year', Array.from({ length: 80 }, (_, i) => { const v = String(thisYear + 5 - i); return [v, v]; }), y0, t('year'));
  const emit = () => {
    const y = year.value, m = month.value, d = day ? day.value : '';
    let v = '';
    if (y) v = m ? (withDay && d ? `${y}-${m}-${d}` : `${y}-${m}`) : y;
    onChange(v);
  };
  for (const x of [day, month, year]) if (x) x.onchange = emit;
  return h('div', { class: `date-picker${withDay ? ' with-day' : ''}` }, day, month, year);
}

function editCustomLabels(c) {
  const inputs = {};
  const body = h('div', null,
    h('p', { class: 'muted small' }, t('labelTranslationsHint')),
    ['tr', 'en', 'ar'].map((l) => h('label', { class: 'field' }, h('span', null, t('lang.' + l)),
      inputs[l] = h('input', { class: 'input', dir: l === 'ar' ? 'rtl' : 'ltr', value: (c.labels && c.labels[l]) || '', placeholder: c.label }))));
  modal({
    title: t('labelTranslations'), body,
    buttons: [
      { label: t('cancel') },
      { label: t('save'), kind: 'primary', action: (close) => {
        c.labels = {};
        for (const l of Object.keys(inputs)) if (inputs[l].value.trim()) c.labels[l] = inputs[l].value.trim();
        close(); changed(true);
      } },
    ],
  });
}

function personalCard() {
  const cv = S.cur;
  const rows = h('div', { class: 'personal-list' });
  for (const k of cv.personalOrder) {
    if (k.startsWith('c:')) {
      const c = cv.customFields.find((x) => 'c:' + x.id === k);
      if (!c) continue;
      const translated = c.labels && Object.keys(c.labels).length;
      rows.append(h('div', { class: `prow custom${c.visible === false ? ' is-hidden' : ''}`, 'data-id': k },
        h('span', { class: 'drag-handle', title: t('dragToMove') }, '⠿'),
        h('input', { class: 'input prow-label-input', value: c.label, placeholder: t('fieldLabel'), dir: 'auto', oninput: (e) => { c.label = e.target.value; changed(); } }),
        h('input', { class: 'input', value: c.value, placeholder: t('fieldValue'), dir: 'auto', oninput: (e) => { c.value = e.target.value; changed(); } }),
        h('span', { class: 'prow-actions' },
          iconBtn('🌐', t('labelTranslations'), () => editCustomLabels(c), translated ? 'on' : ''),
          eyeBtn(c.visible !== false, () => { c.visible = c.visible === false; changed(true); }),
          iconBtn('🗑', t('delete'), () => {
            cv.customFields = cv.customFields.filter((x) => x !== c);
            cv.personalOrder = cv.personalOrder.filter((x) => x !== k);
            changed(true);
          }, 'danger'))));
      continue;
    }
    const def = PERSONAL_FIELDS.find((f) => f.k === k);
    const p = cv.personal[k];
    const input = def.type === 'date'
      ? datePicker(p.value, (v) => { p.value = v; changed(); }, { withDay: true })
      : h('input', {
        class: 'input', type: 'text', value: p.value, dir: 'auto',
        placeholder: t('ph.' + k) !== 'ph.' + k ? t('ph.' + k) : '',
        oninput: (e) => { p.value = e.target.value; changed(); },
      });
    rows.append(h('div', { class: `prow${p.visible ? '' : ' is-hidden'}`, 'data-id': k },
      h('span', { class: 'drag-handle', title: t('dragToMove') }, '⠿'),
      h('label', { class: 'prow-label' }, t('field.' + k)),
      input,
      h('span', { class: 'prow-actions' }, eyeBtn(p.visible, () => { p.visible = !p.visible; changed(true); }))));
  }
  sortable(rows, '.prow', (ids) => { cv.personalOrder = ids; changed(true); });

  const addField = () => {
    const c = { id: uid(), label: '', labels: {}, value: '', visible: true };
    cv.customFields.push(c);
    cv.personalOrder.push('c:' + c.id);
    changed(true);
  };
  const body = h('div', null, rows,
    h('button', { class: 'btn small add-field', onclick: addField }, '＋ ' + t('addField')),
    h('p', { class: 'muted small' }, t('personalHint')));
  return card({ id: 'personal', title: t('sec.personal'), icon: '👤', handle: false, body });
}

/* sections */
function sectionCard(s, i) {
  const cv = S.cur;
  const T = SECTION_TYPES[s.type];
  const defaultTitle = tr(resolvedCvLang(), 'sec.' + s.type);
  const twoCol = cv.design.layout !== 'classic';

  const items = h('div', { class: 'item-list' }, s.items.map((it, j) => itemCard(s, it, j)));
  sortable(items, '.card.item', (ids) => { s.items = reorderBy(s.items, ids); changed(true); });

  const addBtn = s.type === 'documents'
    ? h('button', { class: 'btn small', onclick: () => addDocuments(s) }, '＋ ' + t('addDocument'))
    : h('button', { class: 'btn small', onclick: () => { const it = newItem(s.type); s.items.push(it); S.open.add(it.id); changed(true); } }, '＋ ' + t('addItem'));

  const body = h('div', null,
    h('div', { class: 'sec-settings' },
      h('label', { class: 'field' }, h('span', null, t('sectionTitle')),
        h('input', { class: 'input', value: s.title, placeholder: defaultTitle, dir: 'auto', oninput: (e) => { s.title = e.target.value; changed(); const ct = e.target.closest('.card').querySelector('.card-title'); ct.textContent = e.target.value || defaultTitle; } })),
      twoCol ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.side, onchange: (e) => { s.side = e.target.checked; changed(); } }), t('showInSidebar')) : null),
    s.type === 'documents' ? h('p', { class: 'muted small' }, t('documentsHint')) : null,
    items,
    addBtn);

  return card({
    id: s.id, cls: 'section', icon: T.icon, title: s.title || defaultTitle, badge: s.items.length, hidden: !s.visible, body,
    actions: [
      eyeBtn(s.visible, () => { s.visible = !s.visible; changed(true); }),
      iconBtn('▲', t('moveUp'), () => { if (move(cv.sections, i, -1)) changed(true); }),
      iconBtn('▼', t('moveDown'), () => { if (move(cv.sections, i, 1)) changed(true); }),
      iconBtn('⧉', t('duplicate'), () => {
        const c = clone(s); c.id = uid(); c.items.forEach((x) => { x.id = uid(); });
        cv.sections.splice(i + 1, 0, c); changed(true);
      }),
      iconBtn('🗑', t('delete'), async () => {
        if (await confirmDialog(t('deleteSection'), t('deleteSectionConfirm', { name: s.title || defaultTitle }), true)) { cv.sections.splice(i, 1); changed(true); }
      }, 'danger'),
    ],
  });
}

function resolvedCvLang() {
  return S.cur.lang && S.cur.lang !== 'auto' ? S.cur.lang : S.settings.uiLang;
}

async function addDocuments(s) {
  const files = await api.pickAttachments({ title: t('addDocument'), filterName: t('docFiles') });
  for (const f of files) {
    const it = newItem('documents');
    Object.assign(it, f, { title: f.fileName.replace(/\.[^.]+$/, '') });
    s.items.push(it);
    S.open.add(it.id);
  }
  if (files.length) changed(true);
}

function itemCard(s, it, j) {
  const T = SECTION_TYPES[s.type];
  const summary = (T.summary(it) || '').toString().split('\n')[0].slice(0, 80) || t('newItem');
  const grid = h('div', { class: 'field-grid' });
  for (const f of T.fields) grid.append(fieldInput(s, it, f));
  return card({
    id: it.id, cls: 'item', title: summary, hidden: it.visible === false, body: grid,
    actions: [
      eyeBtn(it.visible !== false, () => { it.visible = it.visible === false; changed(true); }),
      iconBtn('▲', t('moveUp'), () => { if (move(s.items, j, -1)) changed(true); }),
      iconBtn('▼', t('moveDown'), () => { if (move(s.items, j, 1)) changed(true); }),
      iconBtn('⧉', t('duplicate'), () => { const c = clone(it); c.id = uid(); s.items.splice(j + 1, 0, c); changed(true); }),
      iconBtn('🗑', t('delete'), () => { s.items.splice(j, 1); changed(true); }, 'danger'),
    ],
  });
}

function refreshItemTitle(input, s, it) {
  const ct = input.closest('.card.item')?.querySelector('.card-title');
  if (ct) ct.textContent = (SECTION_TYPES[s.type].summary(it) || '').toString().split('\n')[0].slice(0, 80) || t('newItem');
}

function fieldInput(s, it, f) {
  const label = t('field.' + f.k);
  const set = (v, input) => { it[f.k] = v; changed(); if (input) refreshItemTitle(input, s, it); };
  switch (f.type) {
    case 'textarea':
      return h('label', { class: 'field full' }, h('span', null, label),
        h('textarea', { class: 'input', rows: f.rows || 3, dir: 'auto', oninput: (e) => set(e.target.value, e.target) }, it[f.k] || ''),
        s.type !== 'summary' ? h('small', { class: 'muted' }, t('bulletHint')) : null);
    case 'check':
      return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.k === 'append' ? it[f.k] !== false : !!it[f.k], onchange: (e) => {
        it[f.k] = e.target.checked; changed();
        if (f.k === 'current') { const end = e.target.closest('.field-grid').querySelector('[data-k="end"]'); if (end) end.querySelectorAll('select').forEach((x) => { x.disabled = e.target.checked; }); }
      } }), t('field.' + f.k));
    case 'month': {
      const dp = datePicker(it[f.k], (v) => set(v), { disabled: f.k === 'end' && it.current });
      dp.dataset.k = f.k;
      return h('label', { class: 'field' }, h('span', null, label), dp);
    }
    case 'range': {
      const out = h('b', null, it[f.k] ? `${it[f.k]}/5` : t('levelHidden'));
      return h('label', { class: 'field' }, h('span', null, label, ' ', out),
        h('input', { type: 'range', class: 'range', min: f.min, max: f.max, step: 1, value: it[f.k] ?? 3, oninput: (e) => { it[f.k] = Number(e.target.value); out.textContent = it[f.k] ? `${it[f.k]}/5` : t('levelHidden'); changed(); } }));
    }
    case 'select':
      return h('label', { class: 'field' }, h('span', null, label),
        h('select', { class: 'input', onchange: (e) => set(e.target.value) },
          h('option', { value: '' }, '—'),
          f.options.map((o) => h('option', { value: o, selected: it[f.k] === o }, t(f.optPrefix + o)))));
    case 'file':
      return h('div', { class: 'field full' }, h('span', null, t('field.file')), fileWidget(s, it));
    default:
      return h('label', { class: 'field' }, h('span', null, label),
        h('input', { class: 'input', type: 'text', value: it[f.k] || '', dir: 'auto', oninput: (e) => set(e.target.value, e.target) }));
  }
}

function fileWidget(s, it) {
  const box = h('div', { class: 'file-widget' });
  if (it.fileId) {
    const thumb = h('div', { class: 'file-thumb' }, it.mime === 'application/pdf' ? 'PDF' : '');
    if (it.mime && it.mime.startsWith('image/')) api.readAttachment(it.fileId).then((d) => { if (d) thumb.replaceChildren(h('img', { src: d })); });
    box.append(thumb, h('div', { class: 'file-info' },
      h('div', { class: 'file-name' }, it.fileName),
      h('div', { class: 'file-btns' },
        h('button', { class: 'btn small', onclick: () => api.openAttachment(it.fileId) }, t('open')),
        h('button', { class: 'btn small', onclick: () => replaceFile(it) }, t('change')),
        h('button', { class: 'btn small danger-ghost', onclick: () => { it.fileId = ''; it.fileName = ''; it.mime = ''; changed(true); } }, t('remove')))));
  } else {
    box.append(h('button', { class: 'btn small', onclick: () => replaceFile(it) }, '📎 ' + t('chooseFile')));
  }
  return box;
}

async function replaceFile(it) {
  const [f] = await api.pickAttachments({ title: t('chooseFile'), filterName: t('docFiles') });
  if (!f) return;
  Object.assign(it, f);
  if (!it.title) it.title = f.fileName.replace(/\.[^.]+$/, '');
  changed(true);
}

/* ---------- design panel ---------- */

function designPanel() {
  const cv = S.cur;
  const d = cv.design;
  const wrap = h('div', { class: 'panel' });

  wrap.append(h('div', { class: 'card open static' }, h('div', { class: 'card-body' },
    h('label', { class: 'field' }, h('span', null, t('cvLanguage')),
      h('select', { class: 'input', onchange: (e) => { cv.lang = e.target.value; changed(true); } },
        ['auto', 'tr', 'en', 'ar'].map((l) => h('option', { value: l, selected: cv.lang === l }, t('lang.' + l))))),
    h('p', { class: 'muted small' }, t('cvLanguageHint')))));

  // template gallery
  const model = buildModel(cv, S.settings.uiLang);
  const gallery = h('div', { class: 'tpl-grid' });
  for (const tpl of allTemplates()) {
    const m = Object.assign({}, model, { design: Object.assign({}, pickDesign(tpl)) });
    const thumb = h('div', { class: 'tpl-thumb' }, h('div', { class: 'tpl-scale', html: renderCvHtml(m) }));
    const actions = tpl.builtin ? null : h('div', { class: 'tpl-actions' },
      iconBtn('✎', t('rename'), async () => { const n = await promptDialog(t('rename'), t('templateName'), tpl.name); if (n) { tpl.name = n; persistSettings(); renderEditor(); } }),
      iconBtn('⇧', t('exportTemplate'), () => api.saveText({ title: t('exportTemplate'), defaultName: tpl.name + '.cvtemplate', ext: 'cvtemplate', text: JSON.stringify({ format: 'cvmaker-template', template: tpl }, null, 2) })),
      iconBtn('🗑', t('delete'), async () => {
        if (await confirmDialog(t('deleteTemplate'), t('deleteTemplateConfirm', { name: tpl.name }), true)) {
          S.settings.customTemplates = S.settings.customTemplates.filter((x) => x.id !== tpl.id); persistSettings(); renderEditor();
        }
      }, 'danger'));
    gallery.append(h('div', { class: `tpl${d.templateId === tpl.id ? ' active' : ''}`, onclick: () => { cv.design = pickDesign(tpl); changed(true); } },
      thumb, h('div', { class: 'tpl-name' }, templateName(tpl), tpl.builtin ? null : h('span', { class: 'badge' }, t('custom'))), actions));
  }
  const tplInput = h('input', { type: 'file', accept: '.cvtemplate,.json', hidden: true, onchange: (e) => importTemplate(e.target.files[0]) });
  wrap.append(h('div', { class: 'card open static' },
    h('div', { class: 'card-head static' }, h('span', { class: 'card-icon' }, '🎨'), h('span', { class: 'card-title' }, t('templates'))),
    h('div', { class: 'card-body' }, gallery,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn primary', onclick: saveAsTemplate }, '＋ ' + t('saveAsTemplate')),
        h('button', { class: 'btn', onclick: () => tplInput.click() }, '⇩ ' + t('importTemplate')), tplInput),
      h('p', { class: 'muted small' }, t('templateHint')))));

  // customization
  const set = (k, structural) => (e) => { d[k] = e.target.type === 'range' ? Number(e.target.value) : e.target.value; changed(structural); };
  const sel = (k, opts, structural) => h('label', { class: 'field' }, h('span', null, t('d.' + k)),
    h('select', { class: 'input', onchange: set(k, structural) }, opts.map((o) => h('option', { value: o, selected: d[k] === o }, t(`d.${k}.${o}`)))));
  const color = (k) => h('label', { class: 'field color' }, h('span', null, t('d.' + k)),
    h('input', { type: 'color', value: d[k], oninput: set(k) }));
  const swatches = h('div', { class: 'swatches' }, ['#3b82f6', '#0f4c81', '#1f2937', '#0f766e', '#059669', '#9d174d', '#b91c1c', '#c2410c', '#7c3aed', '#a16207'].map((c) =>
    h('button', { class: 'swatch', style: `background:${c}`, title: c, onclick: () => { d.accent = c; changed(true); } })));
  const fsOut = h('b', null, `${d.fontSize} pt`);

  wrap.append(h('div', { class: 'card open static' },
    h('div', { class: 'card-head static' }, h('span', { class: 'card-icon' }, '🖌'), h('span', { class: 'card-title' }, t('customize'))),
    h('div', { class: 'card-body field-grid' },
      sel('layout', ['classic', 'sidebar', 'banner', 'split'], true),
      d.layout !== 'classic' ? sel('sidebarSide', ['start', 'end']) : h('span'),
      color('accent'), swatches,
      d.layout !== 'classic' ? color('sidebarBg') : null,
      d.layout !== 'classic' ? color('sidebarText') : null,
      h('label', { class: 'field' }, h('span', null, t('d.font')),
        h('select', { class: 'input', onchange: set('font') }, Object.entries(FONTS).map(([k, f]) => h('option', { value: k, selected: d.font === k, style: `font-family:${f.css}` }, f.label)))),
      h('label', { class: 'field' }, h('span', null, t('d.fontSize'), ' ', fsOut),
        h('input', { type: 'range', class: 'range', min: 8, max: 13, step: 0.5, value: d.fontSize, oninput: (e) => { d.fontSize = Number(e.target.value); fsOut.textContent = `${d.fontSize} pt`; changed(); } })),
      sel('headingStyle', ['line', 'bar', 'caps', 'boxed', 'plain']),
      sel('photoShape', ['rect', 'rounded', 'circle', 'none']),
      sel('density', ['compact', 'normal', 'relaxed']),
      sel('skillStyle', ['bars', 'dots', 'text']))));
  return wrap;
}

async function saveAsTemplate() {
  const name = await promptDialog(t('saveAsTemplate'), t('templateName'), '');
  if (!name) return;
  const tpl = Object.assign({ id: 'c-' + uid(), name, builtin: false }, pickDesignRaw(S.cur.design));
  S.settings.customTemplates.push(tpl);
  persistSettings();
  S.cur.design.templateId = tpl.id;
  changed(true);
  toast(t('templateSaved'), 'ok');
}
function pickDesignRaw(d) { const o = {}; for (const k of DESIGN_KEYS) o[k] = d[k]; return o; }

function importTemplate(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const src = data.template || data;
      const base = BUILTIN_TEMPLATES[0];
      const tpl = { id: 'c-' + uid(), name: String(src.name || file.name.replace(/\.[^.]+$/, '')), builtin: false };
      for (const k of DESIGN_KEYS) tpl[k] = src[k] !== undefined ? src[k] : base[k];
      if (!FONTS[tpl.font]) tpl.font = base.font;
      S.settings.customTemplates.push(tpl);
      persistSettings();
      renderEditor();
      toast(t('templateImported'), 'ok');
    } catch {
      toast(t('importFailed'), 'err');
    }
  };
  r.readAsText(file);
}

/* ---------- preview ---------- */

const schedulePreview = debounce(renderPreview, 120);
const PX_PER_MM = 96 / 25.4;

function renderPreview() {
  const m = buildModel(S.cur, S.settings.uiLang);
  const sheet = $('#preview-sheet');
  sheet.innerHTML = renderCvHtml(m);
  // page guides
  const cvEl = sheet.firstElementChild;
  const pageH = 297 * PX_PER_MM;
  const pages = Math.max(1, Math.ceil((cvEl.scrollHeight - 2) / pageH));
  for (let i = 1; i < pages; i++) sheet.append(h('div', { class: 'page-guide', style: `top:${i * pageH}px` }, h('span', null, t('pageN', { n: i + 1 }))));
  $('#page-info').textContent = t('pagesApprox', { n: pages }) + (m.attachments.length ? ' · ' + t('plusAttachments', { n: m.attachments.length }) : '');
  fitPreview();
}

function currentZoom() {
  const z = S.settings.zoom;
  if (z !== 'fit') return z;
  const avail = $('#preview-scroll').clientWidth - 64;
  return Math.max(0.3, Math.min(2, avail / (210 * PX_PER_MM)));
}
function setZoom(z) {
  setSetting('zoom', z === 'fit' ? 'fit' : Math.max(0.3, Math.min(2.5, Math.round(z * 10) / 10)));
  fitPreview();
}
function fitPreview() {
  const z = currentZoom();
  const sheet = $('#preview-sheet');
  sheet.style.transform = `scale(${z})`;
  const stage = $('#preview-stage');
  stage.style.width = 210 * PX_PER_MM * z + 'px';
  stage.style.height = sheet.offsetHeight * z + 'px';
  $('#zoom-label').textContent = Math.round(z * 100) + '%';
}

/* ---------- export ---------- */

function exportName() {
  const n = (S.cur.personal.fullName.value || S.cur.name || 'CV').trim();
  return `${n} - CV`.replace(/[\\/:*?"<>|]+/g, '');
}

async function withBusy(label, fn) {
  const busy = h('div', { class: 'busy' }, h('div', { class: 'busy-box' }, h('div', { class: 'spinner' }), label));
  document.body.append(busy);
  try { return await fn(); }
  catch (e) { console.error(e); toast(t('exportFailed'), 'err', 6000); }
  finally { busy.remove(); }
}

async function exportPdf() {
  const m = buildModel(S.cur, S.settings.uiLang);
  await withBusy(t('exporting'), async () => {
    const r = await api.exportPdf({ html: exportHtmlDocument(m), attachments: m.attachments, defaultName: exportName(), title: t('exportPdf'), open: S.settings.openAfterExport });
    if (r && r.ok) toast(t('savedTo', { path: r.path }), 'ok', 5000);
  });
}

async function exportDocx() {
  const m = buildModel(S.cur, S.settings.uiLang);
  await withBusy(t('exporting'), async () => {
    const r = await api.exportDocx({ model: m, defaultName: exportName(), title: t('exportDocx'), open: S.settings.openAfterExport });
    if (r && r.ok) toast(t('savedTo', { path: r.path }), 'ok', 5000);
  });
}

async function exportJpeg() {
  const m = buildModel(S.cur, S.settings.uiLang);
  const target = await api.pickJpegTarget({ defaultName: exportName(), title: t('exportJpeg') });
  if (!target) return;
  await withBusy(t('exporting'), async () => {
    const bytes = await api.renderPdf({ html: exportHtmlDocument(m), attachments: m.attachments });
    pdfjsLib.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const images = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 200 / 72 });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      images.push(c.toDataURL('image/jpeg', 0.92));
    }
    const r = await api.saveJpegs({ target, images, open: S.settings.openAfterExport });
    toast(t('savedTo', { path: r.paths.length > 1 ? r.dir : r.paths[0] }), 'ok', 5000);
  });
}

/* ---------- settings & updates ---------- */

function openSettings() {
  const st = S.settings;
  const row = (label, control, hint) => h('div', { class: 'set-row' }, h('div', null, h('div', { class: 'set-label' }, label), hint ? h('div', { class: 'muted small' }, hint) : null), control);
  const toggle = (k, after) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: st[k], onchange: (e) => { setSetting(k, e.target.checked); after && after(); } }), h('span'));

  const body = h('div', { class: 'settings' },
    h('h4', null, t('general')),
    row(t('uiLanguage'), h('select', { class: 'input', onchange: (e) => { setSetting('uiLang', e.target.value); m.close(); applyLanguage(); openSettings(); } },
      ['tr', 'en', 'ar'].map((l) => h('option', { value: l, selected: st.uiLang === l }, t('lang.' + l))))),
    row(t('theme'), h('select', { class: 'input', onchange: (e) => { setSetting('theme', e.target.value); applyTheme(); } },
      ['light', 'dark'].map((v) => h('option', { value: v, selected: st.theme === v }, t('theme.' + v))))),
    row(t('openAfterExport'), toggle('openAfterExport')),

    h('h4', null, t('updates')),
    row(t('currentVersion'), h('b', null, S.info.title)),
    row(t('autoUpdate'), toggle('autoUpdate'), t('autoUpdateHint')),
    h('div', { id: 'update-panel', class: 'update-panel' }),
    h('details', { class: 'advanced' }, h('summary', null, t('advanced')),
      row(t('updateServer'), h('input', { class: 'input', dir: 'ltr', value: st.updateUrl, placeholder: 'https://….web.app', onchange: (e) => setSetting('updateUrl', e.target.value.trim()) }), t('updateServerHint'))),

    h('h4', null, t('data')),
    row(t('dataFolder'), h('button', { class: 'btn', onclick: () => api.openDataDir() }, t('openFolder')), S.info.dataDir),

    h('h4', null, t('shortcuts')),
    h('div', { class: 'shortcuts' }, [['Ctrl+Z', t('undo')], ['Ctrl+Y', t('redo')], ['Ctrl+P', t('exportPdf')], ['F11', t('toggleFullscreen')]].map(([k, v]) =>
      h('div', null, h('kbd', null, k), ' ', v))),
    h('p', { class: 'muted small about' }, `${S.info.title} · ${t('portableNote')}`));
  const m = modal({ title: t('settings'), body, wide: true, buttons: [{ label: t('close'), kind: 'primary' }] });
  renderUpdatePanel();
}

function renderUpdatePanel() {
  const p = $('#update-panel');
  if (!p) return;
  const u = S.update;
  const items = [];
  if (u.state === 'checking') items.push(h('div', { class: 'muted' }, t('checking')));
  else if (u.state === 'none') items.push(h('div', { class: 'ok-text' }, '✓ ' + t('upToDate')));
  else if (u.state === 'error') items.push(h('div', { class: 'err-text' }, u.error === 'not-configured' ? t('updateNotConfigured') : t('updateError', { e: u.error })));
  if (u.state === 'available' || u.state === 'downloading' || u.state === 'ready') {
    const mf = u.manifest;
    const notes = mf.notes && (mf.notes[S.settings.uiLang] || mf.notes.en || mf.notes.tr);
    items.push(h('div', { class: 'update-avail' },
      h('div', null, h('b', null, t('updateAvailable', { v: `CV Maker v${mf.displayVersion || mf.version}` }))),
      notes ? h('div', { class: 'notes' }, notes) : null));
  }
  if (u.state === 'downloading') items.push(h('div', { class: 'progress' }, h('i', { id: 'update-bar', style: `width:${u.progress * 100}%` })));
  const btns = h('div', { class: 'row-btns' });
  if (u.state === 'available') btns.append(h('button', { class: 'btn primary', onclick: doUpdate }, '⬇ ' + t('updateNow')));
  if (!['checking', 'downloading'].includes(u.state)) btns.append(h('button', { class: 'btn', onclick: () => checkUpdates(false) }, '⟳ ' + t('checkUpdates')));
  items.push(btns);
  p.replaceChildren(...items);
}
function renderUpdateProgress() {
  const bar = document.getElementById('update-bar');
  if (bar) bar.style.width = S.update.progress * 100 + '%';
  const bb = document.getElementById('banner-bar');
  if (bb) bb.style.width = S.update.progress * 100 + '%';
  const pct = document.getElementById('banner-pct');
  if (pct) pct.textContent = progressText();
}

async function checkUpdates(silent) {
  S.update.state = 'checking';
  renderUpdatePanel();
  const r = await api.checkUpdate(S.settings.updateUrl);
  if (!r.ok) {
    S.update = { ...S.update, state: silent ? 'idle' : 'error', error: r.error };
  } else if (r.available) {
    S.update = { ...S.update, state: 'available', manifest: r.manifest };
    const v = `CV Maker v${r.manifest.displayVersion || r.manifest.version}`;
    if (S.settings.notifiedVersion !== r.manifest.version) {
      api.notify({ title: t('updateNotifyTitle'), body: t('updateNotifyBody', { v }) });
      setSetting('notifiedVersion', r.manifest.version);
    }
  } else {
    S.update = { ...S.update, state: 'none' };
  }
  renderUpdatePanel();
  renderUpdateBanner();
}

function renderUpdateBanner() {
  const b = $('#update-banner');
  const u = S.update;
  if (!u.manifest || !['available', 'downloading', 'ready', 'error'].includes(u.state) || (u.state === 'error' && !u.fromBanner)) { b.hidden = true; return; }
  const v = `CV Maker v${u.manifest.displayVersion || u.manifest.version}`;
  b.hidden = false;
  const items = [];
  if (u.state === 'available') {
    items.push(h('span', null, '🎉 ' + t('updateAvailable', { v })),
      h('button', { class: 'btn primary small', onclick: doUpdate }, t('updateNow')),
      h('button', { class: 'icon-btn', onclick: () => { b.hidden = true; } }, '✕'));
  } else if (u.state === 'downloading') {
    items.push(h('span', null, t('updateDownloading', { v })),
      h('div', { class: 'progress small' }, h('i', { id: 'banner-bar', style: `width:${u.progress * 100}%` })),
      h('b', { id: 'banner-pct', class: 'pct' }, progressText()));
  } else if (u.state === 'ready') {
    items.push(h('span', null, t('updateRestarting')));
  } else {
    items.push(h('span', null, '⚠ ' + t('updateFailed')),
      h('button', { class: 'btn small', onclick: doUpdate }, t('retry')),
      h('button', { class: 'btn small', onclick: () => api.openUrl(u.manifest.url) }, t('downloadInBrowser')),
      h('button', { class: 'icon-btn', onclick: () => { b.hidden = true; } }, '✕'));
  }
  b.replaceChildren(...items);
}

function progressText() {
  const u = S.update;
  const mb = (n) => (n / 1048576).toFixed(0);
  return u.total ? `%${Math.round(u.progress * 100)} · ${mb(u.received)}/${mb(u.total)} MB` : `${mb(u.received || 0)} MB`;
}

async function doUpdate() {
  S.update.state = 'downloading';
  S.update.progress = 0;
  S.update.received = 0;
  S.update.fromBanner = true;
  renderUpdatePanel();
  renderUpdateBanner();
  try {
    persistCvs.flush();
    const file = await api.downloadUpdate(S.update.manifest);
    S.update.state = 'ready';
    renderUpdatePanel();
    renderUpdateBanner();
    api.saveCvsSync({ version: 1, cvs: S.cvs });
    api.saveSettingsSync(S.settings);
    const r = await api.applyUpdate(file);
    if (!r.restarted) {
      S.update.state = 'available';
      renderUpdateBanner();
      toast(t('updateDownloadedManual', { path: file.path || file }), 'info', 10000);
    }
  } catch (e) {
    S.update.state = 'error';
    S.update.error = e.message || String(e);
    renderUpdatePanel();
    renderUpdateBanner();
  }
}

boot();
