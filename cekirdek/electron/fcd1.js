/* FCD1 yama uygulayıcı (Electron/Node; bağımlılıksız) — ortak-cekirdek/delta/FORMAT.md'ye birebir uyar.
   FCD1: "FCD1" | codec(1: 0x01=zlib) | srcLen u64 LE | srcSha256 (32 ham) | dstLen u64 LE | dstSha256 | zlib(op akışı)   (başlık 85 bayt)
   op: 0x00 END · 0x01 COPY varint(off) varint(len) · 0x02 INSERT varint(len) + bayt; varint = LEB128, en çok 9 bayt.
   Eski DDSD1 (DesktopDuzenSabitleyici: codec baytı yok, Brotli) de okunur.
   Kaynak ve sonuç uzunluk + SHA-256 ile doğrulanır; her uyumsuzlukta hata fırlatır (updater tam dosyaya geçer). */
'use strict';
const crypto = require('crypto');
const zlib = require('zlib');

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function readVar(b, p) {
  let v = 0, mul = 1;
  for (let n = 0; n < 9; n++) {
    if (p.i >= b.length) fail('PATCH_TRUNCATED');
    const x = b[p.i++]; v += (x & 0x7f) * mul;
    if (x < 0x80) { if (v > Number.MAX_SAFE_INTEGER) fail('PATCH_BAD_VARINT'); return v; }
    mul *= 128;
  }
  fail('PATCH_BAD_VARINT');
}
function u64(buf, off) { const v = buf.readBigUInt64LE(off); if (v > BigInt(Number.MAX_SAFE_INTEGER)) fail('PATCH_BAD_HEADER'); return Number(v); }

function applyFcd1(oldBuf, patch) {
  patch = Buffer.from(patch);
  let off, ops;
  if (patch.length >= 85 && patch.slice(0, 4).toString('latin1') === 'FCD1') {
    if (patch[4] !== 0x01) fail('PATCH_BAD_CODEC');
    off = 5;
  } else if (patch.length >= 85 && patch.slice(0, 5).toString('latin1') === 'DDSD1') off = 5;
  else fail('PATCH_BAD_MAGIC');
  const srcLen = u64(patch, off), srcSha = patch.slice(off + 8, off + 40).toString('hex');
  const dstLen = u64(patch, off + 40), dstSha = patch.slice(off + 48, off + 80).toString('hex');
  if (oldBuf.length !== srcLen || sha(oldBuf) !== srcSha) fail('PATCH_SOURCE_MISMATCH');
  const body = patch.slice(off + 80);
  try {
    if (patch[3] === 0x31 && patch[0] === 0x46) {   // FCD1 → zlib; fazladan bayt olmamalı
      const r = zlib.inflateSync(body, { info: true });
      if (r.engine.bytesWritten !== body.length) fail('PATCH_TRAILING_DATA');
      ops = r.buffer;
    } else ops = zlib.brotliDecompressSync(body);
  } catch (e) { if (e.code && /^PATCH_/.test(e.code)) throw e; fail('PATCH_BAD_STREAM'); }
  const out = Buffer.allocUnsafe(dstLen); let w = 0; const p = { i: 0 };
  for (;;) {
    if (p.i >= ops.length) fail('PATCH_NO_END');
    const op = ops[p.i++];
    if (op === 0) break;
    if (op === 1) { const o = readVar(ops, p), n = readVar(ops, p); if (o + n > oldBuf.length) fail('PATCH_BAD_COPY'); if (w + n > dstLen) fail('PATCH_TOO_LONG'); oldBuf.copy(out, w, o, o + n); w += n; }
    else if (op === 2) { const n = readVar(ops, p); if (p.i + n > ops.length) fail('PATCH_TRUNCATED'); if (w + n > dstLen) fail('PATCH_TOO_LONG'); ops.copy(out, w, p.i, p.i + n); p.i += n; w += n; }
    else fail('PATCH_BAD_OP');
  }
  if (p.i !== ops.length) fail('PATCH_TRAILING_DATA');
  if (w !== dstLen || sha(out) !== dstSha) fail('PATCH_RESULT_MISMATCH');
  return out;
}

/** Testler için küçük üretici: (eski, yeni, [['copy',off,len] | ['data', bayt]]) → FCD1 */
function makeFcd1(oldBuf, newBuf, ops) {
  const parts = [];
  const vr = (v) => { const b = []; while (v >= 0x80) { b.push((v % 128) | 0x80); v = Math.floor(v / 128); } b.push(v); return Buffer.from(b); };
  for (const o of ops) { if (o[0] === 'copy') parts.push(Buffer.from([1]), vr(o[1]), vr(o[2])); else parts.push(Buffer.from([2]), vr(Buffer.from(o[1]).length), Buffer.from(o[1])); }
  parts.push(Buffer.from([0]));
  const h = Buffer.alloc(81); h[0] = 0x01;
  h.writeBigUInt64LE(BigInt(oldBuf.length), 1); Buffer.from(sha(oldBuf), 'hex').copy(h, 9);
  h.writeBigUInt64LE(BigInt(newBuf.length), 41); Buffer.from(sha(newBuf), 'hex').copy(h, 49);
  return Buffer.concat([Buffer.from('FCD1'), h, zlib.deflateSync(Buffer.concat(parts), { level: 9 })]);
}
module.exports = { applyFcd1, makeFcd1, sha };
