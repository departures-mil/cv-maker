/*!
 * Kullanım Limitleri istemcisi v1.0.0 — bütün programlar için ortak.
 *
 * Kullanıcının KENDİ Firebase hesabındaki günlük ücretsiz sınırı (okuma / yazma / silme) ve
 * yapay zeka kullanımını (istek / token) uygulama içinde sayar, Ayarlar'da kart olarak gösterir.
 *
 * Tarayıcı / Electron arayüzü:
 *   <script src="kullanim.js"><\/script>
 *   Kullanim.baslat({ uygulama: 'kitaplik', dil: () => 'tr', bulut: true, ai: false, proje: () => 'proje-id' });
 *   ayarlarKutusu.appendChild(Kullanim.kart());          // kart kendini günceller
 *   window.fetch otomatik izlenir (firestore.googleapis.com, generativelanguage, openai, anthropic).
 *   Elle sayım:   Kullanim.say('okuma', 3)   Kullanim.kotaDoldu('bulut')
 *   Başka süreçten (Electron ana süreç, Android kabuğu) gelen sayım:  Kullanim.ekle({ okuma: 2, yazma: 1 })
 *
 * Node (Electron ana süreç):
 *   const K = require('./kullanim.js'); K.depo(dosyaYolu);  const izliFetch = K.fetchSar(fetch, delta => win.webContents.send(...));
 *
 * Günlük sınır Pasifik saatiyle gece yarısı sıfırlanır (Firestore ve Gemini ücretsiz katmanı böyle çalışır).
 */
