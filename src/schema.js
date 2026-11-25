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

/* Ways a phone number can be reached. Each number has its own set. */
const PHONE_CHANNELS = ['call', 'sms', 'whatsapp', 'telegram', 'signal', 'viber'];
const newPhone = (value = '', apps = ['call']) => ({ id: uid(), value, apps: apps.slice() });
function normPhones(list, legacy) {
  let out = Array.isArray(list) ? list.filter((p) => p && typeof p === 'object') : [];
  if (!out.length && legacy && String(legacy).trim()) out = [newPhone(String(legacy).trim())];
  for (const p of out) {
    p.id = p.id || uid();
    p.value = p.value || '';
    p.apps = (Array.isArray(p.apps) ? p.apps : ['call']).filter((a, i, arr) => PHONE_CHANNELS.includes(a) && arr.indexOf(a) === i);
  }
  return out;
}

const LANGUAGE_LEVELS = ['native', 'fluent', 'advanced', 'intermediate', 'beginner'];
const ICAO_LEVELS = ['6', '5', '4'];
const MEDICAL_CLASSES = ['class1', 'class2', 'class3', 'lapl'];
const AIRCRAFT_CATEGORIES = ['aeroplane', 'helicopter'];
const fmtHours = (v, lang) => { const n = Number(String(v || '').replace(',', '.')); return n ? n.toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : lang === 'en' ? 'en-GB' : 'tr-TR', { maximumFractionDigits: 1 }) : ''; };
const HOUR_KEYS = ['total', 'pic', 'sic', 'ifr', 'night'];

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
    // icao: ICAO dil yeterlik seviyesi (Doc 9835) — havacılık personeli için 4 / 5 / 6
    fields: [{ k: 'name', type: 'text' }, { k: 'level', type: 'select', options: LANGUAGE_LEVELS, optPrefix: 'lvl.' }, { k: 'icao', type: 'select', options: ICAO_LEVELS, optPrefix: 'icao.' }],
    view: (it, f) => ({ title: it.name, subtitle: [it.level ? f.label('lvl.' + it.level) : '', it.icao ? f.label('icao.' + it.icao) : ''].filter(Boolean).join(' · '), level: it.level ? 5 - LANGUAGE_LEVELS.indexOf(it.level) : 0 }),
    summary: (it) => it.name,
    compact: true,
  },
  certificates: {
    icon: '📜', side: false,
    fields: [
      { k: 'name', type: 'text', list: 'certificate' }, { k: 'issuer', type: 'text' }, { k: 'date', type: 'month' }, { k: 'expiry', type: 'day' },
      { k: 'credentialId', type: 'text' }, { k: 'url', type: 'url' }, { k: 'description', type: 'textarea', rows: 2 },
    ],
    view: (it, f) => ({ title: it.name, subtitle: it.issuer, date: f.valid(it.date, it.expiry), extra: [it.credentialId && `${f.label('credentialId')}: ${it.credentialId}`, it.url].filter(Boolean).join(' · '), text: it.description }),
    summary: (it) => it.name,
  },
  /* ---- havacılık ---- */
  licences: {
    icon: '🪪', side: false,
    fields: [
      { k: 'name', type: 'text', list: 'licence' }, { k: 'authority', type: 'text', list: 'authority' },
      { k: 'number', type: 'text' }, { k: 'date', type: 'month' }, { k: 'expiry', type: 'day' },
      { k: 'description', type: 'textarea', rows: 2 },
    ],
    view: (it, f) => ({ title: it.name, subtitle: it.authority, date: f.valid(it.date, it.expiry), extra: it.number ? `${f.label('field.number')}: ${it.number}` : '', text: it.description }),
    summary: (it) => [it.name, it.authority].filter(Boolean).join(' · '),
  },
  typeRatings: {
    icon: '✈️', side: false,
    fields: [
      { k: 'aircraft', type: 'text', list: 'aircraft' }, { k: 'privilege', type: 'text', list: 'privilege' },
      { k: 'date', type: 'month' }, { k: 'expiry', type: 'day' }, { k: 'description', type: 'textarea', rows: 2 },
    ],
    view: (it, f) => ({ title: it.aircraft, subtitle: it.privilege, date: f.valid(it.date, it.expiry), text: it.description }),
    summary: (it) => [it.aircraft, it.privilege].filter(Boolean).join(' · '),
  },
  flightHours: {
    icon: '🕑', side: false,
    fields: [
      { k: 'aircraft', type: 'text', list: 'aircraft' }, { k: 'category', type: 'select', options: AIRCRAFT_CATEGORIES, optPrefix: 'cat.' },
      { k: 'total', type: 'number' }, { k: 'pic', type: 'number' }, { k: 'sic', type: 'number' }, { k: 'ifr', type: 'number' }, { k: 'night', type: 'number' },
      { k: 'date', type: 'month' },
    ],
    view: (it, f) => {
      const hours = {};
      for (const k of HOUR_KEYS) hours[k] = Number(String(it[k] || '').replace(',', '.')) || 0;
      const parts = HOUR_KEYS.filter((k) => hours[k]).map((k) => `${f.label('hrs.' + k)} ${fmtHours(hours[k], f.lang)} ${f.label('hrs.unit')}`);
      return { title: it.aircraft, subtitle: it.category ? f.label('cat.' + it.category) : '', hours, extra: parts.join(' · '), date: it.date ? `${f.label('hrs.asOf')} ${f.month(it.date)}` : '' };
    },
    summary: (it) => [it.aircraft, it.total && `${it.total} h`].filter(Boolean).join(' · '),
  },
  medical: {
    icon: '🩺', side: false,
    fields: [
      { k: 'medClass', type: 'select', options: MEDICAL_CLASSES, optPrefix: 'med.' }, { k: 'authority', type: 'text', list: 'authority' },
      { k: 'date', type: 'month' }, { k: 'expiry', type: 'day' }, { k: 'limitations', type: 'text' },
    ],
    view: (it, f) => ({ title: it.medClass ? f.label('med.' + it.medClass) : '', subtitle: it.authority, date: f.valid(it.date, it.expiry), extra: it.limitations ? `${f.label('field.limitations')}: ${it.limitations}` : '' }),
    summary: (it) => [it.medClass, it.authority].filter(Boolean).join(' · '),
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
    fields: [{ k: 'name', type: 'text' }, { k: 'position', type: 'text' }, { k: 'company', type: 'text' }, { k: 'phones', type: 'phones' }, { k: 'email', type: 'email' }],
    view: (it, f) => {
      const phones = (it.phones || []).filter((p) => String(p.value || '').trim());
      return {
        title: it.name, subtitle: [it.position, it.company].filter(Boolean).join(', '),
        phones, email: it.email,
        extra: [...phones.map((p) => f.phoneText(p)), it.email].filter(Boolean).join(' · '),
      };
    },
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
  // Ortak çekirdeğin gömülü yazı tipleri (Latin: Inter, Arapça: Noto Sans Arabic) — her bilgisayarda aynı görünür; PDF'e gömülür.
  inter: { label: 'Inter + Noto Sans Arabic', css: "Inter, 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif", docx: 'Segoe UI' },
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
  // ATS uyumlu: tek sütun, standart başlıklar, fotoğraf/çubuk/simge yok, yaygın yazı tipi — otomatik taramada metin eksiksiz okunur
  { id: 'ats', builtin: true, ats: true, layout: 'classic', sidebarSide: 'start', accent: '#1f2937', sidebarBg: '#f3f4f6', sidebarText: '#111827', font: 'arial', fontSize: 10.5, headingStyle: 'line', photoShape: 'none', density: 'normal', skillStyle: 'text' },
  { id: 'atsSerif', builtin: true, ats: true, layout: 'classic', sidebarSide: 'start', accent: '#1e3a5f', sidebarBg: '#f3f4f6', sidebarText: '#111827', font: 'cambria', fontSize: 11, headingStyle: 'caps', photoShape: 'none', density: 'normal', skillStyle: 'text' },
  { id: 'aviation', builtin: true, layout: 'banner', sidebarSide: 'end', accent: '#0b2e59', sidebarBg: '#eef3f9', sidebarText: '#0b1f3a', font: 'inter', fontSize: 10, headingStyle: 'bar', photoShape: 'rect', density: 'normal', skillStyle: 'dots' },
  { id: 'europass', builtin: true, layout: 'classic', sidebarSide: 'start', accent: '#1d4e89', sidebarBg: '#f1f5f9', sidebarText: '#0f172a', font: 'arial', fontSize: 10, headingStyle: 'caps', photoShape: 'rect', density: 'compact', skillStyle: 'text' },
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
    else if (f.type === 'phones') it[f.k] = [newPhone()];
    else if (f.type === 'number') it[f.k] = '';
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
  personal.phone.numbers = [newPhone()];
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
    targetCountry: '',
    qr: { on: false, kind: 'vcard', url: '' },
    coverLetters: [],
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
  // Phone numbers: several per person, each with its own channels (call, WhatsApp, …).
  const ph = cv.personal.phone;
  ph.numbers = normPhones(ph.numbers, ph.value);
  if (!ph.numbers.length) ph.numbers = [newPhone()];
  ph.value = ph.numbers.map((n) => n.value).filter(Boolean).join(', ');
  cv.design = Object.assign({}, base.design, cv.design);
  cv.sections = (cv.sections || []).filter((s) => SECTION_TYPES[s.type]);
  for (const s of cv.sections) {
    s.items = s.items || [];
    if (s.visible === undefined) s.visible = true;
    if (s.side === undefined) s.side = SECTION_TYPES[s.type].side;
    if (s.type === 'references') {
      for (const it of s.items) {
        it.phones = normPhones(it.phones, it.phone);
        if (!it.phones.length) it.phones = [newPhone()];
        delete it.phone;
      }
    }
  }
  cv.lang = cv.lang || 'auto';
  // 2.2: hedef ülke (ülkeye göre öneriler), QR kod, ön yazılar, çeviri bağı
  if (typeof cv.targetCountry !== 'string') cv.targetCountry = '';
  cv.qr = Object.assign({ on: false, kind: 'vcard', url: '' }, cv.qr);
  if (!Array.isArray(cv.coverLetters)) cv.coverLetters = [];
  if (cv.translation && typeof cv.translation !== 'object') delete cv.translation;
  return cv;
}

function sampleCv(lang) {
  const cv = newCv(lang === 'ar' ? 'سيرتي الذاتية' : lang === 'en' ? 'My CV' : 'Özgeçmişim');
  return cv;
}
