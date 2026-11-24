/* CV Maker — ortak çekirdek kabuğu (src/cekirdek/fc-core.js).
   Burada: "klasik" renk şeması (2.0.x'in eski renkleri), sağ üst sıra (🔔 · ✦ · Eşitle · Güncelle · Tema · Dil | Küçült · Orta ·
   Tam ekran · Kapat), dil ve tema bağı (uygulama ↔ çekirdek), ayarlar düzeni (Admin ile iletişim EN SON), Kullanım Limitleri
   ("hizmet yok" kipi), ilk açılış rehberi (yalnız dil + görünüm), "neler yeni", duyurular, çökme raporu ve güncelleme öncesi yedek.
   app.js'ten ÖNCE yüklenir; app.js Kabuk.start(...) ile çağırır.
   CV Maker tek kullanıcılık bir masaüstü aracıdır: bulut ya da Wi-Fi eşitlemesi YOKTUR (Eşitle düğmesi "kapalı" durumdadır ve
   verileri taşıma/yedekleme yollarını gösterir). */
(function () {
  'use strict';
  var APP = 'cv-maker', REPO = 'cv-maker';
  var OB = { firebase: false, ai: false };   // Firebase ve yapay zekâ kullanılmaz → sihirbaz yalnız dil + görünüm
  var ui = FC.ui;
  Object.assign(ui.icons, {
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8"/>'
  });

  /* ---------- metinler (I18N: src/i18n.js) ---------- */
  var TXT = {
    tr: {
      exportSettings: 'Dışa aktarma', dataCard: 'Veriler ve yedekler', shortcutsCard: 'Klavye kısayolları',
      syncTitle: 'Veri eşitleme', syncOff: 'CV Maker tek kullanıcılık bir masaüstü programıdır; bulut ya da Wi-Fi eşitlemesi kullanmaz. CV\'leriniz yalnız bu bilgisayarda saklanır ve her gün otomatik yedeklenir. Başka bir bilgisayara taşımak ya da yedeklemek için:',
      openBackupFolder: 'Yedek klasörünü aç', dataFolderHint: 'CV\'ler, ekler ve ayarlar bu klasörde tutulur; güncellemeler ve yeniden kurulum dokunmaz.'
    },
    en: {
      exportSettings: 'Export', dataCard: 'Data and backups', shortcutsCard: 'Keyboard shortcuts',
      syncTitle: 'Data sync', syncOff: 'CV Maker is a single-user desktop program; it does not use cloud or Wi-Fi sync. Your CVs are kept only on this computer and are backed up automatically every day. To move them to another computer or back them up:',
      openBackupFolder: 'Open backup folder', dataFolderHint: 'CVs, attachments and settings are kept in this folder; updates and reinstalling never touch it.'
    },
    ar: {
      exportSettings: 'التصدير', dataCard: 'البيانات والنسخ الاحتياطية', shortcutsCard: 'اختصارات لوحة المفاتيح',
      syncTitle: 'مزامنة البيانات', syncOff: 'CV Maker برنامج مكتبي لمستخدم واحد؛ لا يستخدم المزامنة السحابية أو عبر Wi-Fi. تُحفظ سيرك الذاتية على هذا الحاسوب فقط ويُنسخ احتياطياً تلقائياً كل يوم. لنقلها إلى حاسوب آخر أو نسخها احتياطياً:',
      openBackupFolder: 'فتح مجلد النسخ الاحتياطية', dataFolderHint: 'تُحفظ السير الذاتية والمرفقات والإعدادات في هذا المجلد؛ لا تمسّها التحديثات ولا إعادة التثبيت.'
    }
  };
  // I18N src/i18n.js'te üst düzey const'tur (window.I18N değildir)
  if (typeof I18N !== 'undefined') Object.keys(TXT).forEach(function (l) { Object.keys(TXT[l]).forEach(function (k) { if (I18N[l] && !(k in I18N[l])) I18N[l][k] = TXT[l][k]; }); });

  /* ---------- "klasik" şema: 2.0.x'in styles.css renkleri (açık = eski :root, koyu = eski [data-theme=dark]) ----------
     Açık modda eski koyu lacivert üst çubuk styles.css'te (html[data-scheme=klasik].theme-light header.topbar) çizilir. */
  FC.look.registerScheme('klasik', {
    label: { tr: 'Klasik (eski görünüm)', en: 'Classic (previous look)', ar: 'الكلاسيكي (المظهر السابق)' },
    light: {
      '--bg': '#eef1f6', '--bg-grid': '#0000', '--panel': '#ffffff', '--panel-solid': '#ffffff', '--panel-hover': '#f7f8fb', '--cv-panel-2': '#f7f8fb',
      '--border': '#dfe3ea', '--border-strong': '#b9c2d0', '--border-w': '1px', '--text': '#1c2330', '--muted': '#6b7484', '--label': '#374151',
      '--nav-text': '#1c2330', '--nav-title': '#6b7484', '--accent': '#2563eb', '--accent-2': '#1d4ed8', '--on-accent': '#ffffff',
      '--primary-1': '#2563eb', '--primary-2': '#1d4ed8', '--active-1': '#2563eb29', '--active-2': '#2563eb14', '--active-line': '#2563eb',
      '--accent-soft': '#2563eb17', '--accent-line': '#2563eb59', '--focus': '#2563eb', '--focus-w': '2px', '--focus-ring': '#2563eb33',
      '--danger': '#dc2626', '--warn': '#b45309', '--ok': '#16a34a', '--ok-text': '#15803d', '--danger-text': '#b91c1c', '--warn-text': '#92400e',
      '--ok-soft': '#dcfce7', '--ok-line': '#86efac', '--danger-soft': '#fee2e2', '--danger-line': '#fecaca', '--warn-soft': '#fef3c7', '--warn-line': '#fcd34d',
      '--sidebar-bg': '#0f172a', '--topbar-bg': '#0f172a', '--modal-bg': '#ffffff', '--modal-border': '#dfe3ea', '--backdrop': '#0f172a80',
      '--toast-bg': '#1e293b', '--toast-text': '#ffffff', '--toast-line': '#1e293b', '--toast-err-bg': '#b91c1c', '--toast-err-text': '#ffffff', '--toast-err-line': '#b91c1c',
      '--badge-text': '#6b7484', '--badge-bg': '#eef1f6', '--badge-line': '#dfe3ea', '--on-badge': '#ffffff',
      '--bar-track': '#dfe3ea', '--scroll-thumb': '#9ca3af80', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 12px 40px #00000033', '--shadow-modal': '0 30px 80px #00000059', '--shadow-toast': '0 8px 24px #00000040'
    },
    dark: {
      '--bg': '#0b1220', '--bg-grid': '#0000', '--panel': '#131c2e', '--panel-solid': '#131c2e', '--panel-hover': '#1a2438', '--cv-panel-2': '#0f1828',
      '--border': '#243049', '--border-strong': '#3b4a6b', '--border-w': '1px', '--text': '#e5e9f0', '--muted': '#8b95a8', '--label': '#cbd5e1',
      '--nav-text': '#e5e9f0', '--nav-title': '#8b95a8', '--accent': '#3b82f6', '--accent-2': '#2563eb', '--on-accent': '#ffffff',
      '--primary-1': '#3b82f6', '--primary-2': '#2563eb', '--active-1': '#3b82f640', '--active-2': '#3b82f61f', '--active-line': '#3b82f6',
      '--accent-soft': '#3b82f626', '--accent-line': '#3b82f673', '--focus': '#60a5fa', '--focus-w': '2px', '--focus-ring': '#3b82f64d',
      '--danger': '#f87171', '--warn': '#fbbf24', '--ok': '#4ade80', '--ok-text': '#4ade80', '--danger-text': '#fca5a5', '--warn-text': '#fcd34d',
      '--ok-soft': '#14341f', '--ok-line': '#166534', '--danger-soft': '#3d1414', '--danger-line': '#7f1d1d', '--warn-soft': '#3a2c0c', '--warn-line': '#92400e',
      '--sidebar-bg': '#060b16', '--topbar-bg': '#060b16', '--modal-bg': '#131c2e', '--modal-border': '#243049', '--backdrop': '#000000a6',
      '--toast-bg': '#1e293b', '--toast-text': '#ffffff', '--toast-line': '#334155', '--toast-err-bg': '#7f1d1d', '--toast-err-text': '#ffffff', '--toast-err-line': '#b91c1c',
      '--badge-text': '#cbd5e1', '--badge-bg': '#1a2438', '--badge-line': '#243049', '--on-badge': '#ffffff',
      '--bar-track': '#243049', '--scroll-thumb': '#4b556380', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 12px 40px #00000080', '--shadow-modal': '0 30px 80px #000000a6', '--shadow-toast': '0 8px 24px #00000080'
    }
  });

  /* ---------- hata kaydı (Electron açılış testi okur; çökme raporu çekirdekte) ---------- */
  window.__cvmErrors = [];
  window.addEventListener('error', function (e) { if (e && e.message) window.__cvmErrors.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { window.__cvmErrors.push(String((e && e.reason && e.reason.message) || (e && e.reason) || 'rejection')); });

  var cfg = null, tb = null;
  function T(k, v) { return typeof t === 'function' ? t(k, v) : k; }

  /** app.js boot() çağırır. o = {info, version, stored: {settings}, lang(l), theme, flush(), syncMenuButtons()} */
  function start(o) {
    cfg = o;
    var hadData = !!(o.stored && o.stored.settings && Object.keys(o.stored.settings).length);
    // 2.0.x'ten gelen kullanıcı: görülen duyurular, tema modu, "neler yeni"; ilk açılış rehberi gösterilmez
    try {
      var seen = JSON.parse(localStorage.getItem('admin_duyuru_gorulen') || 'null');
      if (Array.isArray(seen) && FC.storage.get('ann.seen', null) == null) FC.storage.set('ann.seen', seen);
    } catch (e) { }
    if (hadData && FC.storage.get('whatsnew.seen', null) == null) {
      FC.storage.set('whatsnew.seen', '2.0.5');
      FC.storage.set('onboarding.done', true);
      var oldTheme = o.stored.settings.theme;
      if ((oldTheme === 'light' || oldTheme === 'dark') && FC.storage.get('theme', null) == null) FC.storage.set('theme', oldTheme);
    }
    // dil: çekirdekte seçim yoksa uygulamanınki (settings.json) geçerli; sonra iki yönlü
    if (FC.storage.get('lang', null) == null && o.uiLang) FC.i18n.set(o.uiLang);
    FC.init({ app: APP, repo: REPO, version: o.version, setupChannel: 'win-setup', announcements: true, whatsnew: false, onboarding: false });
    FC.i18n.onChange(function (l) { if (o.lang) o.lang(l); });

    // güncelleme: indirme başlarken tam yedek, kurulumdan hemen önce CV'ler diske yazılır (program kendiliğinden yeniden açılır)
    var backedUp = false;
    FC.updater.subscribe(function (s) {
      if ((s.status === 'downloading' || s.status === 'installing') && !backedUp) {
        backedUp = true;
        try { o.flush(); } catch (e) { }
        try { window.api.backupBeforeUpdate(s.plan && s.plan.version).catch(function () { }); } catch (e) { }
      }
      if (s.status === 'installing') { try { o.flush(); } catch (e) { } }
    });

    var vb = document.getElementById('ver-badge'); if (vb) vb.textContent = 'v' + o.version;
    topbar();
    var wn = FC.whatsnew.start({ version: o.version, notes: function (v) { return v === o.version ? o.info.notes : null; } });
    if (!wn) setTimeout(function () { FC.onboarding.maybeStart(OB); }, 700);
  }
  function lang() { return FC.i18n.lang(); }

  /* ---------- üst çubuk ---------- */
  function topbar() {
    if (tb) return tb;
    tb = FC.topbar.mount(document.getElementById('topbar'), { before: [FC.announcements.button()], sync: { state: 'off', onClick: syncMenu }, lan: false });
    tb.setSync('off');
    return tb;
  }
  function syncMenu() {
    var body = ui.el('div');
    body.appendChild(ui.el('p.muted', { text: T('syncOff') }));
    var m, row = ui.el('div.fc-row');
    (cfg.syncButtons ? cfg.syncButtons() : []).forEach(function (b) {
      row.appendChild(ui.el('button.btn', { type: 'button', html: ui.icon(b.icon || 'box') + ui.esc(b.label), onclick: function () { m.close(); b.action(); } }));
    });
    body.appendChild(row);
    m = ui.modal({ title: T('syncTitle'), icon: 'cloudOff', cls: 'small', body: body, buttons: [{ label: T('close'), cls: 'primary' }] });
  }

  /* ---------- ayarlar: uygulama kartları + çekirdek kartları; Admin ile iletişim en sonda ---------- */
  function openSettings(appCards) {
    var body = ui.el('div');
    var m = ui.modal({ title: T('settings'), icon: 'settings', cls: 'wide cv-settings', body: body, buttons: [] });
    FC.settings.build(body, { cards: appCards, usage: { firebase: false, ai: false }, about: { version: cfg.version }, onboarding: OB });
    return m;
  }

  window.Kabuk = { start: start, openSettings: openSettings, topbar: topbar, syncMenu: syncMenu, lang: lang, OB: OB };
})();