(function (g) {
  'use strict';
  var SURUM = '1.0.0';
  var ANAHTAR = 'kullanim_limit_v1';
  var LIMIT = { okuma: 50000, yazma: 20000, silme: 20000 };   // Firebase ücretsiz (Spark) planı, günlük
  var TZ = 'America/Los_Angeles';
  var REHBER = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';

  var YAZI = {
    tr: {
      baslik: 'Kullanım Limitleri', bulut: 'Bulut eşitleme (Firebase)', ai: 'Yapay zeka',
      okuma: 'Okuma', yazma: 'Yazma', silme: 'Silme', istek: 'İstek', token: 'Token',
      proje: 'Hesap / proje', yok: 'Bağlı bulut hesabı yok',
      sifir: 'Sınırların sıfırlanmasına', saat: 'sa', dk: 'dk', yerel: 'yerel saatle',
      doldu: 'Bugünkü ücretsiz sınır doldu. Eşitleme sıfırlanınca kendiliğinden devam eder.',
      aiDoldu: 'Yapay zeka hesabının sınırı doldu. Sıfırlanınca yeniden kullanılabilir.',
      not: 'Bu cihazın bugünkü kullanımıdır. Sınırlar Firebase ücretsiz planının günlük sınırlarıdır; aynı hesaba bağlı diğer cihazlar da aynı sınırı paylaşır.',
      aiNot: 'Kendi yapay zeka anahtarınla yapılan bugünkü kullanım. Ücretsiz katmanın günlük sınırı modele göre değişir.',
      konsol: 'Firebase\'de ayrıntılı gör', rehber: 'Kendi Firebase hesabınızı kurun (rehber)', dun: 'Dün', sifirla: 'Sayacı sıfırla',
      hic: 'Bu program sınırlı bir bulut ya da yapay zeka hizmeti kullanmıyor; kullanım sınırı yok. Güncellemeler GitHub\'dan ücretsiz gelir.'
    },
    en: {
      baslik: 'Usage limits', bulut: 'Cloud sync (Firebase)', ai: 'AI',
      okuma: 'Reads', yazma: 'Writes', silme: 'Deletes', istek: 'Requests', token: 'Tokens',
      proje: 'Account / project', yok: 'No cloud account connected',
      sifir: 'Limits reset in', saat: 'h', dk: 'min', yerel: 'local time',
      doldu: 'Today\'s free limit is used up. Sync resumes automatically after the reset.',
      aiDoldu: 'Your AI account limit is reached. It can be used again after the reset.',
      not: 'Usage by this device today. Limits are the daily limits of the Firebase free plan; other devices on the same account share them.',
      aiNot: 'Today\'s usage with your own AI key. The free tier\'s daily limit depends on the model.',
      konsol: 'View details in Firebase', rehber: 'Set up your own Firebase account (guide)', dun: 'Yesterday', sifirla: 'Reset counter',
      hic: 'This program uses no limited cloud or AI service, so there is no usage limit. Updates come free from GitHub.'
    },
    ar: {
      baslik: 'حدود الاستخدام', bulut: 'المزامنة السحابية (Firebase)', ai: 'الذكاء الاصطناعي',
      okuma: 'قراءة', yazma: 'كتابة', silme: 'حذف', istek: 'طلبات', token: 'رموز',
      proje: 'الحساب / المشروع', yok: 'لا يوجد حساب سحابي مرتبط',
      sifir: 'تُعاد الحدود بعد', saat: 'س', dk: 'د', yerel: 'بالتوقيت المحلي',
      doldu: 'انتهى الحد المجاني لهذا اليوم. ستستأنف المزامنة تلقائياً بعد إعادة التعيين.',
      aiDoldu: 'بلغ حساب الذكاء الاصطناعي حده. يمكن استخدامه مجدداً بعد إعادة التعيين.',
      not: 'استخدام هذا الجهاز اليوم. الحدود هي الحدود اليومية لخطة Firebase المجانية، وتتشاركها الأجهزة الأخرى على الحساب نفسه.',
      aiNot: 'استخدام اليوم بمفتاح الذكاء الاصطناعي الخاص بك. يختلف الحد اليومي للطبقة المجانية حسب النموذج.',
      konsol: 'عرض التفاصيل في Firebase', rehber: 'أنشئ حساب Firebase الخاص بك (دليل)', dun: 'أمس', sifirla: 'تصفير العداد',
      hic: 'لا يستخدم هذا البرنامج خدمة سحابية أو ذكاءً اصطناعياً محدوداً، لذا لا يوجد حد للاستخدام. تصل التحديثات مجاناً من GitHub.'
    }
  };

  var A = { uygulama: '', dil: null, bulut: true, ai: false, proje: null, aiAd: '', haric: [] };
  var dinleyiciler = [];
  var depoDosya = null;   // Node'da dosya yolu

  // ---------- gün hesabı (Pasifik saati) ----------
  function pasifikParca(d) {
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d || new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return o;
    } catch (e) {
      var u = new Date((d || new Date()).getTime() - 8 * 3600000);
      return { year: u.getUTCFullYear(), month: ('0' + (u.getUTCMonth() + 1)).slice(-2), day: ('0' + u.getUTCDate()).slice(-2), hour: u.getUTCHours(), minute: u.getUTCMinutes(), second: u.getUTCSeconds() };
    }
  }
  function bugun() { var p = pasifikParca(); return p.year + '-' + p.month + '-' + p.day; }
  function sifirlanmayaMs() {
    var p = pasifikParca();
    var gecen = ((+p.hour % 24) * 3600 + (+p.minute) * 60 + (+p.second)) * 1000;
    return Math.max(0, 86400000 - gecen);
  }

  // ---------- depo ----------
  function bos(gun) { return { gun: gun, okuma: 0, yazma: 0, silme: 0, aiIstek: 0, aiToken: 0, bulutDoldu: 0, aiDoldu: 0 }; }
  function hamOku() {
    try {
      if (depoDosya) { var fs = require('fs'); return JSON.parse(fs.readFileSync(depoDosya, 'utf8')); }
      return JSON.parse(g.localStorage.getItem(ANAHTAR) || 'null');
    } catch (e) { return null; }
  }
  function hamYaz(v) {
    try {
      if (depoDosya) { require('fs').writeFileSync(depoDosya, JSON.stringify(v)); return; }
      g.localStorage.setItem(ANAHTAR, JSON.stringify(v));
    } catch (e) {}
  }
  function veri() {
    var v = hamOku() || {};
    var gun = bugun();
    if (!v.bugun || v.bugun.gun !== gun) {
      if (v.bugun && v.bugun.gun) v.dun = v.bugun;
      v.bugun = bos(gun);
      hamYaz(v);
    }
    return v;
  }

  function ekle(delta) {
    if (!delta) return;
    var v = veri(), b = v.bugun, degisti = false;
    ['okuma', 'yazma', 'silme', 'aiIstek', 'aiToken'].forEach(function (k) {
      var n = +delta[k] || 0; if (n > 0) { b[k] += n; degisti = true; }
    });
    if (delta.bulutDoldu) { b.bulutDoldu = Date.now(); degisti = true; }
    if (delta.aiDoldu) { b.aiDoldu = Date.now(); degisti = true; }
    if (delta.proje && v.proje !== delta.proje) { v.proje = delta.proje; degisti = true; }
    if (degisti) { hamYaz(v); dinleyiciler.forEach(function (f) { try { f(delta); } catch (e) {} }); }
  }

  // ---------- istek çözümleme ----------
  function jsonMu(s) { if (!s) return null; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch (e) { return null; } }
  function tur(url) {
    url = String(url || '');
    if (/firestore\.googleapis\.com/.test(url)) return 'firestore';
    if (/generativelanguage\.googleapis\.com|firebasevertexai\.googleapis\.com|aiplatform\.googleapis\.com|api\.openai\.com|api\.anthropic\.com|api\.groq\.com|openrouter\.ai/.test(url)) return 'ai';
    return '';
  }
  function kotaHatasi(status, govde) {
    return status === 429 || /RESOURCE_EXHAUSTED|quota exceeded|Quota exceeded|insufficient_quota|rate_limit/i.test(String(govde || ''));
  }

  // Firestore REST isteğinin kaç okuma/yazma/silme sayıldığını bulur.
  function firestoreDelta(method, url, govde, status, yanit) {
    method = String(method || 'GET').toUpperCase();
    var d = {};
    var yol = String(url).split('?')[0];
    if (kotaHatasi(status, typeof yanit === 'string' ? yanit : JSON.stringify(yanit || ''))) { d.bulutDoldu = 1; return d; }
    if (/:(listen|write)\b|\/Listen\/|\/Write\//.test(yol)) return d;   // akış kanalı: SDK sayar
    var b = jsonMu(govde), y = jsonMu(yanit);
    if (/:commit$|:batchWrite$/.test(yol)) {
      ((b && b.writes) || []).forEach(function (w) { if (w && w['delete']) d.silme = (d.silme || 0) + 1; else d.yazma = (d.yazma || 0) + 1; });
      return d;
    }
    if (/:runQuery$|:runAggregationQuery$/.test(yol)) {
      var n = 0; if (Array.isArray(y)) y.forEach(function (x) { if (x && x.document) n++; });
      d.okuma = Math.max(1, n); return d;
    }
    if (/:batchGet$/.test(yol)) {
      var m = Array.isArray(y) ? y.filter(function (x) { return x && (x.found || x.missing); }).length : 0;
      d.okuma = Math.max(1, m || (((b && b.documents) || []).length)); return d;
    }
    if (/:beginTransaction$|:rollback$/.test(yol)) return d;
    var parca = yol.split('/documents')[1] || '';
    var segment = parca.split('/').filter(Boolean).length;
    if (method === 'GET') {
      if (segment % 2 === 1) d.okuma = Math.max(1, ((y && y.documents) || []).length);   // koleksiyon listesi
      else d.okuma = 1;
    } else if (method === 'DELETE') d.silme = 1;
    else if (method === 'PATCH' || method === 'POST' || method === 'PUT') d.yazma = 1;
    return d;
  }
  function aiDelta(status, yanit) {
    var d = { aiIstek: 1 };
    var s = typeof yanit === 'string' ? yanit : '';
    if (kotaHatasi(status, s || JSON.stringify(yanit || ''))) { d.aiDoldu = 1; return d; }
    var y = jsonMu(yanit), t = 0;
    if (Array.isArray(y)) y = y[y.length - 1];
    if (y) {
      if (y.usageMetadata) t = +y.usageMetadata.totalTokenCount || 0;
      else if (y.usage) t = (+y.usage.total_tokens || 0) || ((+y.usage.input_tokens || 0) + (+y.usage.output_tokens || 0));
    }
    if (t) d.aiToken = t;
    return d;
  }
  function cozumle(method, url, govde, status, yanit) {
    var t = tur(url);
    if (t === 'firestore') {
      var d = firestoreDelta(method, url, govde, status, yanit), m = String(url).match(/\/projects\/([^/]+)\//);
      if (m && status < 400) d.proje = decodeURIComponent(m[1]);
      return d;
    }
    if (t === 'ai') return aiDelta(status, yanit);
    return null;
  }

  // fetch'i saran yardımcı: sayımları hesaplar, ekler, isteğe bağlı geri bildirir.
  function fetchSar(asil, geri) {
    if (!asil || asil.__kullanim) return asil;
    var sarili = function (girdi, ayar) {
      var url = typeof girdi === 'string' ? girdi : (girdi && girdi.url) || String(girdi);
      var t = tur(url);
      var p = asil.apply(this, arguments);
      if (!t) return p;
      var method = (ayar && ayar.method) || (girdi && girdi.method) || 'GET';
      var govde = ayar && ayar.body;
      return p.then(function (r) {
        try {
          var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
          var yanitGerekli = !/event-stream/.test(ct);
          var kopya = yanitGerekli && r.clone ? r.clone() : null;
          (kopya ? kopya.text() : Promise.resolve('')).then(function (txt) {
            var y = jsonMu(txt) || txt;
            var pm = String(url).match(/\/projects\/([^/]+)\//);
            if (t === 'firestore' && pm && (A.haric || []).indexOf(decodeURIComponent(pm[1])) >= 0 && kendiProje() !== decodeURIComponent(pm[1])) return;   // yöneticinin projesi (ör. iletişim) sayılmaz
            var d = cozumle(method, url, typeof govde === 'string' ? govde : null, r.status, y);
            if (d) { ekle(d); if (geri) try { geri(d); } catch (e) {} }
          }).catch(function () {});
        } catch (e) {}
        return r;
      });
    };
    sarili.__kullanim = true;
    return sarili;
  }

  // ---------- arayüz ----------
  function dil() {
    var d = '';
    try { d = typeof A.dil === 'function' ? A.dil() : A.dil; } catch (e) {}
    d = String(d || (g.document && g.document.documentElement.lang) || 'tr').slice(0, 2).toLowerCase();
    return YAZI[d] ? d : 'tr';
  }
  function T(k) { return YAZI[dil()][k]; }
  function kendiProje() { try { return (typeof A.proje === 'function' ? A.proje() : A.proje) || ''; } catch (e) { return ''; } }
  function proje() { var p = ''; try { p = typeof A.proje === 'function' ? A.proje() : A.proje; } catch (e) {} return p || veri().proje || ''; }
  function sayi(n) { try { return Number(n).toLocaleString(dil() === 'ar' ? 'ar' : dil()); } catch (e) { return String(n); } }
  function kac(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sure(ms) { var dk = Math.ceil(ms / 60000), s = Math.floor(dk / 60); return (s ? s + ' ' + T('saat') + ' ' : '') + (dk % 60) + ' ' + T('dk'); }
  function sifirSaati() { try { return new Date(Date.now() + sifirlanmayaMs()).toLocaleTimeString(dil() === 'ar' ? 'ar' : dil(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function stil() {
    if (g.document.getElementById('kul-stil')) return;
    var s = g.document.createElement('style'); s.id = 'kul-stil';
    s.textContent =
      '.kul-kart{border:1px solid rgba(127,127,127,.28);border-radius:12px;padding:16px 18px;margin:12px 0;font-size:14px;line-height:1.45}' +
      '.kul-kart h4{margin:0 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.85}' +
      '.kul-bas{font-weight:600;margin:12px 0 6px}.kul-bas:first-of-type{margin-top:0}' +
      '.kul-sat{display:flex;justify-content:space-between;gap:10px;margin:6px 0 3px;font-size:13.5px}' +
      '.kul-sat span:last-child{font-variant-numeric:tabular-nums;font-weight:600}' +
      '.kul-cubuk{height:8px;border-radius:5px;background:rgba(127,127,127,.22);overflow:hidden}' +
      '.kul-cubuk i{display:block;height:100%;border-radius:5px;background:#22a06b;transition:width .4s}' +
      '.kul-cubuk i.sari{background:#e2a400}.kul-cubuk i.kir{background:#e5484d}' +
      '.kul-not{font-size:12.5px;opacity:.72;margin-top:8px}' +
      '.kul-uyari{border:1px solid rgba(229,72,77,.5);background:rgba(229,72,77,.12);color:#e5484d;border-radius:8px;padding:8px 10px;margin:8px 0;font-weight:600;font-size:13px}' +
      '.kul-sifir{font-size:13px;margin-top:8px;opacity:.9}' +
      '.kul-alt{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
      '.kul-alt button{font:inherit;font-size:13px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:8px;padding:6px 12px;cursor:pointer}';
    g.document.head.appendChild(s);
  }
  function cubuk(ad, n, lim) {
    var y = Math.min(100, n / lim * 100), sinif = y >= 100 ? 'kir' : y >= 80 ? 'sari' : '';
    return '<div class="kul-sat"><span>' + kac(T(ad)) + '</span><span>' + sayi(n) + ' / ' + sayi(lim) + ' (%' + sayi(Math.floor(y)) + ')</span></div>' +
      '<div class="kul-cubuk"><i class="' + sinif + '" style="width:' + y.toFixed(1) + '%"></i></div>';
  }
  function ciz(el) {
    var v = veri(), b = v.bugun, ic = '<h4>' + kac(T('baslik')) + '</h4>';
    el.setAttribute('dir', dil() === 'ar' ? 'rtl' : 'ltr');
    if (A.bulut) {
      var p = proje();
      ic += '<div class="kul-bas">☁ ' + kac(T('bulut')) + '</div>';
      ic += '<div class="kul-sat"><span>' + kac(T('proje')) + '</span><span>' + kac(p || T('yok')) + '</span></div>';
      if (b.bulutDoldu) ic += '<div class="kul-uyari">' + kac(T('doldu')) + '</div>';
      ic += cubuk('okuma', b.okuma, LIMIT.okuma) + cubuk('yazma', b.yazma, LIMIT.yazma) + cubuk('silme', b.silme, LIMIT.silme);
      if (v.dun) ic += '<div class="kul-not">' + kac(T('dun')) + ': ' + kac(T('okuma')) + ' ' + sayi(v.dun.okuma) + ' · ' + kac(T('yazma')) + ' ' + sayi(v.dun.yazma) + ' · ' + kac(T('silme')) + ' ' + sayi(v.dun.silme) + '</div>';
      ic += '<div class="kul-not">' + kac(T('not')) + '</div>';
    }
    if (A.ai) {
      ic += '<div class="kul-bas">✦ ' + kac(T('ai')) + (A.aiAd ? ' (' + kac(typeof A.aiAd === 'function' ? A.aiAd() : A.aiAd) + ')' : '') + '</div>';
      if (b.aiDoldu) ic += '<div class="kul-uyari">' + kac(T('aiDoldu')) + '</div>';
      ic += '<div class="kul-sat"><span>' + kac(T('istek')) + '</span><span>' + sayi(b.aiIstek) + '</span></div>';
      ic += '<div class="kul-sat"><span>' + kac(T('token')) + '</span><span>' + sayi(b.aiToken) + '</span></div>';
      ic += '<div class="kul-not">' + kac(T('aiNot')) + '</div>';
    }
    if (!A.bulut && !A.ai) { el.innerHTML = ic + '<div class="kul-not" style="opacity:.9">✓ ' + kac(T('hic')) + '</div>'; return; }
    ic += '<div class="kul-sifir">⏱ ' + kac(T('sifir')) + ': <b>' + kac(sure(sifirlanmayaMs())) + '</b> (' + kac(sifirSaati()) + ' ' + kac(T('yerel')) + ')</div>';
    var p2 = A.bulut && proje();
    ic += '<div class="kul-alt">' + (p2 ? '<button type="button" data-k="konsol">' + kac(T('konsol')) + '</button>' : '') +
      (A.bulut ? '<button type="button" data-k="rehber">' + kac(T('rehber')) + '</button>' : '') + '</div>';
    el.innerHTML = ic;
    var ac = function (u) {
      try { if (A.linkAc) return A.linkAc(u); } catch (e) {}
      try { if (g.duyuruLinkAc) return g.duyuruLinkAc(u); } catch (e) {}
      g.open(u, '_blank');
    };
    var k = el.querySelector('[data-k="konsol"]');
    if (k) k.onclick = function () { ac('https://console.firebase.google.com/project/' + encodeURIComponent(p2) + '/firestore/usage'); };
    var r = el.querySelector('[data-k="rehber"]');
    if (r) r.onclick = function () { ac(REHBER); };
  }
  function kart() {
    stil();
    var el = g.document.createElement('div'); el.className = 'kul-kart';
    ciz(el);
    var f = function () { if (el.isConnected === false && el.__baglandi) return; ciz(el); };
    dinleyiciler.push(f);
    setTimeout(function () { el.__baglandi = true; }, 0);
    try { new MutationObserver(function () { ciz(el); }).observe(g.document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] }); } catch (e) {}
    var t = setInterval(function () { if (el.isConnected === false && el.__baglandi) { clearInterval(t); dinleyiciler = dinleyiciler.filter(function (x) { return x !== f; }); return; } ciz(el); }, 30000);
    return el;
  }

  var K = {
    surum: SURUM, LIMIT: LIMIT, REHBER: REHBER,
    baslat: function (ayar) {
      for (var k in ayar) A[k] = ayar[k];
      if (g.fetch && !g.fetch.__kullanim) g.fetch = fetchSar(g.fetch.bind(g));
      return K;
    },
    say: function (ad, n) { var d = {}; d[ad] = n == null ? 1 : n; ekle(d); },
    kotaDoldu: function (hangi) { ekle(hangi === 'ai' ? { aiDoldu: 1 } : { bulutDoldu: 1 }); },
    ekle: ekle, cozumle: cozumle, fetchSar: fetchSar,
    // Ana süreçte tutulan sayaç durumunu arayüze aktarır (Electron: main -> executeJavaScript).
    ice: function (v) { if (v && v.bugun) { hamYaz(v); dinleyiciler.forEach(function (f) { try { f({}); } catch (e) {} }); } },
    ozet: function () { return veri(); },
    sifirlanmayaMs: sifirlanmayaMs, bugun: bugun,
    dinle: function (f) { dinleyiciler.push(f); },
    kart: kart,
    depo: function (dosya) { depoDosya = dosya; return K; },
    // Derlenmiş arayüzlerde: bul() bir öğe döndürdüğünde kartı onun hemen ardına koyar, sayfa değişse de korur.
    yerlestir: function (bul, once) {
      var calis = function () {
        var hedef = null; try { hedef = bul(); } catch (e) {}
        if (!hedef || !hedef.parentNode) return;
        var k = once ? hedef.previousElementSibling : hedef.nextElementSibling;
        if (k && k.classList && k.classList.contains('kul-kart')) return;
        var yeni = kart(); if (A.sinif) yeni.className += ' ' + A.sinif;
        hedef.parentNode.insertBefore(yeni, once ? hedef : hedef.nextSibling);
      };
      var bas = function () { calis(); new MutationObserver(function () { calis(); }).observe(g.document.body, { childList: true, subtree: true }); };
      if (g.document.readyState === 'loading') g.document.addEventListener('DOMContentLoaded', bas); else bas();
    },
    // Metni içeren en dar kutuyu bulur (ör. 'TELEFON VE BİLGİSAYAR EŞİTLEME' başlıklı kart).
    metindenBul: function (metinler, kapsayici) {
      var ag = g.document.createTreeWalker(g.document.body, 4), d;
      while ((d = ag.nextNode())) {
        var t = (d.nodeValue || '').trim().toLocaleUpperCase('tr');
        for (var i = 0; i < metinler.length; i++) if (t && t === String(metinler[i]).toLocaleUpperCase('tr')) {
          var e = d.parentElement; return kapsayici ? e.closest(kapsayici) : e;
        }
      }
      return null;
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = K;
  if (g && typeof g === 'object') g.Kullanim = K;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
