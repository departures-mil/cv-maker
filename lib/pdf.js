'use strict';
const { BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const A4 = [595.28, 841.89];

async function renderHtmlToPdf(html) {
  const tmp = path.join(os.tmpdir(), `cvmaker-print-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: false, javascript: false } });
  try {
    await w.loadFile(tmp);
    await w.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : true', true).catch(() => {});
    return await w.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
      preferCSSPageSize: true,
    });
  } finally {
    w.destroy();
    fs.unlink(tmp, () => {});
  }
}

async function appendImage(doc, file) {
  const bytes = fs.readFileSync(file.path);
  let img;
  if (file.mime === 'image/png') img = await doc.embedPng(bytes);
  else if (file.mime === 'image/jpeg') img = await doc.embedJpg(bytes);
  else {
    // webp etc: convert through a canvas-free route is not available; skip silently
    return;
  }
  const landscape = img.width > img.height;
  const [pw, ph] = landscape ? [A4[1], A4[0]] : A4;
  const margin = 28;
  const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height);
  const w = img.width * scale, h = img.height * scale;
  const page = doc.addPage([pw, ph]);
  page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
}

async function buildPdf(html, attachments) {
  const main = await renderHtmlToPdf(html);
  if (!attachments.length) return main;
  const doc = await PDFDocument.load(main);
  for (const file of attachments) {
    try {
      if (file.mime === 'application/pdf') {
        const src = await PDFDocument.load(fs.readFileSync(file.path), { ignoreEncryption: true });
        const pages = await doc.copyPages(src, src.getPageIndices());
        pages.forEach((p) => doc.addPage(p));
      } else {
        await appendImage(doc, file);
      }
    } catch (e) {
      console.error('attachment failed', file.fileName, e);
    }
  }
  return Buffer.from(await doc.save());
}

module.exports = { buildPdf };
