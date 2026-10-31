'use strict';
/* Data model: section types, fields, templates, defaults. */

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const PERSONAL_FIELDS = [
  { k: 'fullName', type: 'text' },
  { k: 'jobTitle', type: 'text' },
  { k: 'email', type: 'email' },
  { k: 'phone', type: 'tel' },
  { k: 'address', type: 'text' },
  { k: 'birthDate', type: 'date' },
  { k: 'birthPlace', type: 'text' },
  { k: 'nationality', type: 'text' },
  { k: 'gender', type: 'text' },
  { k: 'maritalStatus', type: 'text' },
  { k: 'children', type: 'text' },
  { k: 'militaryStatus', type: 'text' },
  { k: 'drivingLicense', type: 'text' },
  { k: 'website', type: 'url' },
  { k: 'linkedin', type: 'url' },
  { k: 'github', type: 'url' },
];

const LANGUAGE_LEVELS = ['native', 'fluent', 'advanced', 'intermediate', 'beginner'];

/*
 * Each type: fields (editor), side (default column in two-column layouts),
 * view(item, fmt) -> normalized display entry used by HTML and DOCX renderers.
 */
const SECTION_TYPES = {
  summary: {
    icon: '📝', side: false,
    fields: [{ k: 'text', type: 'textarea', rows: 5 }],
    view: (it) => ({ text: it.text }),
    summary: (it) => it.text,
  },
  experience: {
    icon: '💼', side: false,
    fields: [
      { k: 'position', type: 'text' }, { k: 'company', type: 'text' },
      { k: 'location', type: 'text' }, { k: 'start', type: 'month' }, { k: 'end', type: 'month' },
      { k: 'current', type: 'check' }, { k: 'description', type: 'textarea', rows: 4 },
    ],
    view: (it, f) => ({ title: it.position, subtitle: it.company, location: it.location, date: f.range(it.start, it.end, it.current), text: it.description }),
    summary: (it) => [it.position, it.company].filter(Boolean).join(' · '),
  },
  education: {
    icon: '🎓', side: false,
    fields: [
      { k: 'degree', type: 'text' }, { k: 'school', type: 'text' }, { k: 'field', type: 'text' },
      { k: 'location', type: 'text' }, { k: 'start', type: 'month' }, { k: 'end', type: 'month' },
      { k: 'current', type: 'check' }, { k: 'grade', type: 'text' }, { k: 'description', type: 'textarea', rows: 3 },
    ],
    view: (it, f) => ({
      title: [it.degree, it.field].filter(Boolean).join(' – '), subtitle: it.school, location: it.location,
      date: f.range(it.start, it.end, it.current), extra: it.grade ? `${f.label('grade')}: ${it.grade}` : '', text: it.description,
    }),
    summary: (it) => [it.school, it.degree].filter(Boolean).join(' · '),
  },
  skills: {
    icon: '🛠️', side: true,
    fields: [{ k: 'name', type: 'text' }, { k: 'level', type: 'range', min: 0, max: 5 }],
    view: (it) => ({ title: it.name, level: Number(it.level) || 0 }),
    summary: (it) => it.name,
    compact: true,
  },
  languages: {
    icon: '🌐', side: true,
    fields: [{ k: 'name', type: 'text' }, { k: 'level', type: 'select', options: LANGUAGE_LEVELS, optPrefix: 'lvl.' }],
    view: (it, f) => ({ title: it.name, subtitle: it.level ? f.label('lvl.' + it.level) : '', level: it.level ? 5 - LANGUAGE_LEVELS.indexOf(it.level) : 0 }),
    summary: (it) => it.name,
    compact: true,
  },
  certificates: {
    icon: '📜', side: false,
    fields: [
      { k: 'name', type: 'text' }, { k: 'issuer', type: 'text' }, { k: 'date', type: 'month' },
      { k: 'credentialId', type: 'text' }, { k: 'url', type: 'url' }, { k: 'description', type: 'textarea', rows: 2 },
    ],
    view: (it, f) => ({ title: it.name, subtitle: it.issuer, date: f.month(it.date), extra: [it.credentialId && `${f.label('credentialId')}: ${it.credentialId}`, it.url].filter(Boolean).join(' · '), text: it.description }),
    summary: (it) => it.name,
  },
  courses: {
    icon: '📚', side: false,
    fields: [{ k: 'name', type: 'text' }, { k: 'institution', type: 'text' }, { k: 'date', type: 'month' }, { k: 'hours', type: 'text' }, { k: 'description', type: 'textarea', rows: 2 }],
    view: (it, f) => ({ title: it.name, subtitle: it.institution, date: f.month(it.date), extra: it.hours ? `${f.label('hours')}: ${it.hours}` : '', text: it.description }),
    summary: (it) => it.name,
  },
  projects: {
    icon: '🚀', side: false,
    fields: [
      { k: 'name', type: 'text' }, { k: 'role', type: 'text' }, { k: 'start', type: 'month' }, { k: 'end', type: 'month' },
      { k: 'current', type: 'check' }, { k: 'url', type: 'url' }, { k: 'description', type: 'textarea', rows: 3 },
    ],
    view: (it, f) => ({ title: it.name, subtitle: it.role, date: f.range(it.start, it.end, it.current), extra: it.url, text: it.description }),
    summary: (it) => it.name,
  },
  awards: {
    icon: '🏆', side: false,
    fields: [{ k: 'title', type: 'text' }, { k: 'issuer', type: 'text' }, { k: 'date', type: 'month' }, { k: 'description', type: 'textarea', rows: 2 }],
    view: (it, f) => ({ title: it.title, subtitle: it.issuer, date: f.month(it.date), text: it.description }),
    summary: (it) => it.title,
  },
  publications: {
    icon: '📰', side: false,
    fields: [{ k: 'title', type: 'text' }, { k: 'publisher', type: 'text' }, { k: 'date', type: 'month' }, { k: 'url', type: 'url' }, { k: 'description', type: 'textarea', rows: 2 }],
    view: (it, f) => ({ title: it.title, subtitle: it.publisher, date: f.month(it.date), extra: it.url, text: it.description }),
    summary: (it) => it.title,
  },
  volunteer: {
    icon: '🤝', side: false,
    fields: [
      { k: 'role', type: 'text' }, { k: 'organization', type: 'text' }, { k: 'start', type: 'month' }, { k: 'end', type: 'month' },
      { k: 'current', type: 'check' }, { k: 'description', type: 'textarea', rows: 3 },
    ],
    view: (it, f) => ({ title: it.role, subtitle: it.organization, date: f.range(it.start, it.end, it.current), text: it.description }),
    summary: (it) => [it.role, it.organization].filter(Boolean).join(' · '),
  },
  references: {
    icon: '👥', side: false,
    fields: [{ k: 'name', type: 'text' }, { k: 'position', type: 'text' }, { k: 'company', type: 'text' }, { k: 'phone', type: 'tel' }, { k: 'email', type: 'email' }],
    view: (it) => ({ title: it.name, subtitle: [it.position, it.company].filter(Boolean).join(', '), extra: [it.phone, it.email].filter(Boolean).join(' · ') }),
    summary: (it) => it.name,
  },
  hobbies: {
    icon: '🎨', side: true,
    fields: [{ k: 'name', type: 'text' }],
    view: (it) => ({ title: it.name }),
    summary: (it) => it.name,
    compact: true, inline: true,
  },
  custom: {
    icon: '✳️', side: false,
    fields: [
      { k: 'title', type: 'text' }, { k: 'subtitle', type: 'text' }, { k: 'location', type: 'text' },
      { k: 'start', type: 'month' }, { k: 'end', type: 'month' }, { k: 'description', type: 'textarea', rows: 3 },
    ],
    view: (it, f) => ({ title: it.title, subtitle: it.subtitle, location: it.location, date: f.range(it.start, it.end, false), text: it.description }),
    summary: (it) => it.title,
  },
  documents: {
    icon: '📎', side: false,
    fields: [
      { k: 'title', type: 'text' }, { k: 'issuer', type: 'text' }, { k: 'date', type: 'month' },
      { k: 'description', type: 'textarea', rows: 2 }, { k: 'file', type: 'file' }, { k: 'append', type: 'check' },
    ],
    view: (it, f) => ({ title: it.title || it.fileName, subtitle: it.issuer, date: f.month(it.date), text: it.description, attached: !!(it.fileId && it.append !== false) }),
    summary: (it) => it.title || it.fileName,
  },
};

