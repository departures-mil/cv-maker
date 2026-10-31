'use strict';
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, VerticalAlign, PageBreak, TableLayoutType,
} = require('docx');

const FONT_NAMES = {
  segoe: 'Segoe UI', calibri: 'Calibri', arial: 'Arial', verdana: 'Verdana', tahoma: 'Tahoma',
  georgia: 'Georgia', cambria: 'Cambria', times: 'Times New Roman', garamond: 'Garamond',
};

const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1020;
const TEXT_W = PAGE_W - MARGIN * 2;
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };

function imageSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), type: 'jpg' };
      }
      i += 2 + len;
    }
  }
  return null;
}

function buildDocx(m, attachments) {
  const rtl = m.dir === 'rtl';
  const d = m.design;
  const accent = String(d.accent || '#1f2937').replace('#', '');
  const fontName = FONT_NAMES[d.font] || 'Segoe UI';
  const base = Math.round((d.fontSize || 10.5) * 2);
  const START = AlignmentType.START, END = AlignmentType.END;

  const run = (text, o = {}) => new TextRun({ text: String(text ?? ''), rightToLeft: rtl && /[\u0590-\u08FF\uFB1D-\uFEFC]/.test(String(text ?? '')), size: o.size || base, sizeComplexScript: o.size || base, bold: o.bold, boldComplexScript: o.bold, color: o.color, italics: o.italics });
  const para = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], bidirectional: rtl, alignment: o.align || START, spacing: { after: o.after ?? 40, before: o.before ?? 0 }, border: o.border, bullet: o.bullet, keepNext: o.keepNext });

  const body = [];

  // ---- header: name, title, contacts (+ photo) ----
  const headText = [
    para(run(m.name, { size: base * 2.2, bold: true, color: '111827' }), { after: 60 }),
    m.jobTitle ? para(run(m.jobTitle, { size: Math.round(base * 1.25), bold: true, color: accent }), { after: 80 }) : null,
    ...m.contacts.map((c) => para([run(c.label + ': ', { color: '6B7280' }), run(c.value)], { after: 20 })),
  ].filter(Boolean);

  if (m.photo) {
    const buf = Buffer.from(m.photo.split(',')[1], 'base64');
    const sz = imageSize(buf) || { w: 600, h: 800, type: 'jpg' };
    const photoW = 105, photoH = Math.round((photoW * sz.h) / sz.w);
    const photoCell = new TableCell({
      width: { size: 2200, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
      children: [new Paragraph({ alignment: END, bidirectional: rtl, children: [new ImageRun({ type: sz.type, data: buf, transformation: { width: photoW, height: photoH } })] })],
    });
    const textCell = new TableCell({ width: { size: TEXT_W - 2200, type: WidthType.DXA }, borders: NO_BORDERS, children: headText });
    body.push(new Table({
      width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W - 2200, 2200], layout: TableLayoutType.FIXED,
      borders: NO_BORDERS, visuallyRightToLeft: rtl, rows: [new TableRow({ children: [textCell, photoCell] })],
    }));
  } else {
    body.push(...headText);
  }
  body.push(para(run(''), { border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 1 } }, after: 120 }));

  const heading = (title) => para(run(title, { size: Math.round(base * 1.2), bold: true, color: accent }), {
    before: 200, after: 100, keepNext: true,
    border: d.headingStyle === 'plain' ? undefined : { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 2 } },
  });

  const textParas = (t) => {
    if (!t) return [];
    return String(t).split(/\r?\n/).filter((l) => l.trim()).map((line) => {
      const b = line.match(/^\s*[-•*▪–]\s+(.*)$/);
      return b ? para(run(b[1], { color: '374151' }), { bullet: { level: 0 }, after: 20 }) : para(run(line, { color: '374151' }), { after: 30 });
    });
  };

  const dots = (lvl) => (lvl ? '  ' + '●'.repeat(lvl) + '○'.repeat(5 - lvl) : '');

  // ---- personal details ----
  if (m.details.length) {
    body.push(heading(m.detailsTitle));
    const rows = [];
    for (let i = 0; i < m.details.length; i += 2) {
      const cell = (x) => new TableCell({ borders: NO_BORDERS, width: { size: TEXT_W / 2, type: WidthType.DXA }, children: [x ? para([run(x.label + ': ', { color: '6B7280' }), run(x.value, { bold: true })], { after: 20 }) : para(run(''))] });
      rows.push(new TableRow({ children: [cell(m.details[i]), cell(m.details[i + 1])] }));
    }
    body.push(new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W / 2, TEXT_W / 2], borders: NO_BORDERS, visuallyRightToLeft: rtl, rows }));
  }

  // ---- sections ----
  for (const s of m.sections) {
    body.push(heading(s.title));
    if (s.inline || (s.compact && d.skillStyle === 'text' && s.type !== 'languages')) {
      body.push(para(run(s.items.map((it) => it.title).join('  ·  '))));
      continue;
    }
    if (s.compact) {
      for (const it of s.items) {
        body.push(para([run(it.title, { bold: true }), it.subtitle ? run(' — ' + it.subtitle, { color: '6B7280' }) : run(''), run(d.skillStyle === 'text' ? '' : dots(it.level), { color: accent })], { after: 30 }));
      }
      continue;
    }
    if (s.type === 'summary') {
      for (const it of s.items) body.push(...textParas(it.text));
      continue;
    }
    for (const it of s.items) {
      const left = [];
      if (it.title) left.push(para(run(it.title, { bold: true, color: '111827' }), { after: 10, keepNext: true }));
      const sub = [it.subtitle, it.location].filter(Boolean).join(' · ');
      if (sub) left.push(para(run(sub, { bold: true, color: '4B5563' }), { after: 10, keepNext: true }));
      if (!left.length) left.push(para(run('')));
      const DATE_W = 2600;
      body.push(new Table({
        width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W - DATE_W, DATE_W], layout: TableLayoutType.FIXED,
        borders: NO_BORDERS, visuallyRightToLeft: rtl,
        rows: [new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: NO_BORDERS, width: { size: TEXT_W - DATE_W, type: WidthType.DXA }, children: left }),
          new TableCell({ borders: NO_BORDERS, width: { size: DATE_W, type: WidthType.DXA }, children: [para(run(it.date || '', { color: '6B7280', size: base - 1 }), { align: END })] }),
        ] })],
      }));
      if (it.extra) body.push(para(run(it.extra, { color: '6B7280', size: base - 1 }), { after: 20 }));
      body.push(...textParas(it.text));
      body.push(para(run(''), { after: 60 }));
    }
  }

  // ---- image attachments, one per page ----
  for (const a of attachments) {
    if (!/^image\/(png|jpeg)$/.test(a.mime)) continue;
    try {
      const buf = fs.readFileSync(a.path);
      const sz = imageSize(buf);
      if (!sz) continue;
      const maxW = 640, maxH = 900;
      const k = Math.min(maxW / sz.w, maxH / sz.h, 1);
      body.push(new Paragraph({ children: [new PageBreak()] }));
      body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: sz.type, data: buf, transformation: { width: Math.round(sz.w * k), height: Math.round(sz.h * k) } })] }));
    } catch (e) {
      console.error('docx attachment', e);
    }
  }

  const doc = new Document({
    creator: 'CV Maker',
    title: m.name || 'CV',
    styles: { default: { document: { run: { font: { ascii: fontName, hAnsi: fontName, cs: fontName, eastAsia: fontName }, size: base } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: body,
    }],
  });
  return Packer.toBuffer(doc);
}

module.exports = { buildDocx };
