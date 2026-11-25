'use strict';
/* Yapay zekâ: önce çevrim içi (kullanıcının KENDİ anahtarıyla Gemini / OpenAI / Anthropic / Groq), internet yoksa ya da
   çağrı başarısız olursa bilgisayardaki yerel model (Ollama, isteğe bağlı), o da yoksa kural tabanlı çevrim dışı yedek.
   Anahtar ortak çekirdeğin deposundadır (FC.storage 'ai' = {provider, key, model}); yalnız bu cihazda tutulur ve yalnız
   seçilen sağlayıcıya gönderilir. Çağrılar FC.usage ile sayılır (Ayarlar → Kullanım Limitleri); yöneticinin kotası kullanılmaz. */
(function (g) {
  const MODELS = { gemini: 'gemini-flash-latest', openai: 'gpt-4o-mini', anthropic: 'claude-haiku-5-5', groq: 'llama-3.3-70b-versatile' };
  const LANG_NAME = { tr: 'Turkish', en: 'English', ar: 'Arabic' };

  const S = () => g.FC.storage;
  function cloud() { const a = S().get('ai', null); return a && a.provider && a.key ? a : null; }
  function local() { const l = S().get('ai.local', null); return l && l.on && l.model ? Object.assign({ url: 'http://127.0.0.1:11434' }, l) : null; }
  function mode() { return cloud() && navigator.onLine !== false ? 'cloud' : local() ? 'local' : 'offline'; }
  function available() { return !!(cloud() || local()); }

  async function callCloud(a, prompt, o) {
    const h = { 'Content-Type': 'application/json' };
    const max = o.maxTokens || 2000;
    let u, body, pick;
    if (a.provider === 'gemini') {
      u = `https://generativelanguage.googleapis.com/v1beta/models/${a.model || MODELS.gemini}:generateContent?key=${encodeURIComponent(a.key)}`;
      body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: Object.assign({ maxOutputTokens: max, temperature: o.temperature ?? 0.4 }, o.json ? { responseMimeType: 'application/json' } : {}) };
      if (o.system) body.systemInstruction = { parts: [{ text: o.system }] };
      pick = (j) => j.candidates[0].content.parts.map((p) => p.text || '').join('');
    } else if (a.provider === 'anthropic') {
      u = 'https://api.anthropic.com/v1/messages';
      Object.assign(h, { 'x-api-key': a.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
      body = { model: a.model || MODELS.anthropic, max_tokens: max, temperature: o.temperature ?? 0.4, messages: [{ role: 'user', content: prompt }] };
      if (o.system) body.system = o.system;
      pick = (j) => j.content.map((c) => c.text || '').join('');
    } else {
      u = a.provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      h.Authorization = 'Bearer ' + a.key;
      body = { model: a.model || MODELS[a.provider] || MODELS.openai, max_tokens: max, temperature: o.temperature ?? 0.4, messages: (o.system ? [{ role: 'system', content: o.system }] : []).concat([{ role: 'user', content: prompt }]) };
      if (o.json) body.response_format = { type: 'json_object' };
      pick = (j) => j.choices[0].message.content;
    }
    if (g.FC.usage) g.FC.usage.count('ai.' + a.provider);
    const r = await fetch(u, { method: 'POST', headers: h, body: JSON.stringify(body), signal: o.signal });
    if (!r.ok) {
      if (r.status === 429 && g.FC.usage) g.FC.usage.count('ai.' + a.provider + '.full');
      const e = new Error('HTTP_' + r.status); e.status = r.status; throw e;
    }
    return pick(await r.json());
  }
  async function callLocal(l, prompt, o) {
    const r = await fetch(l.url.replace(/\/+$/, '') + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: o.signal,
      body: JSON.stringify(Object.assign({ model: l.model, stream: false, options: { temperature: o.temperature ?? 0.4 }, messages: (o.system ? [{ role: 'system', content: o.system }] : []).concat([{ role: 'user', content: prompt }]) }, o.json ? { format: 'json' } : {})),
    });
    if (!r.ok) throw new Error('LOCAL_' + r.status);
    return (await r.json()).message.content;
  }

  /** Metin üretir. Döner: {text, via: 'cloud'|'local'}; hiçbiri yoksa hata 'NO_AI' (çağıran çevrim dışı yedeğe geçer). */
  async function ask(prompt, o = {}) {
    const a = cloud(), l = local();
    let lastErr = null;
    if (a && navigator.onLine !== false) {
      try { return { text: await callCloud(a, prompt, o), via: 'cloud', provider: a.provider }; } catch (e) { lastErr = e; if (e.name === 'AbortError') throw e; }
    }
    if (l) {
      try { return { text: await callLocal(l, prompt, o), via: 'local', provider: 'ollama' }; } catch (e) { lastErr = lastErr || e; if (e.name === 'AbortError') throw e; }
    }
    const e = new Error(lastErr ? lastErr.message : 'NO_AI'); e.cause = lastErr; e.noAi = !lastErr; throw e;
  }
  function parseJson(s) {
    const t = String(s || '').replace(/^```(?:json)?\s*|\s*```$/g, '');
    try { return JSON.parse(t); } catch (e) { }
    const m = t.match(/[[{][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]);
    throw new Error('BAD_JSON');
  }
  async function askJson(prompt, o = {}) {
    const r = await ask(prompt, Object.assign({}, o, { json: true }));
    return Object.assign({}, r, { data: parseJson(r.text) });
  }

  /* ---------- ortak sistem talimatı ---------- */
  function system(lang, aviation) {
    return [
      'You are a senior career consultant and professional CV editor.',
      aviation ? 'The candidate works in civil aviation. Use the formal terminology of ICAO, EASA (Part-FCL, Part-66, Part-CC) and the national authority (e.g. SHGM in Türkiye, GCAA in UAE, GACA in Saudi Arabia). Never use casual or colloquial wording; keep standard abbreviations (PIC, SIC, ATPL, CPL, MCC, CRM, DGR, B1/B2, CRS, AMM, ETOPS, LVO, UPRT, TRI/TRE).' : 'Use formal, professional business language.',
      `Write in ${LANG_NAME[lang] || 'Turkish'}${lang === 'ar' ? ' (Modern Standard Arabic, formal register)' : ''}.`,
      'Never invent facts, employers, dates, numbers, licences or achievements that are not in the input. Where a measurable result would strengthen a statement but is unknown, insert a placeholder like [X] or [%] for the candidate to fill.',
    ].join(' ');
  }

  /* ---------- 1) madde / metin iyileştirme ---------- */
  async function improveText(text, ctx) {
    const prompt = `Rewrite the following ${ctx.kind === 'summary' ? 'professional summary (max 4 sentences, ~70 words)' : 'CV entry description as concise achievement-oriented bullet points (each starts with "- ", begins with a strong past-tense action verb, max ~25 words, keep the original facts)'}.
Role: ${ctx.role || '-'}${ctx.company ? ' at ' + ctx.company : ''}. Target job title: ${ctx.jobTitle || '-'}.
Return ONLY the rewritten text, no comments.

TEXT:
${text}`;
    const r = await ask(prompt, { system: system(ctx.lang, ctx.aviation), maxTokens: 900, signal: ctx.signal });
    return Object.assign(r, { text: r.text.trim().replace(/^```\w*\s*|\s*```$/g, '') });
  }
  /* Çevrim dışı: biçim düzeltme + öneriler (içerik uydurulmaz) */
  const VERBS = {
    tr: ['Yönettim', 'Koordine ettim', 'Geliştirdim', 'Uyguladım', 'Azalttım', 'Artırdım', 'Planladım', 'Denetledim', 'Eğittim', 'Sağladım', 'Tamamladım', 'Raporladım'],
    en: ['Led', 'Coordinated', 'Developed', 'Implemented', 'Reduced', 'Increased', 'Planned', 'Audited', 'Trained', 'Ensured', 'Completed', 'Reported'],
    ar: ['أدرتُ', 'نسّقتُ', 'طوّرتُ', 'نفّذتُ', 'خفّضتُ', 'رفعتُ', 'خطّطتُ', 'دقّقتُ', 'درّبتُ', 'ضمنتُ', 'أنجزتُ', 'أعددتُ تقارير'],
  };
  function improveOffline(text, ctx) {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out = (ctx.kind === 'summary' ? lines : lines.map((l) => {
      let x = l.replace(/^[-•*▪–]\s*/, '');
      x = x.charAt(0).toLocaleUpperCase(ctx.lang === 'tr' ? 'tr-TR' : undefined) + x.slice(1);
      x = x.replace(/\s*[.;]+$/, '');
      return '- ' + x;
    })).join('\n');
    const tips = ['tipVerb', 'tipNumbers', 'tipShort'];
    if (ctx.kind === 'summary') tips.splice(0, 3, 'tipSummary', 'tipNumbers');
    return { text: out, tips, verbs: VERBS[ctx.lang] || VERBS.en, via: 'offline' };
  }

  /* ---------- 2) ilana göre uyarlama ---------- */
  function compactCv(cv) {
    const P = cv.personal;
    const out = { name: P.fullName.value, title: P.jobTitle.value, sections: [] };
    for (const s of cv.sections) {
      if (!s.visible || s.type === 'documents' || s.type === 'references') continue;
      out.sections.push({ id: s.id, type: s.type, items: s.items.filter((it) => it.visible !== false).map((it) => {
        const o = { id: it.id };
        for (const [k, v] of Object.entries(it)) if (typeof v === 'string' && v && !/^(id|fileId|mime|fileName)$/.test(k)) o[k] = v;
        return o;
      }) });
    }
    return out;
  }
  async function tailor(cv, posting, lang, aviation) {
    const prompt = `Compare the CANDIDATE CV with the JOB POSTING. Answer ONLY with JSON:
{"score": 0-100 fit score,
 "matched": ["requirement the CV already covers", ...],
 "missing": ["important requirement/keyword not visible in the CV", ...],
 "summary": "a rewritten professional summary (max 70 words) targeted at this job, using only facts from the CV",
 "jobTitle": "the most suitable headline/job title for this application",
 "skills": ["skill/keyword from the posting the candidate plausibly has according to the CV but did not list", ...],
 "bullets": [{"itemId": "id of an experience item", "text": "rewritten description as '- ' bullets emphasising what the posting asks for"}],
 "advice": ["short concrete advice", ...]}
Keep at most 3 entries in "bullets". All text in ${LANG_NAME[lang]}.

JOB POSTING:
${posting.slice(0, 8000)}

CANDIDATE CV (JSON):
${JSON.stringify(compactCv(cv)).slice(0, 12000)}`;
    return askJson(prompt, { system: system(lang, aviation), maxTokens: 2500 });
  }

  /* ---------- 3) ön yazı ---------- */
  async function coverLetter(cv, o) {
    const prompt = `Write a cover letter (250–350 words, ${o.tone === 'formal' ? 'very formal' : o.tone === 'warm' ? 'warm but professional' : 'professional and confident'} tone) for the candidate below.
Company: ${o.company || '-'}. Position: ${o.position || '-'}.${o.contact ? ' Addressee: ' + o.contact + '.' : ''}
Structure: salutation; why this company/position; 2 short paragraphs with the most relevant experience and qualifications from the CV; closing with availability for interview; sign-off with the candidate's name.
Return ONLY the letter text (no subject line, no markdown).
${o.posting ? '\nJOB POSTING:\n' + o.posting.slice(0, 6000) : ''}

CANDIDATE CV (JSON):
${JSON.stringify(compactCv(cv)).slice(0, 10000)}`;
    const r = await ask(prompt, { system: system(o.lang, o.aviation), maxTokens: 1500, temperature: 0.6 });
    return Object.assign(r, { text: r.text.trim() });
  }
  function coverLetterOffline(cv, o, t) {
    const P = cv.personal;
    const name = P.fullName.value || '';
    const exp = (cv.sections.find((s) => s.type === 'experience') || { items: [] }).items.filter((x) => x.visible !== false);
    const first = exp.map((x) => Number(String(x.start || '').slice(0, 4))).filter(Boolean);
    const years = first.length ? new Date().getFullYear() - Math.min(...first) : 0;
    const skills = (cv.sections.find((s) => s.type === 'skills') || { items: [] }).items.map((x) => x.name).filter(Boolean).slice(0, 4);
    const recent = exp[0] || {};
    return t('cl.template', {
      contact: o.contact || t('cl.defaultContact'), company: o.company || t('cl.yourCompany'), position: o.position || P.jobTitle.value || '',
      title: P.jobTitle.value || '', years: years || '…', recentRole: recent.position || P.jobTitle.value || '', recentCompany: recent.company || '…',
      skills: skills.join(o.lang === 'ar' ? '، ' : ', ') || '…', name,
    });
  }

  /* ---------- 4) CV çevirisi ---------- */
  const SKIP_KEYS = /^(id|fileId|mime|fileName|url|start|end|date|expiry|level|icao|medClass|category|current|append|visible|total|pic|sic|ifr|night|email|credentialId|number)$/;
  /** Çevrilecek serbest metinleri {anahtar: metin} olarak toplar. */
  function collectStrings(cv) {
    const map = {};
    const P = cv.personal;
    for (const k of ['jobTitle', 'address', 'nationality', 'birthPlace', 'gender', 'maritalStatus', 'militaryStatus', 'drivingLicense', 'children']) if (P[k] && String(P[k].value || '').trim()) map['p.' + k] = P[k].value;
    for (const c of cv.customFields || []) { if (c.label) map['cl.' + c.id] = c.label; if (c.value) map['cv.' + c.id] = c.value; }
    for (const s of cv.sections) {
      if (s.title) map[`st.${s.id}`] = s.title;
      for (const it of s.items) for (const [k, v] of Object.entries(it)) if (typeof v === 'string' && v.trim() && !SKIP_KEYS.test(k) && !/^https?:/.test(v)) map[`i.${s.id}.${it.id}.${k}`] = v;
    }
    return map;
  }
  function applyStrings(cv, map) {
    const P = cv.personal;
    for (const [key, v] of Object.entries(map)) {
      if (typeof v !== 'string') continue;
      const [kind, a, b, c] = key.split('.');
      if (kind === 'p' && P[a]) P[a].value = v;
      else if (kind === 'cl' || kind === 'cv') { const f = (cv.customFields || []).find((x) => x.id === a); if (f) f[kind === 'cl' ? 'label' : 'value'] = v; }
      else if (kind === 'st') { const s = cv.sections.find((x) => x.id === a); if (s) s.title = v; }
      else if (kind === 'i') { const s = cv.sections.find((x) => x.id === a); const it = s && s.items.find((x) => x.id === b); if (it && c in it) it[c] = v; }
    }
  }
  async function translateCv(cv, from, to, aviation, onProgress) {
    const all = collectStrings(cv);
    const keys = Object.keys(all);
    const out = {};
    const chunks = [];
    let cur = {}, size = 0;
    for (const k of keys) {
      if (size + all[k].length > 5000 && size) { chunks.push(cur); cur = {}; size = 0; }
      cur[k] = all[k]; size += all[k].length;
    }
    if (size) chunks.push(cur);
    let via = 'cloud';
    for (let i = 0; i < chunks.length; i++) {
      if (onProgress) onProgress(i, chunks.length);
      const prompt = `Translate every value of this JSON object from ${LANG_NAME[from] || 'the source language'} into ${LANG_NAME[to]}. It is the content of a CV.
Rules: keep the keys unchanged; keep "- " bullet markers and line breaks; keep proper names of people, companies, schools and aircraft types; keep standard abbreviations (ATPL, CPL, PIC, SIC, B1, CRM, DGR, ICAO, EASA, SHGM, GCAA…) and translate licence/rating names with their official name in ${LANG_NAME[to]}; use formal ${to === 'ar' ? 'Modern Standard Arabic' : 'register'}${aviation ? ' and the official aviation terminology of ICAO / the civil aviation authorities' : ''}.
Answer ONLY with the translated JSON object.

${JSON.stringify(chunks[i])}`;
      const r = await askJson(prompt, { system: system(to, aviation), maxTokens: 4000, temperature: 0.2 });
      via = r.via;
      Object.assign(out, r.data && typeof r.data === 'object' ? r.data : {});
    }
    if (onProgress) onProgress(chunks.length, chunks.length);
    return { map: out, via, total: keys.length };
  }
  /** Çevrim dışı: yalnız sözlükte karşılığı olanlar çevrilir; kalanlar işaretlenir. */
  function translateOffline(cv, from, to) {
    const all = collectStrings(cv);
    const map = {};
    let done = 0;
    const left = [];
    for (const [k, v] of Object.entries(all)) {
      const ctx = /\.degree$/.test(k) ? 'degree' : '';
      const x = g.AV.glossaryTranslate(v, from, to, ctx);
      if (x) { map[k] = x; done++; } else left.push(k);
    }
    return { map, via: 'offline', total: Object.keys(all).length, done, left };
  }

  g.AIX = { mode, available, ask, askJson, parseJson, improveText, improveOffline, tailor, coverLetter, coverLetterOffline, translateCv, translateOffline, collectStrings, applyStrings, compactCv, MODELS, cloud, local, VERBS };
})(window);