const FONTS = {
  segoe: { label: 'Segoe UI', css: "'Segoe UI', 'Noto Sans', Tahoma, Arial, sans-serif", docx: 'Segoe UI' },
  calibri: { label: 'Calibri', css: "Calibri, Carlito, 'Segoe UI', Tahoma, sans-serif", docx: 'Calibri' },
  arial: { label: 'Arial', css: "Arial, 'Liberation Sans', Tahoma, sans-serif", docx: 'Arial' },
  verdana: { label: 'Verdana', css: "Verdana, 'DejaVu Sans', Tahoma, sans-serif", docx: 'Verdana' },
  tahoma: { label: 'Tahoma', css: "Tahoma, 'DejaVu Sans', sans-serif", docx: 'Tahoma' },
  georgia: { label: 'Georgia', css: "Georgia, 'DejaVu Serif', 'Times New Roman', serif", docx: 'Georgia' },
  cambria: { label: 'Cambria', css: "Cambria, Caladea, Georgia, serif", docx: 'Cambria' },
  times: { label: 'Times New Roman', css: "'Times New Roman', 'Liberation Serif', serif", docx: 'Times New Roman' },
  garamond: { label: 'Garamond', css: "Garamond, 'EB Garamond', Georgia, serif", docx: 'Garamond' },
};

const BUILTIN_TEMPLATES = [
  { id: 'modern', builtin: true, layout: 'sidebar', sidebarSide: 'start', accent: '#3b82f6', sidebarBg: '#1e293b', sidebarText: '#e2e8f0', font: 'segoe', fontSize: 10, headingStyle: 'bar', photoShape: 'circle', density: 'normal', skillStyle: 'bars' },
  { id: 'classic', builtin: true, layout: 'classic', sidebarSide: 'start', accent: '#1f2937', sidebarBg: '#f3f4f6', sidebarText: '#111827', font: 'cambria', fontSize: 10.5, headingStyle: 'line', photoShape: 'rect', density: 'normal', skillStyle: 'text' },
  { id: 'professional', builtin: true, layout: 'banner', sidebarSide: 'end', accent: '#0f4c81', sidebarBg: '#f1f5f9', sidebarText: '#0f172a', font: 'calibri', fontSize: 10.5, headingStyle: 'line', photoShape: 'rect', density: 'normal', skillStyle: 'dots' },
  { id: 'minimal', builtin: true, layout: 'classic', sidebarSide: 'start', accent: '#0f766e', sidebarBg: '#f0fdfa', sidebarText: '#134e4a', font: 'arial', fontSize: 10, headingStyle: 'caps', photoShape: 'rounded', density: 'compact', skillStyle: 'text' },
  { id: 'elegant', builtin: true, layout: 'split', sidebarSide: 'end', accent: '#9d174d', sidebarBg: '#fdf2f8', sidebarText: '#500724', font: 'georgia', fontSize: 10, headingStyle: 'plain', photoShape: 'circle', density: 'relaxed', skillStyle: 'dots' },
  { id: 'fresh', builtin: true, layout: 'sidebar', sidebarSide: 'end', accent: '#059669', sidebarBg: '#ecfdf5', sidebarText: '#064e3b', font: 'verdana', fontSize: 9.5, headingStyle: 'boxed', photoShape: 'rounded', density: 'normal', skillStyle: 'bars' },
];

const DESIGN_KEYS = ['layout', 'sidebarSide', 'accent', 'sidebarBg', 'sidebarText', 'font', 'fontSize', 'headingStyle', 'photoShape', 'density', 'skillStyle'];

function pickDesign(tpl) {
  const d = { templateId: tpl.id };
  for (const k of DESIGN_KEYS) d[k] = tpl[k];
  return d;
}

function newItem(type) {
  const it = { id: uid(), visible: true };
  for (const f of SECTION_TYPES[type].fields) {
    if (f.type === 'check') it[f.k] = f.k === 'append';
    else if (f.type === 'range') it[f.k] = 3;
    else if (f.type !== 'file') it[f.k] = '';
  }
  return it;
}

function newSection(type, withItem = true) {
  return { id: uid(), type, title: '', visible: true, side: SECTION_TYPES[type].side, items: withItem ? [newItem(type)] : [] };
}

function newCv(name) {
  const personal = {};
  for (const f of PERSONAL_FIELDS) personal[f.k] = { value: '', visible: true };
  return {
    id: uid(),
    name: name || 'CV',
    lang: 'auto',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    photo: { data: '', visible: true },
    personal,
    personalOrder: PERSONAL_FIELDS.map((f) => f.k),
    customFields: [],
    design: pickDesign(BUILTIN_TEMPLATES[0]),
    sections: ['summary', 'experience', 'education', 'skills', 'languages', 'certificates', 'references', 'documents'].map((t) => newSection(t)),
  };
}

/* Upgrade older/partial data so every expected key exists. */
function normalizeCv(cv) {
  const base = newCv(cv.name);
  cv.photo = Object.assign({ data: '', visible: true }, cv.photo);
  cv.personal = cv.personal || {};
  for (const f of PERSONAL_FIELDS) cv.personal[f.k] = Object.assign({ value: '', visible: true }, cv.personal[f.k]);
  cv.customFields = cv.customFields || [];
  // personalOrder holds built-in keys and custom fields as 'c:<id>' in one list.
  const customIds = new Set(cv.customFields.map((c) => 'c:' + c.id));
  cv.personalOrder = (cv.personalOrder || []).filter((k, i, a) => (cv.personal[k] || customIds.has(k)) && a.indexOf(k) === i);
  for (const f of PERSONAL_FIELDS) {
    if (cv.personalOrder.includes(f.k)) continue;
    const prev = PERSONAL_FIELDS[PERSONAL_FIELDS.indexOf(f) - 1];
    const at = prev ? cv.personalOrder.indexOf(prev.k) : -1;
    cv.personalOrder.splice(at + 1, 0, f.k);
  }
  for (const id of customIds) if (!cv.personalOrder.includes(id)) cv.personalOrder.push(id);
  for (const c of cv.customFields) c.labels = c.labels || {};
  cv.design = Object.assign({}, base.design, cv.design);
  cv.sections = (cv.sections || []).filter((s) => SECTION_TYPES[s.type]);
  for (const s of cv.sections) {
    s.items = s.items || [];
    if (s.visible === undefined) s.visible = true;
    if (s.side === undefined) s.side = SECTION_TYPES[s.type].side;
  }
  cv.lang = cv.lang || 'auto';
  return cv;
}

function sampleCv(lang) {
  const cv = newCv(lang === 'ar' ? 'سيرتي الذاتية' : lang === 'en' ? 'My CV' : 'Özgeçmişim');
  return cv;
}
