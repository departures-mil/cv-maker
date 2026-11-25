/* Ortak çekirdek (web) — tek dosya. Kaynak: js/*.js. Üreten: tools/bundle.js */
/* ---- storage.js ---- */
/* FC.storage — güvenli localStorage sarmalayıcı. localStorage yoksa ya da hata verirse (gizli kip, kota dolu,
   WebView ayarı) bellekte tutar; program asla bu yüzden çökmez. Değerler JSON olarak saklanır, anahtarlar "fc." önekli. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var mem = {};
  var PFX = 'fc.';
  function ls() { try { var s = g.localStorage; if (!s) return null; var k = '__fc_t'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var store = ls();
  function raw(k) {
    if (store) { try { var v = store.getItem(PFX + k); if (v !== null) return v; } catch (e) {} }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  }
  var api = {
    get: function (k, def) {
      var v = raw(k); if (v === null || v === undefined) return def;
      try { return JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      var s; try { s = JSON.stringify(v); } catch (e) { return false; }
      mem[k] = s;
      if (store) { try { store.setItem(PFX + k, s); return true; } catch (e) { return false; } }
      return false;
    },
    remove: function (k) { delete mem[k]; if (store) { try { store.removeItem(PFX + k); } catch (e) {} } },
    /** Bellek kipinde mi? (kalıcı saklama yok) */
    volatile: function () { return !store; },
    /** Testler için: belleği ve depoyu değiştir. */
    _use: function (s) { store = s; mem = {}; }
  };
  FC.storage = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- i18n.js ---- */
/* FC.i18n — tr / en / ar sözlük birleştirme, dil seçimi ve dil düğmesi.
   FC.i18n.add({tr:{...}, en:{...}, ar:{...}})  ·  FC.i18n.t('anahtar', {n: 3})  ·  FC.i18n.set('ar')
   Seçim kalıcıdır; <html lang/dir> ayarlanır (ar → rtl). Eksik anahtarda en → tr → anahtarın kendisi döner. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var LANGS = ['tr', 'en', 'ar'];
  var NAMES = { tr: 'Türkçe', en: 'English', ar: 'العربية' };
  var SHORT = { tr: 'TR', en: 'EN', ar: 'ع' };
  var D = { tr: {}, en: {}, ar: {} };
  var cur = null, subs = [];

  function st() { return FC.storage; }
  function norm(l) { l = String(l || '').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : null; }
  function detect() {
    var s = st() && st().get('lang');
    if (norm(s)) return norm(s);
    var nav = g.navigator && (g.navigator.language || (g.navigator.languages || [])[0]);
    return norm(nav) || 'tr';
  }
  function add(dict) {
    if (!dict) return api;
    LANGS.forEach(function (l) { var src = dict[l]; if (src) for (var k in src) D[l][k] = src[k]; });
    return api;
  }
  function t(key, vars, lang) {
    var l = norm(lang) || lang_();
    var s = D[l][key];
    if (s === undefined) s = D.en[key];
    if (s === undefined) s = D.tr[key];
    if (s === undefined) return key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    return s;
  }
  function lang_() { if (!cur) cur = detect(); return cur; }
  function apply() {
    if (api.noDoc) return;   // bağımsız eklenti: uygulamanın <html lang/dir> ayarına dokunma
    var d = g.document && g.document.documentElement; if (!d) return;
    d.setAttribute('lang', lang_());
    d.setAttribute('dir', lang_() === 'ar' ? 'rtl' : 'ltr');
  }
  function set(l) {
    l = norm(l); if (!l) return;
    var changed = l !== cur;
    cur = l;
    if (st()) st().set('lang', l);
    apply();
    if (changed) subs.slice().forEach(function (f) { try { f(l); } catch (e) { if (g.console) console.error(e); } });
  }
  /** Sayı biçimi. Arapçada teknik sayılar Batı rakamlarıyla (latn) yazılır: MB, yüzde, kota okunaklı kalsın. */
  function locale(l) { l = norm(l) || lang_(); return l === 'ar' ? 'ar-u-nu-latn' : l === 'en' ? 'en-US' : 'tr-TR'; }
  function num(n, digits, l) {
    digits = digits || 0;
    try { return Number(n).toLocaleString(locale(l), { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
    catch (e) { return Number(n).toFixed(digits); }
  }
  /** Dil düğmesi (Falcon .lang-switch). Dil değişince kendini günceller. */
  function switcher() {
    var doc = g.document, box = doc.createElement('div');
    box.className = 'lang-switch'; box.setAttribute('role', 'group');
    LANGS.forEach(function (l) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'lang-btn'; b.textContent = SHORT[l]; b.title = NAMES[l];
      b.setAttribute('lang', l); b.dataset.lang = l;
      b.addEventListener('click', function () { set(l); });
      box.appendChild(b);
    });
    function sync() { box.setAttribute('aria-label', t('fc.lang')); Array.prototype.forEach.call(box.children, function (b) { var on = b.dataset.lang === lang_(); b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }); }
    sync(); onChange(sync);
    return box;
  }
  function onChange(f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
  function pick(obj, l) { if (!obj) return ''; if (typeof obj === 'string') return obj; l = norm(l) || lang_(); return obj[l] || obj.en || obj.tr || obj.ar || ''; }

  var api = { add: add, t: t, set: set, lang: lang_, langs: LANGS.slice(), names: NAMES, apply: apply, num: num, locale: locale, onChange: onChange, switcher: switcher, pick: pick, isRtl: function () { return lang_() === 'ar'; }, _reset: function () { cur = null; subs = []; } };

  /* ---- çekirdek modüllerinin metinleri ---- */
  add({
    tr: {
      'fc.ok': 'Tamam', 'fc.cancel': 'Vazgeç', 'fc.close': 'Kapat', 'fc.save': 'Kaydet', 'fc.next': 'İleri', 'fc.back': 'Geri', 'fc.skip': 'Atla', 'fc.done': 'Bitti', 'fc.retry': 'Yeniden dene', 'fc.error': 'Hata', 'fc.open': 'Aç', 'fc.lang': 'Dil',
      'fc.h': 'sa', 'fc.min': 'dk',
      'fc.sync': 'Eşitle', 'fc.sync.idle': 'Eşitlendi', 'fc.sync.syncing': 'Eşitleniyor…', 'fc.sync.error': 'Eşitleme hatası — yeniden denemek için basın', 'fc.sync.off': 'Bulut eşitleme kapalı', 'fc.sync.offline': 'İnternet yok — değişiklikler bu cihazda saklanıyor', 'fc.sync.pending': '{n} değişiklik gönderilmeyi bekliyor',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'Wi-Fi eşitleme açık (aynı ağdaki cihazlar)', 'fc.lan.off': 'Wi-Fi eşitleme kapalı', 'fc.lan.busy': 'Wi-Fi ile eşitleniyor…',
      'fc.update': 'Güncelle', 'fc.update.check': 'Güncellemeleri denetle', 'fc.update.checking': 'Denetleniyor…', 'fc.update.none': 'Program güncel (v{v})', 'fc.update.avail': 'Yeni sürüm hazır: v{v}', 'fc.update.press': 'Tek tuşla güncellemek için basın. Kayıtlarınız korunur.', 'fc.update.ready': 'v{v} indirildi; program kapanınca kendiliğinden kurulur.', 'fc.update.now': 'Şimdi kur ve yeniden aç',
      'fc.update.downloading': 'İndiriliyor…', 'fc.update.verifying': 'Doğrulanıyor…', 'fc.update.installing': 'Kuruluyor…', 'fc.update.restarting': 'Program yeniden başlatılıyor…', 'fc.update.done': 'Güncelleme kuruldu', 'fc.update.failed': 'Güncelleme yapılamadı: {e}', 'fc.update.fallback': 'Yama uygulanamadı, tam sürüm indiriliyor…', 'fc.update.browser': 'Yeni sürüm yayınlandı; indirme sayfası açılıyor.', 'fc.update.patchMode': 'yalnızca değişen kısımlar', 'fc.update.fullMode': 'tam paket', 'fc.update.offline': 'İnternet yok; bağlantı gelince yeniden denenecek.', 'fc.update.bad': 'İndirilen dosya doğrulanamadı (SHA-256 uyuşmuyor).',
      'fc.p.left': 'kalan {x}', 'fc.p.speed': 'MB/sn', 'fc.p.calc': 'hız hesaplanıyor…', 'fc.p.done': 'İndirildi',
      'fc.theme': 'Tema', 'fc.theme.dark': 'Koyu', 'fc.theme.light': 'Açık', 'fc.theme.auto': 'Otomatik', 'fc.theme.toggle': 'Koyu / açık tema', 'fc.font': 'Yazı boyutu', 'fc.font.smaller': 'Yazıyı küçült', 'fc.font.larger': 'Yazıyı büyüt', 'fc.font.reset': 'Varsayılan', 'fc.look': 'Görünüm', 'fc.look.desc': 'Tema, yazı boyutu ve dil bu cihazda saklanır.',
      'fc.win.minimize': 'Küçült', 'fc.win.half': 'Orta boyut', 'fc.win.restore': 'Tam ekrana dön', 'fc.win.fullscreen': 'Tam ekran', 'fc.win.close': 'Kapat',
      'fc.contact.title': 'Admin ile iletişim', 'fc.contact.desc': 'Öneri, istek ve hata bildirimlerinizi yazın; mesajınız doğrudan yöneticiye ulaşır.', 'fc.contact.type': 'Konu', 'fc.contact.oneri': 'Öneri / istek', 'fc.contact.hata': 'Hata bildirimi', 'fc.contact.reach': 'E-posta ya da telefon (yanıt için, isteğe bağlı)', 'fc.contact.msg': 'Mesajınız', 'fc.contact.send': 'Gönder', 'fc.contact.empty': 'Lütfen mesajınızı yazın.', 'fc.contact.sending': 'Gönderiliyor…', 'fc.contact.ok': 'Mesajınız yöneticiye iletildi. Teşekkürler!', 'fc.contact.queued': 'İnternet yok; mesajınız saklandı, bağlantı gelince kendiliğinden gönderilecek.', 'fc.contact.waiting': 'Gönderilmeyi bekleyen mesaj: {n}', 'fc.contact.privacy': 'Mesajınızla birlikte yalnızca program adı, sürüm, platform ve dil gönderilir. Kayıtlarınız gönderilmez.',
      'fc.crash.title': 'Otomatik hata raporu', 'fc.crash.desc': 'Program beklenmedik bir hata verirse yalnızca hata metni, sürüm ve platform yöneticiye gönderilir. Kayıtlarınızın içeriği hiçbir zaman gönderilmez. Günde en çok 5 rapor.', 'fc.crash.on': 'Hata olunca yöneticiye kendiliğinden bildir', 'fc.crash.sent': 'Bu cihazdan bugün gönderilen rapor: {n}',
      'fc.usage.title': 'Kullanım Limitleri', 'fc.usage.desc': 'Bu sayaçlar sizin KENDİ Firebase ve yapay zeka hesabınızdaki kullanımı gösterir. Yöneticinin kotası kullanılmaz; ücret ya da sınır sizin hesabınıza aittir.', 'fc.usage.firebase': 'Firebase — bugün / günlük ücretsiz sınır', 'fc.usage.read': 'Okuma', 'fc.usage.write': 'Yazma', 'fc.usage.delete': 'Silme', 'fc.usage.full': 'Bugünkü ücretsiz sınır doldu; eşitleme sıfırlamadan sonra kendiliğinden sürer.', 'fc.usage.reset': 'Sınırlar {t} sonra sıfırlanır (Pasifik saatiyle gece yarısı).', 'fc.usage.device': 'Yalnızca bu cihazın bugünkü sayımıdır; aynı hesaba bağlı diğer cihazlar aynı sınırı paylaşır.', 'fc.usage.ai': 'Yapay zeka çağrıları — bugün', 'fc.usage.calls': '{n} çağrı', 'fc.usage.noAi': 'Bugün yapay zeka çağrısı yapılmadı.', 'fc.usage.limits': 'Hesabımdaki sınırlar', 'fc.usage.project': 'Proje: {p}', 'fc.usage.noFirebase': 'Bağlı Firebase hesabı yok.', 'fc.usage.none': 'Bu program bulut eşitleme ya da yapay zeka kullanmaz; sınırlı bir hizmet yoktur. Verileriniz yalnızca bu cihazda tutulur.',
      'fc.ai.gemini.note': 'Ücretsiz katmanı var; günlük istek sınırı modele göre değişir.', 'fc.ai.openai.note': 'Ücretsiz katmanı yok; kullanım hesabınızdaki krediden düşer.', 'fc.ai.anthropic.note': 'Ücretsiz katmanı yok; kullanım hesabınızdaki krediden düşer.', 'fc.ai.groq.note': 'Ücretsiz katmanı var; dakikalık ve günlük sınırlar modele göre değişir.',
      'fc.ob.title': 'Kurulum', 'fc.ob.step': 'Adım {i} / {n}', 'fc.ob.welcome': 'Hoş geldiniz', 'fc.ob.langDesc': 'Programın dilini seçin. İstediğiniz zaman üst çubuktan değiştirebilirsiniz.', 'fc.ob.lookTitle': 'Görünüm', 'fc.ob.lookDesc': 'Tema ve yazı boyutunu gözünüze göre ayarlayın.',
      'fc.ob.fbTitle': 'Kendi Firebase hesabınız', 'fc.ob.fbDesc': 'Bulut eşitleme için ücretsiz kendi Firebase projenizi bağlayın. Firebase konsolunda Proje ayarları → Web uygulaması → yapılandırmayı kopyalayıp buraya yapıştırın.', 'fc.ob.fbPaste': 'firebaseConfig (JSON ya da kod)', 'fc.ob.fbGuide': 'Adım adım rehber', 'fc.ob.fbConsole': 'Firebase konsolu', 'fc.ob.test': 'Bağlantıyı dene', 'fc.ob.testing': 'Deneniyor…', 'fc.ob.fbOk': 'Bağlantı başarılı: {p}', 'fc.ob.fbRules': 'Proje bulundu ({p}); güvenlik kuralları erişimi kısıtlıyor. Rehberdeki kuralları ekleyin.', 'fc.ob.fbNoDb': 'Projede Firestore veritabanı yok. Konsolda Firestore Database → Oluştur deyin.', 'fc.ob.fbBadKey': 'API anahtarı geçersiz ya da bu proje için kapalı.', 'fc.ob.fbBad': 'Yapılandırma okunamadı. apiKey ve projectId alanları gerekli.', 'fc.ob.fbNet': 'Sunucuya ulaşılamadı; internet bağlantınızı denetleyin.', 'fc.ob.fbLater': 'İsterseniz bu adımı atlayıp sonra Ayarlar\'dan bağlayabilirsiniz; program bu cihazda tam çalışır.',
      'fc.ob.aiTitle': 'Yapay zeka anahtarı (isteğe bağlı)', 'fc.ob.aiDesc': 'Yapay zeka özellikleri için kendi anahtarınızı ekleyin. Anahtar yalnızca bu cihazda saklanır ve yalnızca seçtiğiniz sağlayıcıya gönderilir.', 'fc.ob.aiProvider': 'Sağlayıcı', 'fc.ob.aiKey': 'API anahtarı', 'fc.ob.aiGet': 'Anahtarı buradan alın', 'fc.ob.aiOk': 'Anahtar çalışıyor.', 'fc.ob.aiBad': 'Anahtar reddedildi; doğru kopyaladığınızdan emin olun.', 'fc.ob.aiUnk': 'Anahtar denetlenemedi; yine de kaydedildi.',
      'fc.ob.doneTitle': 'Hazırsınız', 'fc.ob.doneDesc': 'Ayarlar\'dan bu sihirbazı istediğiniz zaman yeniden açabilirsiniz.', 'fc.ob.start': 'Başla', 'fc.ob.reopen': 'Kurulum sihirbazını aç', 'fc.ob.saved': 'Kaydedildi',
      'fc.wn.title': 'Bu sürümde neler yeni', 'fc.wn.ver': 'Sürüm {v}', 'fc.wn.none': 'Bu sürüm iyileştirmeler ve hata düzeltmeleri içeriyor.', 'fc.wn.safe': 'Kayıtlarınız olduğu gibi korundu.', 'fc.wn.show': 'Sürüm notlarını göster',
      'fc.ann.title': 'Duyurular', 'fc.ann.none': 'Henüz duyuru yok.', 'fc.ann.link': 'Bağlantıyı aç', 'fc.ann.important': 'Önemli', 'fc.ann.update': 'Şimdi güncelle',
      'fc.settings.about': 'Hakkında', 'fc.settings.version': 'Sürüm'
    },
    en: {
      'fc.ok': 'OK', 'fc.cancel': 'Cancel', 'fc.close': 'Close', 'fc.save': 'Save', 'fc.next': 'Next', 'fc.back': 'Back', 'fc.skip': 'Skip', 'fc.done': 'Done', 'fc.retry': 'Try again', 'fc.error': 'Error', 'fc.open': 'Open', 'fc.lang': 'Language',
      'fc.h': 'h', 'fc.min': 'min',
      'fc.sync': 'Sync', 'fc.sync.idle': 'Synced', 'fc.sync.syncing': 'Syncing…', 'fc.sync.error': 'Sync error — press to try again', 'fc.sync.off': 'Cloud sync is off', 'fc.sync.offline': 'No internet — changes are kept on this device', 'fc.sync.pending': '{n} changes waiting to be sent',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'Wi-Fi sync is on (devices on the same network)', 'fc.lan.off': 'Wi-Fi sync is off', 'fc.lan.busy': 'Syncing over Wi-Fi…',
      'fc.update': 'Update', 'fc.update.check': 'Check for updates', 'fc.update.checking': 'Checking…', 'fc.update.none': 'Up to date (v{v})', 'fc.update.avail': 'New version ready: v{v}', 'fc.update.press': 'Press once to update. Your records are kept.', 'fc.update.ready': 'v{v} downloaded; it installs by itself when the program closes.', 'fc.update.now': 'Install now and reopen',
      'fc.update.downloading': 'Downloading…', 'fc.update.verifying': 'Verifying…', 'fc.update.installing': 'Installing…', 'fc.update.restarting': 'Restarting the program…', 'fc.update.done': 'Update installed', 'fc.update.failed': 'Update failed: {e}', 'fc.update.fallback': 'The patch could not be applied; downloading the full version…', 'fc.update.browser': 'A new version is out; opening the download page.', 'fc.update.patchMode': 'changed parts only', 'fc.update.fullMode': 'full package', 'fc.update.offline': 'No internet; will try again when online.', 'fc.update.bad': 'The downloaded file could not be verified (SHA-256 mismatch).',
      'fc.p.left': '{x} left', 'fc.p.speed': 'MB/s', 'fc.p.calc': 'measuring speed…', 'fc.p.done': 'Downloaded',
      'fc.theme': 'Theme', 'fc.theme.dark': 'Dark', 'fc.theme.light': 'Light', 'fc.theme.auto': 'Auto', 'fc.theme.toggle': 'Dark / light theme', 'fc.font': 'Text size', 'fc.font.smaller': 'Smaller text', 'fc.font.larger': 'Larger text', 'fc.font.reset': 'Default', 'fc.look': 'Appearance', 'fc.look.desc': 'Theme, text size and language are stored on this device.',
      'fc.win.minimize': 'Minimize', 'fc.win.half': 'Half size', 'fc.win.restore': 'Back to full screen', 'fc.win.fullscreen': 'Full screen', 'fc.win.close': 'Close',
      'fc.contact.title': 'Contact the admin', 'fc.contact.desc': 'Send suggestions, requests and bug reports; your message goes straight to the administrator.', 'fc.contact.type': 'Topic', 'fc.contact.oneri': 'Suggestion / request', 'fc.contact.hata': 'Bug report', 'fc.contact.reach': 'Email or phone (for a reply, optional)', 'fc.contact.msg': 'Your message', 'fc.contact.send': 'Send', 'fc.contact.empty': 'Please write your message.', 'fc.contact.sending': 'Sending…', 'fc.contact.ok': 'Your message was delivered to the administrator. Thank you!', 'fc.contact.queued': 'No internet; your message was saved and will be sent automatically once you are online.', 'fc.contact.waiting': 'Messages waiting to be sent: {n}', 'fc.contact.privacy': 'Only the program name, version, platform and language are sent with your message. Your records are never sent.',
      'fc.crash.title': 'Automatic error reports', 'fc.crash.desc': 'If the program hits an unexpected error, only the error text, version and platform are sent to the administrator. The contents of your records are never sent. At most 5 reports a day.', 'fc.crash.on': 'Notify the administrator automatically when an error happens', 'fc.crash.sent': 'Reports sent from this device today: {n}',
      'fc.usage.title': 'Usage limits', 'fc.usage.desc': 'These counters show usage on YOUR OWN Firebase and AI accounts. The administrator\'s quota is not used; any cost or limit belongs to your account.', 'fc.usage.firebase': 'Firebase — today / daily free limit', 'fc.usage.read': 'Reads', 'fc.usage.write': 'Writes', 'fc.usage.delete': 'Deletes', 'fc.usage.full': 'Today\'s free limit is used up; sync resumes automatically after the reset.', 'fc.usage.reset': 'Limits reset in {t} (midnight Pacific time).', 'fc.usage.device': 'This is this device\'s count for today only; other devices on the same account share the same limit.', 'fc.usage.ai': 'AI calls — today', 'fc.usage.calls': '{n} calls', 'fc.usage.noAi': 'No AI calls today.', 'fc.usage.limits': 'Limits on my account', 'fc.usage.project': 'Project: {p}', 'fc.usage.noFirebase': 'No Firebase account connected.', 'fc.usage.none': 'This program uses no cloud sync or AI, so there are no limited services. Your data stays on this device only.',
      'fc.ai.gemini.note': 'Has a free tier; the daily request limit depends on the model.', 'fc.ai.openai.note': 'No free tier; usage is charged to the credit on your account.', 'fc.ai.anthropic.note': 'No free tier; usage is charged to the credit on your account.', 'fc.ai.groq.note': 'Has a free tier; per-minute and daily limits depend on the model.',
      'fc.ob.title': 'Setup', 'fc.ob.step': 'Step {i} of {n}', 'fc.ob.welcome': 'Welcome', 'fc.ob.langDesc': 'Choose the program language. You can change it any time from the top bar.', 'fc.ob.lookTitle': 'Appearance', 'fc.ob.lookDesc': 'Adjust the theme and text size to suit your eyes.',
      'fc.ob.fbTitle': 'Your own Firebase account', 'fc.ob.fbDesc': 'Connect your own free Firebase project for cloud sync. In the Firebase console open Project settings → Web app, copy the configuration and paste it here.', 'fc.ob.fbPaste': 'firebaseConfig (JSON or code)', 'fc.ob.fbGuide': 'Step-by-step guide', 'fc.ob.fbConsole': 'Firebase console', 'fc.ob.test': 'Test connection', 'fc.ob.testing': 'Testing…', 'fc.ob.fbOk': 'Connected: {p}', 'fc.ob.fbRules': 'Project found ({p}); security rules are restricting access. Add the rules from the guide.', 'fc.ob.fbNoDb': 'The project has no Firestore database. In the console choose Firestore Database → Create.', 'fc.ob.fbBadKey': 'The API key is invalid or disabled for this project.', 'fc.ob.fbBad': 'Could not read the configuration. apiKey and projectId are required.', 'fc.ob.fbNet': 'Could not reach the server; check your internet connection.', 'fc.ob.fbLater': 'You can skip this step and connect later in Settings; the program works fully on this device.',
      'fc.ob.aiTitle': 'AI key (optional)', 'fc.ob.aiDesc': 'Add your own key for the AI features. The key is stored only on this device and sent only to the provider you choose.', 'fc.ob.aiProvider': 'Provider', 'fc.ob.aiKey': 'API key', 'fc.ob.aiGet': 'Get a key here', 'fc.ob.aiOk': 'The key works.', 'fc.ob.aiBad': 'The key was rejected; make sure you copied it correctly.', 'fc.ob.aiUnk': 'The key could not be checked; it was saved anyway.',
      'fc.ob.doneTitle': 'You are all set', 'fc.ob.doneDesc': 'You can reopen this wizard from Settings at any time.', 'fc.ob.start': 'Start', 'fc.ob.reopen': 'Open the setup wizard', 'fc.ob.saved': 'Saved',
      'fc.wn.title': 'What\'s new in this version', 'fc.wn.ver': 'Version {v}', 'fc.wn.none': 'This version brings improvements and bug fixes.', 'fc.wn.safe': 'Your records were kept as they are.', 'fc.wn.show': 'Show release notes',
      'fc.ann.title': 'Announcements', 'fc.ann.none': 'No announcements yet.', 'fc.ann.link': 'Open link', 'fc.ann.important': 'Important', 'fc.ann.update': 'Update now',
      'fc.settings.about': 'About', 'fc.settings.version': 'Version'
    },
    ar: {
      'fc.ok': 'حسناً', 'fc.cancel': 'إلغاء', 'fc.close': 'إغلاق', 'fc.save': 'حفظ', 'fc.next': 'التالي', 'fc.back': 'السابق', 'fc.skip': 'تخطٍّ', 'fc.done': 'تم', 'fc.retry': 'أعد المحاولة', 'fc.error': 'خطأ', 'fc.open': 'فتح', 'fc.lang': 'اللغة',
      'fc.h': 'س', 'fc.min': 'د',
      'fc.sync': 'مزامنة', 'fc.sync.idle': 'تمت المزامنة', 'fc.sync.syncing': 'جارٍ المزامنة…', 'fc.sync.error': 'خطأ في المزامنة — اضغط لإعادة المحاولة', 'fc.sync.off': 'المزامنة السحابية متوقفة', 'fc.sync.offline': 'لا يوجد اتصال بالإنترنت — التغييرات محفوظة على هذا الجهاز', 'fc.sync.pending': '{n} تغييرات بانتظار الإرسال',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'مزامنة Wi-Fi مفعّلة (الأجهزة على الشبكة نفسها)', 'fc.lan.off': 'مزامنة Wi-Fi متوقفة', 'fc.lan.busy': 'جارٍ المزامنة عبر Wi-Fi…',
      'fc.update': 'تحديث', 'fc.update.check': 'التحقق من التحديثات', 'fc.update.checking': 'جارٍ التحقق…', 'fc.update.none': 'البرنامج محدَّث (v{v})', 'fc.update.avail': 'إصدار جديد جاهز: v{v}', 'fc.update.press': 'اضغط مرة واحدة للتحديث. تبقى سجلاتك محفوظة.', 'fc.update.ready': 'تم تنزيل v{v}؛ يُثبَّت تلقائياً عند إغلاق البرنامج.', 'fc.update.now': 'ثبّت الآن وأعد الفتح',
      'fc.update.downloading': 'جارٍ التنزيل…', 'fc.update.verifying': 'جارٍ التحقق من الملف…', 'fc.update.installing': 'جارٍ التثبيت…', 'fc.update.restarting': 'جارٍ إعادة تشغيل البرنامج…', 'fc.update.done': 'تم تثبيت التحديث', 'fc.update.failed': 'تعذّر التحديث: {e}', 'fc.update.fallback': 'تعذّر تطبيق التصحيح؛ جارٍ تنزيل الإصدار الكامل…', 'fc.update.browser': 'صدر إصدار جديد؛ جارٍ فتح صفحة التنزيل.', 'fc.update.patchMode': 'الأجزاء المتغيرة فقط', 'fc.update.fullMode': 'الحزمة الكاملة', 'fc.update.offline': 'لا يوجد اتصال؛ ستُعاد المحاولة عند عودة الإنترنت.', 'fc.update.bad': 'تعذّر التحقق من الملف المنزَّل (بصمة SHA-256 غير مطابقة).',
      'fc.p.left': 'متبقٍّ {x}', 'fc.p.speed': 'م.ب/ث', 'fc.p.calc': 'جارٍ قياس السرعة…', 'fc.p.done': 'اكتمل التنزيل',
      'fc.theme': 'السمة', 'fc.theme.dark': 'داكنة', 'fc.theme.light': 'فاتحة', 'fc.theme.auto': 'تلقائية', 'fc.theme.toggle': 'سمة داكنة / فاتحة', 'fc.font': 'حجم الخط', 'fc.font.smaller': 'تصغير الخط', 'fc.font.larger': 'تكبير الخط', 'fc.font.reset': 'الافتراضي', 'fc.look': 'المظهر', 'fc.look.desc': 'تُحفظ السمة وحجم الخط واللغة على هذا الجهاز.',
      'fc.win.minimize': 'تصغير', 'fc.win.half': 'نصف الحجم', 'fc.win.restore': 'العودة إلى ملء الشاشة', 'fc.win.fullscreen': 'ملء الشاشة', 'fc.win.close': 'إغلاق',
      'fc.contact.title': 'التواصل مع المسؤول', 'fc.contact.desc': 'اكتب اقتراحاتك وطلباتك وبلاغات الأخطاء؛ تصل رسالتك مباشرة إلى المسؤول.', 'fc.contact.type': 'الموضوع', 'fc.contact.oneri': 'اقتراح / طلب', 'fc.contact.hata': 'الإبلاغ عن خطأ', 'fc.contact.reach': 'البريد الإلكتروني أو الهاتف (للرد، اختياري)', 'fc.contact.msg': 'رسالتك', 'fc.contact.send': 'إرسال', 'fc.contact.empty': 'يرجى كتابة رسالتك.', 'fc.contact.sending': 'جارٍ الإرسال…', 'fc.contact.ok': 'وصلت رسالتك إلى المسؤول. شكراً لك!', 'fc.contact.queued': 'لا يوجد اتصال بالإنترنت؛ حُفظت رسالتك وستُرسل تلقائياً عند عودة الاتصال.', 'fc.contact.waiting': 'رسائل بانتظار الإرسال: {n}', 'fc.contact.privacy': 'لا يُرسل مع رسالتك سوى اسم البرنامج وإصداره والمنصة واللغة. لا تُرسل سجلاتك أبداً.',
      'fc.crash.title': 'تقارير الأخطاء التلقائية', 'fc.crash.desc': 'إذا واجه البرنامج خطأً غير متوقع يُرسل إلى المسؤول نص الخطأ والإصدار والمنصة فقط. لا يُرسل محتوى سجلاتك أبداً. خمسة تقارير يومياً على الأكثر.', 'fc.crash.on': 'إبلاغ المسؤول تلقائياً عند حدوث خطأ', 'fc.crash.sent': 'التقارير المرسلة من هذا الجهاز اليوم: {n}',
      'fc.usage.title': 'حدود الاستخدام', 'fc.usage.desc': 'تعرض هذه العدادات الاستخدام على حساباتك الخاصة في Firebase والذكاء الاصطناعي. لا تُستهلك حصة المسؤول؛ أي تكلفة أو حد يخص حسابك أنت.', 'fc.usage.firebase': 'Firebase — اليوم / الحد المجاني اليومي', 'fc.usage.read': 'قراءة', 'fc.usage.write': 'كتابة', 'fc.usage.delete': 'حذف', 'fc.usage.full': 'انتهى الحد المجاني لهذا اليوم؛ تُستأنف المزامنة تلقائياً بعد إعادة التعيين.', 'fc.usage.reset': 'تُعاد الحدود بعد {t} (منتصف الليل بتوقيت المحيط الهادئ).', 'fc.usage.device': 'هذا عدّاد هذا الجهاز لليوم فقط؛ تتشارك الأجهزة الأخرى على الحساب نفسه الحدَّ ذاته.', 'fc.usage.ai': 'طلبات الذكاء الاصطناعي — اليوم', 'fc.usage.calls': '{n} طلب', 'fc.usage.noAi': 'لا توجد طلبات ذكاء اصطناعي اليوم.', 'fc.usage.limits': 'الحدود في حسابي', 'fc.usage.project': 'المشروع: {p}', 'fc.usage.noFirebase': 'لا يوجد حساب Firebase مرتبط.', 'fc.usage.none': 'لا يستخدم هذا البرنامج المزامنة السحابية ولا الذكاء الاصطناعي، فلا توجد خدمات محدودة. تبقى بياناتك على هذا الجهاز فقط.',
      'fc.ai.gemini.note': 'تتوفر طبقة مجانية؛ يختلف الحد اليومي للطلبات حسب النموذج.', 'fc.ai.openai.note': 'لا توجد طبقة مجانية؛ يُخصم الاستخدام من رصيد حسابك.', 'fc.ai.anthropic.note': 'لا توجد طبقة مجانية؛ يُخصم الاستخدام من رصيد حسابك.', 'fc.ai.groq.note': 'تتوفر طبقة مجانية؛ تختلف الحدود في الدقيقة واليوم حسب النموذج.',
      'fc.ob.title': 'الإعداد', 'fc.ob.step': 'الخطوة {i} من {n}', 'fc.ob.welcome': 'أهلاً بك', 'fc.ob.langDesc': 'اختر لغة البرنامج. يمكنك تغييرها في أي وقت من الشريط العلوي.', 'fc.ob.lookTitle': 'المظهر', 'fc.ob.lookDesc': 'اضبط السمة وحجم الخط بما يريح عينيك.',
      'fc.ob.fbTitle': 'حسابك الخاص في Firebase', 'fc.ob.fbDesc': 'اربط مشروع Firebase المجاني الخاص بك للمزامنة السحابية. في وحدة تحكم Firebase افتح إعدادات المشروع ← تطبيق الويب، وانسخ الإعدادات والصقها هنا.', 'fc.ob.fbPaste': 'firebaseConfig (بصيغة JSON أو كود)', 'fc.ob.fbGuide': 'دليل خطوة بخطوة', 'fc.ob.fbConsole': 'وحدة تحكم Firebase', 'fc.ob.test': 'اختبار الاتصال', 'fc.ob.testing': 'جارٍ الاختبار…', 'fc.ob.fbOk': 'تم الاتصال: {p}', 'fc.ob.fbRules': 'عُثر على المشروع ({p})، لكن قواعد الأمان تقيّد الوصول. أضف القواعد الواردة في الدليل.', 'fc.ob.fbNoDb': 'لا توجد قاعدة بيانات Firestore في المشروع. اختر في وحدة التحكم Firestore Database ← إنشاء.', 'fc.ob.fbBadKey': 'مفتاح API غير صالح أو معطَّل لهذا المشروع.', 'fc.ob.fbBad': 'تعذّرت قراءة الإعدادات. الحقلان apiKey وprojectId مطلوبان.', 'fc.ob.fbNet': 'تعذّر الوصول إلى الخادم؛ تحقّق من اتصالك بالإنترنت.', 'fc.ob.fbLater': 'يمكنك تخطي هذه الخطوة والربط لاحقاً من الإعدادات؛ يعمل البرنامج بالكامل على هذا الجهاز.',
      'fc.ob.aiTitle': 'مفتاح الذكاء الاصطناعي (اختياري)', 'fc.ob.aiDesc': 'أضف مفتاحك الخاص لميزات الذكاء الاصطناعي. يُحفظ المفتاح على هذا الجهاز فقط ولا يُرسل إلا إلى المزوّد الذي تختاره.', 'fc.ob.aiProvider': 'المزوّد', 'fc.ob.aiKey': 'مفتاح API', 'fc.ob.aiGet': 'احصل على مفتاح من هنا', 'fc.ob.aiOk': 'المفتاح يعمل.', 'fc.ob.aiBad': 'رُفض المفتاح؛ تأكّد من نسخه بشكل صحيح.', 'fc.ob.aiUnk': 'تعذّر التحقق من المفتاح؛ حُفظ على أي حال.',
      'fc.ob.doneTitle': 'كل شيء جاهز', 'fc.ob.doneDesc': 'يمكنك إعادة فتح هذا المعالج من الإعدادات في أي وقت.', 'fc.ob.start': 'ابدأ', 'fc.ob.reopen': 'فتح معالج الإعداد', 'fc.ob.saved': 'تم الحفظ',
      'fc.wn.title': 'ما الجديد في هذا الإصدار', 'fc.wn.ver': 'الإصدار {v}', 'fc.wn.none': 'يتضمن هذا الإصدار تحسينات وإصلاحات للأخطاء.', 'fc.wn.safe': 'بقيت سجلاتك محفوظة كما هي.', 'fc.wn.show': 'عرض ملاحظات الإصدار',
      'fc.ann.title': 'الإعلانات', 'fc.ann.none': 'لا توجد إعلانات بعد.', 'fc.ann.link': 'فتح الرابط', 'fc.ann.important': 'مهم', 'fc.ann.update': 'حدّث الآن',
      'fc.settings.about': 'حول البرنامج', 'fc.settings.version': 'الإصدار'
    }
  });

  FC.i18n = api;
  FC.t = t;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- ui.js ---- */
/* FC.ui — küçük DOM yardımcıları: el(), icon(), modal(), toast(). Çerçevesizdir; React içinde de güvenle çağrılır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var P = {
    sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    cloudOff: '<path d="m2 2 20 20"/><path d="M5.8 5.8A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.3-.2"/><path d="M21.5 15.5A4.5 4.5 0 0 0 17.5 10h-1.8A7 7 0 0 0 10 5.1"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
    wifiOff: '<path d="m2 2 20 20"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M1.42 9a16 16 0 0 1 4.7-2.88"/><path d="M12 20h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    minus: '<path d="M5 12h14"/>',
    half: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    bug: '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6 13H2M22 13h-4"/>',
    sparkles: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2Z"/><path d="M19 17v4M17 19h4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };
  function icon(name, cls) {
    return '<svg class="fc-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** el('button.btn.primary', {type:'button', onclick: f}, ['metin', childEl]) — html: için attrs.html */
  function el(spec, attrs, kids) {
    var m = String(spec).split('.'), e = g.document.createElement(m[0] || 'div');
    if (m.length > 1) e.className = m.slice(1).join(' ');
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k]; if (v === undefined || v === null || v === false) continue;
      if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className += (e.className ? ' ' : '') + v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? g.document.createTextNode(String(c)) : c);
    });
    return e;
  }
  /** Modal ve bildirimlerin bağlandığı kök (bağımsız eklentide Shadow DOM; normalde body). */
  function root() { return (FC.ui && FC.ui.root) || g.document.body; }
  var stack = [];
  /** modal({title, icon, body: Node|string(html), buttons:[{label, cls, onClick(close) → false ile açık kalır}], cls, onClose, dismiss:true}) */
  function modal(o) {
    o = o || {};
    var back = el('div.modal-backdrop'), box = el('div.modal' + (o.cls ? '.' + o.cls : ''), { role: 'dialog', 'aria-modal': 'true' });
    var head = el('div.modal-header'), h = el('h2', { html: (o.icon ? icon(o.icon) + ' ' : '') + esc(o.title || '') });
    var x = el('button.icon-btn', { type: 'button', 'aria-label': FC.t ? FC.t('fc.close') : 'Close', html: icon('x') });
    head.appendChild(h); if (o.dismiss !== false) head.appendChild(x);
    var body = el('div.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var foot = el('div.modal-footer');
    box.appendChild(head); box.appendChild(body);
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      if (back.parentNode) back.parentNode.removeChild(back);
      stack = stack.filter(function (s) { return s !== api; });
      g.document.removeEventListener('keydown', onKey);
      if (o.onClose) try { o.onClose(); } catch (e) {}
    }
    function setButtons(list) {
      foot.innerHTML = '';
      (list || []).forEach(function (b) {
        if (b === 'spacer') { foot.appendChild(el('span.fc-spacer')); return; }
        var btn = el('button.btn' + (b.cls ? '.' + b.cls.split(' ').join('.') : ''), { type: 'button', html: (b.icon ? icon(b.icon) : '') + esc(b.label) });
        if (b.disabled) btn.disabled = true;
        btn.addEventListener('click', function () { var r = b.onClick ? b.onClick(close, btn) : undefined; if (r !== false) close(); });
        foot.appendChild(btn);
      });
      if (list && list.length) { if (!foot.parentNode) box.appendChild(foot); } else if (foot.parentNode) box.removeChild(foot);
    }
    function onKey(e) { if (e.key === 'Escape' && o.dismiss !== false && stack[stack.length - 1] === api) close(); }
    x.addEventListener('click', close);
    if (o.dismiss !== false) back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    g.document.addEventListener('keydown', onKey);
    setButtons(o.buttons || [{ label: FC.t ? FC.t('fc.ok') : 'OK', cls: 'primary' }]);
    back.appendChild(box); root().appendChild(back);
    var api = { el: box, body: body, title: h, close: close, setButtons: setButtons, setTitle: function (s, ic) { h.innerHTML = (ic ? icon(ic) + ' ' : '') + esc(s); } };
    stack.push(api);
    return api;
  }
  function toast(msg, kind, ms) {
    var r = root(), host = r.querySelector('.toasts');
    if (!host) { host = el('div.toasts', { 'aria-live': 'polite' }); r.appendChild(host); }
    var t = el('div.toast' + (kind ? '.' + kind : ''), { role: 'status', text: msg });
    host.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 4200);
    return t;
  }
  /** Ayarlar kartı iskeleti: {id, title, icon, desc} → <section class="card"> */
  function card(o) {
    var c = el('section.card', { id: o.id, 'data-fc-card': o.key || o.id });
    c.appendChild(el('h3.card-title', { html: (o.icon ? icon(o.icon) : '') + '<span>' + esc(o.title) + '</span>' }));
    if (o.desc) c.appendChild(el('p.card-desc', { text: o.desc }));
    return c;
  }
  function openUrl(u) {
    try { if (FC.host && FC.host.openExternal) return FC.host.openExternal(u); } catch (e) {}
    g.open(u, '_blank', 'noopener');
  }
  var api = { el: el, icon: icon, esc: esc, modal: modal, toast: toast, card: card, openUrl: openUrl, icons: P };
  FC.ui = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- host.js ---- */
/* FC.host — kabuk köprüsü. Arayüz kodu yalnızca FC.host'u çağırır; altındaki kabuk değişebilir.
     electron : fc-preload.js'in açtığı window.fcHost
     shell    : kendi masaüstü kabuğu (Go + WebView2 / Edge --app vb.) — window.fcHost'u kendisi kurar ve kind:'shell' verir
                (ayrıca shell:'go' gibi bir ad). Sözleşme electron ile AYNI: window{minimize,half,toggleFullscreen,close,getState,onState},
                update{channel, applyPatch(bytes,meta), installFull(bytes,meta), run?(plan,ilerleme)}, net{download(url,ilerleme)}
                (hata kodu e.code ya da iletide 'HTTP_404' → güncel), version, platform, openExternal?, onMainError?.
                Farkı: <html> fc-host-shell alır (Electron'a özgü -webkit-app-region sürükleme kuralları uygulanmaz),
                tanılama/iletişim kayıtlarında 'shell/<platform>' görünür. Eski kabuklar kind:'electron' demeye devam edebilir.
     android  : window.AndroidBridge (yalnızca var olan yöntemler kullanılır; Küçült / Orta gizlenir, Kapat → moveTaskToBack)
     browser  : düz tarayıcı — Tam ekran Fullscreen API ile, diğer pencere düğmeleri gizli, güncelleme = indirme sayfası.
   <html> öğesine fc-host-<tür> sınıfı eklenir.
   Android köprüsünün güncelleme sözleşmesi (yerel tarafta uygulanır):
     updateBegin(kind 'patch'|'full', metaJson) → true · updateChunk(base64) → true · updateFinish() → '{"ok":true}' ya da '{"ok":false,"error":"..."}'
     Yerel taraf yamayı kurulu APK'ya (applicationInfo.sourceDir) uygular, meta.targetSha256 ile doğrular ve kurulumu başlatır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  function noop() { return Promise.resolve(); }
  function unsupported() { return Promise.reject(Object.assign(new Error('UNSUPPORTED'), { code: 'UNSUPPORTED' })); }

  function electron(h) {
    var w = h.window || {};
    var hu = h.update || {};
    var r = {
      kind: h.kind === 'shell' ? 'shell' : 'electron', shell: h.kind === 'shell' ? String(h.shell || 'custom') : '', platform: h.platform || 'win32',
      can: { minimize: !!w.minimize, half: !!w.half, fullscreen: !!w.toggleFullscreen, close: !!w.close, update: !!(hu.applyPatch || hu.run) },
      window: {
        minimize: function () { return w.minimize ? w.minimize() : noop(); },
        half: function () { return w.half ? w.half() : noop(); },
        toggleFullscreen: function () { return w.toggleFullscreen ? w.toggleFullscreen() : noop(); },
        close: function () { return w.close ? w.close() : noop(); },
        state: function () { return w.getState ? w.getState() : Promise.resolve({}); },
        onState: function (cb) { return w.onState ? w.onState(cb) : function () {}; }
      },
      update: {
        channel: hu.channel || 'win-app',
        applyPatch: function (bytes, meta) { return hu.applyPatch ? hu.applyPatch(bytes, meta) : unsupported(); },
        installFull: function (bytes, meta) { return hu.installFull ? hu.installFull(bytes, meta) : unsupported(); }
      },
      net: h.net && h.net.download ? { download: function (u, p) { return h.net.download(u, p); } } : null,
      onMainError: function (cb) { return h.onMainError ? h.onMainError(cb) : function () {}; },
      openExternal: h.openExternal ? function (u) { return h.openExternal(u); } : null,
      version: function () { return typeof h.version === 'function' ? String(h.version() || '') : (h.version || ''); }
    };
    if (hu.deferred && typeof hu.applyStaged === 'function') {   // "hazırla, kapanınca kur" (fc-preload ≥ otomatik güncelleme)
      r.update.deferred = true;
      r.update.applyStaged = function () { return hu.applyStaged(); };
    }
    if (typeof hu.run === 'function') r.update.run = function (plan, onProgress) { return hu.run(plan, onProgress); };   // kabuk her şeyi kendisi yapar
    return r;
  }

  function b64(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return g.btoa(s);
  }
  function android(a) {
    function has(n) { return typeof a[n] === 'function'; }
    function send(kind, bytes, meta) {
      if (!has('updateBegin')) return unsupported();
      return new Promise(function (res, rej) {
        try {
          if (a.updateBegin(kind, JSON.stringify(meta || {})) === false) throw new Error('BEGIN_FAILED');
          var CH = 768 * 1024, i = 0;
          (function next() {
            try {
              if (i >= bytes.length) {
                var r = {}; try { r = JSON.parse(a.updateFinish() || '{}'); } catch (e) { r = { ok: false, error: 'BAD_REPLY' }; }
                return r.ok ? res(r) : rej(Object.assign(new Error(r.error || 'FAILED'), { code: r.error || 'FAILED' }));
              }
              a.updateChunk(b64(bytes.subarray(i, i + CH))); i += CH;
              setTimeout(next, 0);
            } catch (e) { rej(e); }
          })();
        } catch (e) { rej(e); }
      });
    }
    return {
      kind: 'android', platform: 'android',
      can: { minimize: false, half: false, fullscreen: has('toggleFullscreen'), close: has('moveTaskToBack'), update: has('updateBegin') },
      window: {
        minimize: noop, half: noop,
        toggleFullscreen: function () { if (has('toggleFullscreen')) a.toggleFullscreen(); return noop(); },
        close: function () { if (has('moveTaskToBack')) a.moveTaskToBack(); return noop(); },
        state: function () { return Promise.resolve({}); }, onState: function () { return function () {}; }
      },
      update: {
        channel: 'android',
        applyPatch: function (bytes, meta) { return send('patch', bytes, meta); },
        installFull: function (bytes, meta) { return send('full', bytes, meta); }
      },
      net: null,
      onMainError: function () { return function () {}; },
      openExternal: has('openExternal') ? function (u) { a.openExternal(u); } : null,
      version: function () { try { return has('appVersion') ? String(a.appVersion()) : ''; } catch (e) { return ''; } }
    };
  }

  function browser() {
    var d = g.document;
    var fsOk = !!(d && d.documentElement && d.documentElement.requestFullscreen);
    return {
      kind: 'browser', platform: 'web',
      can: { minimize: false, half: false, fullscreen: fsOk, close: false, update: false },
      window: {
        minimize: noop, half: noop, close: noop,
        toggleFullscreen: function () {
          if (!fsOk) return noop();
          return d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen();
        },
        state: function () { return Promise.resolve({ fullscreen: !!(d && d.fullscreenElement) }); },
        onState: function (cb) { if (!d) return function () {}; var f = function () { cb({ fullscreen: !!d.fullscreenElement }); }; d.addEventListener('fullscreenchange', f); return function () { d.removeEventListener('fullscreenchange', f); }; }
      },
      update: { channel: 'web', applyPatch: unsupported, installFull: unsupported },
      net: null,
      onMainError: function () { return function () {}; },
      openExternal: null,
      version: function () { return ''; }
    };
  }

  function detect() {
    if (g.fcHost && g.fcHost.kind !== 'browser') return electron(g.fcHost);
    if (g.AndroidBridge) return android(g.AndroidBridge);
    return browser();
  }
  var host = detect();
  host.redetect = function () { var n = detect(); for (var k in n) host[k] = n[k]; mark(); return host; };
  function mark() {
    var de = g.document && g.document.documentElement; if (!de) return;
    de.classList.remove('fc-host-electron', 'fc-host-shell', 'fc-host-android', 'fc-host-browser');
    de.classList.add('fc-host-' + host.kind);
    if (host.kind === 'android') de.classList.add('is-android');
  }
  mark();
  FC.host = host;
  if (typeof module === 'object' && module.exports) module.exports = host;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- look.js ---- */
/* FC.look — renk şeması (falcon varsayılan, klasik, zumrut, gunbatimi, mor, okyanus, grafit, yuksek-kontrast),
   mod (dark | light | auto), yazı boyutu (A− / A+, 0.85–1.4) ve Arapça yazı tipi.
   <html data-scheme="…">, html.theme-light sınıfı ve --font-scale ayarlanır; seçimler kalıcıdır. Arapçada Noto Sans Arabic
   core.css'teki html[lang=ar] kuralıyla gelir.
   Uygulamanın eski görünümü:  FC.look.registerScheme('klasik', {dark:{'--bg':'#…', …}, light:{…}, label:{tr,en,ar}})
   (tek modu olan uygulama aynı tokenları ikisine de verebilir; light verilmezse dark kullanılır). */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var MIN = 0.85, MAX = 1.4, STEP = 0.05;
  var subs = [], mq = null;
  var BUILTIN = ['falcon', 'zumrut', 'gunbatimi', 'mor', 'okyanus', 'grafit', 'yuksek-kontrast'];
  var custom = {};   // id → {label}
  if (FC.i18n) FC.i18n.add({
    tr: { 'fc.scheme': 'Renk şeması', 'fc.scheme.falcon': 'Falcon (varsayılan)', 'fc.scheme.zumrut': 'Zümrüt', 'fc.scheme.gunbatimi': 'Gün batımı', 'fc.scheme.mor': 'Mor', 'fc.scheme.okyanus': 'Okyanus', 'fc.scheme.grafit': 'Grafit', 'fc.scheme.yuksek-kontrast': 'Yüksek kontrast', 'fc.mode': 'Mod' },
    en: { 'fc.scheme': 'Colour scheme', 'fc.scheme.falcon': 'Falcon (default)', 'fc.scheme.zumrut': 'Emerald', 'fc.scheme.gunbatimi': 'Sunset', 'fc.scheme.mor': 'Violet', 'fc.scheme.okyanus': 'Ocean', 'fc.scheme.grafit': 'Graphite', 'fc.scheme.yuksek-kontrast': 'High contrast', 'fc.mode': 'Mode' },
    ar: { 'fc.scheme': 'نظام الألوان', 'fc.scheme.falcon': 'فالكون (الافتراضي)', 'fc.scheme.zumrut': 'زمردي', 'fc.scheme.gunbatimi': 'الغروب', 'fc.scheme.mor': 'بنفسجي', 'fc.scheme.okyanus': 'المحيط', 'fc.scheme.grafit': 'رمادي غرافيتي', 'fc.scheme.yuksek-kontrast': 'تباين عالٍ', 'fc.mode': 'الوضع' }
  });
  function schemes() { var l = BUILTIN.slice(); Object.keys(custom).forEach(function (k) { if (l.indexOf(k) < 0) l.splice(k === 'klasik' ? 1 : l.length, 0, k); }); return l; }
  function scheme() { var s = S() && S().get('scheme'); return schemes().indexOf(s) >= 0 ? s : 'falcon'; }
  function schemeLabel(id) { return custom[id] ? FC.i18n.pick(custom[id].label) || id : T('fc.scheme.' + id); }
  function decl(t) { var out = []; for (var k in t) { var n = k.slice(0, 2) === '--' ? k : '--' + k; if (/^--[\w-]+$/.test(n) && !/[;{}<]/.test(String(t[k]))) out.push(n + ':' + t[k]); } return out.join(';'); }
  /** Uygulamanın kendi şemasını (çoğunlukla 'klasik') ekler; seçicide görünür. */
  function registerScheme(id, def) {
    id = String(id || '').toLowerCase().replace(/[^a-z0-9-]/g, ''); if (!id || id === 'falcon' || !def) return;
    var dark = def.dark || def.light, light = def.light || def.dark;
    custom[id] = { label: def.label || id };
    var d = g.document; if (d && d.head) {
      var st = d.getElementById('fc-scheme-' + id) || d.head.appendChild(d.createElement('style'));
      st.id = 'fc-scheme-' + id;
      st.textContent = '[data-scheme="' + id + '"]{' + decl(dark) + ';color-scheme:dark}\n[data-scheme="' + id + '"].theme-light,.theme-light [data-scheme="' + id + '"]{' + decl(light) + ';color-scheme:light}';
    }
    apply();
  }
  function setScheme(id) { if (schemes().indexOf(id) < 0) return; S().set('scheme', id); apply(); }
  function S() { return FC.storage; }
  function T(k, v) { return FC.t ? FC.t(k, v) : k; }
  function theme() { var t = S() && S().get('theme'); return t === 'light' || t === 'auto' ? t : 'dark'; }
  function effective() {
    var t = theme();
    if (t !== 'auto') return t;
    try { return g.matchMedia && g.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (e) { return 'dark'; }
  }
  function clamp(x) { x = Math.round((+x || 1) * 100) / 100; return Math.min(MAX, Math.max(MIN, x)); }
  function scale() { return clamp(S() ? S().get('fontScale', 1) : 1); }
  function apply() {
    var d = g.document && g.document.documentElement; if (!d) return;
    var light = effective() === 'light';
    d.classList.toggle('theme-light', light);
    d.classList.toggle('theme-dark', !light);
    d.setAttribute('data-scheme', scheme());
    d.style.setProperty('--font-scale', String(scale()));
    var m = g.document.querySelector('meta[name="color-scheme"]'); if (m) m.setAttribute('content', light ? 'light' : 'dark');
    subs.slice().forEach(function (f) { try { f({ theme: theme(), effective: effective(), scale: scale(), scheme: scheme() }); } catch (e) {} });
  }
  function setTheme(t) { if (['dark', 'light', 'auto'].indexOf(t) < 0) return; S().set('theme', t); apply(); }
  function toggle() { setTheme(effective() === 'light' ? 'dark' : 'light'); }
  function setScale(x) { S().set('fontScale', clamp(x)); apply(); }
  function bump(dir) { setScale(scale() + dir * STEP); }
  function onChange(f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }

  /** Üst çubuktaki tema düğmesi */
  function themeButton() {
    var ui = FC.ui, b = ui.el('button.icon-btn.theme-btn', { type: 'button' });
    function draw() { var l = effective() === 'light'; b.innerHTML = ui.icon(l ? 'moon' : 'sun'); b.title = T('fc.theme.toggle'); b.setAttribute('aria-label', T('fc.theme.toggle')); }
    b.addEventListener('click', toggle);
    draw(); onChange(draw); if (FC.i18n) FC.i18n.onChange(draw);
    return b;
  }
  /** Tema seçici + A− / A+ (ayarlar kartında ve kurulum sihirbazında kullanılır) */
  function controls() {
    var ui = FC.ui, wrap = ui.el('div');
    function draw() {
      wrap.innerHTML = '';
      var seg = ui.el('div.segmented', { role: 'group', 'aria-label': T('fc.theme') });
      [['dark', 'moon'], ['light', 'sun'], ['auto', 'sync']].forEach(function (x) {
        var b = ui.el('button', { type: 'button', html: ui.icon(x[1]) + ui.esc(T('fc.theme.' + x[0])), 'aria-pressed': String(theme() === x[0]) });
        if (theme() === x[0]) b.className = 'active';
        b.addEventListener('click', function () { setTheme(x[0]); });
        seg.appendChild(b);
      });
      wrap.appendChild(ui.el('div.field', null, [ui.el('span.field-label', { text: T('fc.scheme') }), picker()]));
      wrap.appendChild(ui.el('div.field', null, [ui.el('span.field-label', { text: T('fc.mode') }), seg]));
      var pct = Math.round(scale() * 100) + '%';
      var minus = ui.el('button.btn.small', { type: 'button', title: T('fc.font.smaller'), 'aria-label': T('fc.font.smaller'), dir: 'ltr', text: 'A−', onclick: function () { bump(-1); } });
      var plus = ui.el('button.btn.small', { type: 'button', title: T('fc.font.larger'), 'aria-label': T('fc.font.larger'), dir: 'ltr', html: '<span style="font-size:1.2em">A+</span>', onclick: function () { bump(1); } });
      var reset = ui.el('button.btn.small.ghost', { type: 'button', text: T('fc.font.reset'), onclick: function () { setScale(1); } });
      minus.disabled = scale() <= MIN; plus.disabled = scale() >= MAX;
      wrap.appendChild(ui.el('div.field', null, [ui.el('span.field-label', { text: T('fc.font') }),
        ui.el('div.fc-row', { style: 'margin:0' }, [minus, ui.el('b.ltr', { text: pct, style: 'min-width:48px;text-align:center' }), plus, reset])]));
    }
    draw(); onChange(draw); if (FC.i18n) FC.i18n.onChange(draw);
    return wrap;
  }
  /** Şema seçici: önizleme kutucukları (zemin / panel / ana renk) kendi data-scheme'leriyle boyanır. */
  function picker() {
    var ui = FC.ui, box = ui.el('div.fc-schemes', { role: 'radiogroup', 'aria-label': T('fc.scheme') });
    schemes().forEach(function (id) {
      var on = scheme() === id;
      var b = ui.el('button.fc-scheme' + (on ? '.active' : ''), { type: 'button', role: 'radio', 'aria-checked': String(on), 'data-id': id,
        html: '<span class="fc-swatch" data-scheme="' + ui.esc(id) + '" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="fc-name">' + ui.esc(schemeLabel(id)) + (on ? ui.icon('check') : '') + '</span>' });
      b.addEventListener('click', function () { setScheme(id); });
      box.appendChild(b);
    });
    return box;
  }
  /** Ayarlar kartı: Görünüm (tema, yazı boyutu, dil) */
  function card() {
    var ui = FC.ui, c = ui.card({ key: 'look', title: T('fc.look'), icon: 'type', desc: T('fc.look.desc') });
    c.appendChild(controls());
    var lf = ui.el('div.field', null, [ui.el('span.field-label', { text: T('fc.lang') })]);
    lf.appendChild(langOptions());
    c.appendChild(lf);
    if (FC.i18n) FC.i18n.onChange(function () { c.querySelector('.card-title span').textContent = T('fc.look'); c.querySelector('.card-desc').textContent = T('fc.look.desc'); lf.firstChild.textContent = T('fc.lang'); });
    return c;
  }
  function langOptions() {
    var ui = FC.ui, box = ui.el('div.lang-options', { style: 'margin-top:0' });
    function draw() {
      box.innerHTML = '';
      FC.i18n.langs.forEach(function (l) {
        var on = FC.i18n.lang() === l;
        var b = ui.el('button.lang-option' + (on ? '.active' : ''), { type: 'button', lang: l, html: '<span>' + ui.esc(FC.i18n.names[l]) + '</span>' + (on ? ui.icon('check') : '') });
        b.addEventListener('click', function () { FC.i18n.set(l); });
        box.appendChild(b);
      });
    }
    draw(); FC.i18n.onChange(draw);
    return box;
  }
  function init() {
    apply();
    try { mq = g.matchMedia('(prefers-color-scheme: light)'); var f = function () { if (theme() === 'auto') apply(); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); } catch (e) {}
  }
  var api = { init: init, apply: apply, scheme: scheme, setScheme: setScheme, schemes: schemes, schemeLabel: schemeLabel, registerScheme: registerScheme, picker: picker, BUILTIN: BUILTIN, theme: theme, effective: effective, setTheme: setTheme, toggle: toggle, scale: scale, setScale: setScale, bump: bump, onChange: onChange, themeButton: themeButton, controls: controls, card: card, langOptions: langOptions, MIN: MIN, MAX: MAX };
  FC.look = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- progress.js ---- */
/* FC.progress — ortak indirme ilerlemesi: ölçüm, biçim ve görünüm.
   Gösterilen: yüzde, "X,X MB / Y,Y MB", "kalan Z,Z MB", hız "N,N MB/sn"; yama kipinde ayrıca "yalnızca değişen kısımlar".
     const tr = FC.progress.tracker(total);  const p = tr.update(doneBytes);
     FC.progress.format(p, {patch:true}).detail
     const bytes = await FC.progress.download(url, {total, onProgress: p => box.set(p)});
     const box = FC.progress.box(); parent.appendChild(box.el); */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var MB = 1048576;
  function T(k, v, l) { return FC.t ? FC.t(k, v, l) : k; }
  function lang(l) { return l || (FC.i18n ? FC.i18n.lang() : 'tr'); }
  function num(n, d, l) { return FC.i18n ? FC.i18n.num(n, d, l) : Number(n).toFixed(d); }

  /** Hız son ~3 saniyedeki örneklerle hesaplanır (kayan pencere); now() testte verilebilir. */
  function tracker(total, now) {
    now = now || function () { return Date.now(); };
    var t0 = now(), samples = [{ t: t0, b: 0 }], done = 0;
    return {
      update: function (d, finished) {
        done = Math.max(0, +d || 0);
        var t = now();
        samples.push({ t: t, b: done });
        while (samples.length > 2 && t - samples[0].t > 3000) samples.shift();
        var a = samples[0], sec = (t - a.t) / 1000;
        var speed = sec >= 0.25 ? (done - a.b) / sec : 0;
        var tot = total && done <= total ? total : (finished ? done : 0);
        return { done: done, total: tot, pct: tot ? Math.min(100, done / tot * 100) : 0, remaining: tot ? Math.max(0, tot - done) : 0, speed: Math.max(0, speed), finished: !!finished };
      },
      setTotal: function (n) { total = +n || 0; }
    };
  }
  function mb(bytes, l) { return num(bytes / MB, 1, l) + ' MB'; }
  function pct(p, l) { var n = Math.floor(p); return lang(l) === 'tr' ? '%' + n : n + '%'; }
  /** p → {percent, pctText, sizeText, leftText, speedText, modeText, detail} */
  function format(p, o) {
    o = o || {}; var l = lang(o.lang);
    var r = { percent: p.total ? Math.floor(p.pct) : null, pctText: '', sizeText: '', leftText: '', speedText: '', modeText: o.patch ? T('fc.update.patchMode', null, l) : '' };
    if (p.finished) {
      r.percent = 100; r.pctText = pct(100, l); r.sizeText = p.total ? mb(p.total, l) : '';
      r.detail = [T('fc.p.done', null, l), r.sizeText, r.modeText].filter(Boolean).join(' · ');
      return r;
    }
    if (p.total) {
      r.pctText = pct(p.pct, l);
      r.sizeText = mb(p.done, l) + ' / ' + mb(p.total, l);
      r.leftText = T('fc.p.left', { x: mb(p.remaining, l) }, l);
    } else r.sizeText = mb(p.done, l);
    r.speedText = p.speed > 0 ? num(p.speed / MB, 1, l) + ' ' + T('fc.p.speed', null, l) : T('fc.p.calc', null, l);
    r.detail = [r.pctText, r.sizeText, r.leftText, r.speedText].filter(Boolean).join(' · ');
    return r;
  }
  function concat(parts, n) { var out = new Uint8Array(n), k = 0; for (var i = 0; i < parts.length; i++) { out.set(parts[i], k); k += parts[i].length; } return out; }
  /** Akışlı indirme. o.total biliniyorsa (manifestteki size) onu kullanır; gzip'li yanıtta Content-Length güvenilmez. */
  async function download(url, o) {
    o = o || {};
    var f = o.fetch || g.fetch;
    var res = await f(url, { cache: 'no-store', signal: o.signal, redirect: 'follow' });
    if (!res.ok) { var e = new Error('HTTP ' + res.status); e.code = 'HTTP_' + res.status; throw e; }
    var hdr = +(res.headers && res.headers.get && res.headers.get('content-length')) || 0;
    var enc = (res.headers && res.headers.get && res.headers.get('content-encoding')) || '';
    var total = o.total || (/gzip|br|deflate/i.test(enc) ? 0 : hdr);
    var tr = tracker(total, o.now), cb = o.onProgress || function () {};
    if (!res.body || !res.body.getReader) {
      var all = new Uint8Array(await res.arrayBuffer()); tr.setTotal(total || all.length);
      cb(tr.update(all.length, true)); return all;
    }
    var rd = res.body.getReader(), parts = [], n = 0, last = 0;
    cb(tr.update(0));
    for (;;) {
      var x = await rd.read(); if (x.done) break;
      parts.push(x.value); n += x.value.length;
      var t = Date.now(); if (t - last > 150) { last = t; cb(tr.update(n)); }
    }
    if (!total) tr.setTotal(n);
    cb(tr.update(n, true));
    return concat(parts, n);
  }
  /** Görünüm: başlık + çubuk + ayrıntı satırı (+ yama etiketi). Falcon .update-float içinde kullanılır. */
  function box() {
    var ui = FC.ui;
    var title = ui.el('strong'), mode = ui.el('span.update-mode'), bar = ui.el('div.update-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, [ui.el('span')]);
    var detail = ui.el('div.update-detail', { 'aria-live': 'polite' });
    var el = ui.el('div.fc-progress', { style: 'display:grid;gap:8px' }, [title, mode, bar, detail]);
    mode.hidden = true;
    return {
      el: el,
      title: function (s) { title.textContent = s; },
      set: function (p, o) {
        var f = format(p, o);
        bar.classList.toggle('indet', f.percent === null);
        bar.firstChild.style.width = (f.percent || 0) + '%';
        if (f.percent !== null) bar.setAttribute('aria-valuenow', String(f.percent));
        detail.textContent = f.detail;
        mode.textContent = f.modeText; mode.hidden = !f.modeText;
      },
      busy: function (s) { title.textContent = s; bar.classList.add('indet'); detail.textContent = ''; mode.hidden = true; }
    };
  }
  var api = { tracker: tracker, format: format, download: download, box: box, mb: mb };
  FC.progress = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- updater.js ---- */
/* FC.updater — GitHub Releases latest.json ile tek tuşla güncelleme (SPEC "Güncelleme manifesti" / "Yama kuralları").
     FC.updater.start({repo:'falcon-ofis', app:'falcon-ofis', version:'1.56.0'})   // açılışta + 6 saatte bir denetler
     FC.updater.run()        // "Güncelle": indir → SHA-256 doğrula → kabuğa ver (yama hata verirse kendiliğinden tam dosya)
     FC.updater.subscribe(state => ...)
   Kanal: cfg.channel || FC.host.update.channel (electron: win-app, android: android). "Atla" yoktur; yeni sürüm hep önerilir.
   Kabuk dosyayı değiştirir: FC.host.update.applyPatch(bytes, meta) / installFull(bytes, meta); meta.targetSha256 = tam dosyanın SHA'sı.
   Ya da kabuk hepsini kendisi yapar: FC.host.update.run(plan, ilerleme) (Android Java; bkz. run()). */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var OWNER = 'departures-mil';
  var cfg = {}, timer = null, subs = [], running = false;
  var state = { status: 'idle', current: '', plan: null, progress: null, mode: null, error: null, checkedAt: null };

  /* ---------- saf yardımcılar (test edilir) ---------- */
  function parse(v) {
    var m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(v || '').trim());
    return m ? { n: [+m[1], +m[2], +m[3]], pre: m[4] || '' } : null;
  }
  function cmp(a, b) {
    var x = parse(a), y = parse(b);
    if (!x || !y) throw new Error('BAD_VERSION');
    for (var i = 0; i < 3; i++) if (x.n[i] !== y.n[i]) return x.n[i] < y.n[i] ? -1 : 1;
    if (x.pre === y.pre) return 0;
    if (!x.pre) return 1; if (!y.pre) return -1;
    return x.pre < y.pre ? -1 : 1;
  }
  function assetUrl(o, version, file) { return 'https://github.com/' + (o.owner || OWNER) + '/' + o.repo + '/releases/download/v' + version + '/' + encodeURIComponent(file); }
  function manifestUrl(o) { return o.manifestUrl || 'https://github.com/' + (o.owner || OWNER) + '/' + o.repo + '/releases/latest/download/latest.json'; }
  function goodAsset(a) { return a && typeof a.file === 'string' && a.file && /^[0-9a-f]{64}$/i.test(a.sha256 || '') && +a.size > 0; }

  /** Manifestten ne indirileceğini seçer. Döner: null (güncel) ya da {version, notes, channel, mode:'patch'|'full', file, size, sha256, url, full:{...}} */
  function plan(man, o) {
    if (!man || man.schema !== 1 || !parse(man.version)) throw Object.assign(new Error('BAD_MANIFEST'), { code: 'BAD_MANIFEST' });
    if (o.app && man.app && man.app !== o.app) throw Object.assign(new Error('WRONG_APP'), { code: 'WRONG_APP' });
    if (cmp(man.version, o.version) <= 0) return null;
    var assets = man.assets || {}, ch = o.channel, belowMin = !!(man.minVersion && parse(man.minVersion) && cmp(o.version, man.minVersion) < 0);
    if (belowMin && o.setupChannel && goodAsset(assets[o.setupChannel])) ch = o.setupChannel;
    var a = assets[ch];
    if (!goodAsset(a)) throw Object.assign(new Error('NO_CHANNEL'), { code: 'NO_CHANNEL', channel: ch });
    var full = { file: a.file, size: +a.size, sha256: a.sha256.toLowerCase(), url: assetUrl(o, man.version, a.file) };
    var p = !belowMin && a.patches && a.patches[normVer(o.version)];
    var r = { version: normVer(man.version), notes: man.notes || {}, published: man.published || '', channel: ch, belowMin: belowMin, full: full, targetSha256: full.sha256, targetSize: full.size };
    if (goodAsset(p) && +p.size < full.size) {
      r.mode = 'patch'; r.file = p.file; r.size = +p.size; r.sha256 = p.sha256.toLowerCase(); r.url = assetUrl(o, man.version, p.file);
    } else { r.mode = 'full'; r.file = full.file; r.size = full.size; r.sha256 = full.sha256; r.url = full.url; }
    return r;
  }
  function normVer(v) { return String(v).replace(/^v/, ''); }
  async function sha256(bytes) {
    var c = g.crypto && g.crypto.subtle;
    if (!c) throw Object.assign(new Error('NO_CRYPTO'), { code: 'NO_CRYPTO' });
    var h = new Uint8Array(await c.digest('SHA-256', bytes));
    var s = ''; for (var i = 0; i < h.length; i++) s += (h[i] < 16 ? '0' : '') + h[i].toString(16);
    return s;
  }

  /* ---------- durum ---------- */
  function set(p) { for (var k in p) state[k] = p[k]; var s = snapshot(); subs.slice().forEach(function (f) { try { f(s); } catch (e) {} }); }
  function snapshot() { var o = {}; for (var k in state) o[k] = state[k]; return o; }
  function subscribe(f) { subs.push(f); try { f(snapshot()); } catch (e) {} return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
  function host() { return FC.host || { kind: 'browser', can: {}, update: {} }; }
  function opts() {
    var h = host();
    return { repo: cfg.repo, owner: cfg.owner, app: cfg.app || cfg.repo, version: normVer(cfg.version || (h.version && h.version()) || '0.0.0'), channel: cfg.channel || (h.update && h.update.channel) || 'win-app', setupChannel: cfg.setupChannel, manifestUrl: cfg.manifestUrl };
  }
  function fetchFn() { return cfg.fetch || g.fetch; }
  function online() { return !(g.navigator && g.navigator.onLine === false); }
  async function getBytes(url, o) {
    var h = host();
    if (!cfg.fetch && h.net && h.net.download) {
      var tr = FC.progress.tracker(o.total);
      var b = await h.net.download(url, function (d) { if (o.onProgress) o.onProgress(tr.update(d.done != null ? d.done : d, d.finished)); });
      return b instanceof Uint8Array ? b : new Uint8Array(b);
    }
    return FC.progress.download(url, { total: o.total, onProgress: o.onProgress, fetch: fetchFn() });
  }
  async function loadManifest() {
    var o = opts(), url = manifestUrl(o);
    if (!cfg.fetch && host().net && host().net.download) {
      /* Kabuk indirmesinde de 404 (henüz yayın yok) "güncel" sayılır. Electron IPC hata kodunu iletide taşır
         ("Error invoking remote method 'fc:net:download': Error: HTTP_404"); kod iletiden çıkarılır. */
      var b;
      try { b = await host().net.download(url, function () {}); }
      catch (e) {
        var txt = String((e && (e.code || '')) || '') + ' ' + String((e && e.message) || e || '');
        if (/HTTP_404\b/.test(txt)) return null;
        var m = /(HTTP_\d+|URL_NOT_ALLOWED)/.exec(txt);
        if (m && !(e && e.code)) throw Object.assign(new Error(m[1]), { code: m[1] });
        throw e;
      }
      return JSON.parse(new TextDecoder().decode(b));
    }
    var r = await fetchFn()(url, { cache: 'no-store' });
    if (r.status === 404) return null;   // henüz yayın yok
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { code: 'HTTP_' + r.status });
    return r.json();
  }

  /** Denetle. {silent:true} arka plan denetimi: hata kullanıcıya gösterilmez. */
  async function check(o) {
    o = o || {};
    if (running || state.status === 'checking' || state.status === 'queued' || state.status === 'ready') return state.plan;
    if (!cfg.repo && !cfg.manifestUrl) return null;
    if (!online()) { if (!o.silent) set({ error: 'OFFLINE' }); return state.plan; }
    var prev = state.status;
    if (!o.silent) set({ status: 'checking', error: null });
    try {
      var man = await loadManifest(), op = opts();
      var p = man ? plan(man, op) : null;
      if (p && FC.storage) FC.storage.set('whatsnew.pending', { version: p.version, notes: p.notes });
      var bgOk = p && canBackground();
      set({ status: p ? (bgOk ? 'queued' : 'available') : 'none', plan: p, current: op.version, checkedAt: new Date().toISOString(), error: null });
      if (bgOk) setTimeout(function () { background(p); }, 0);
      return p;
    } catch (e) {
      set({ status: o.silent ? (prev === 'checking' ? 'idle' : prev) : 'error', error: e.code || e.message || 'ERR' });
      return null;
    } finally { if (state.status === 'checking') set({ status: 'idle' }); }
  }

  async function fetchVerified(item, mode) {
    set({ status: 'downloading', mode: mode, progress: { done: 0, total: item.size, pct: 0, remaining: item.size, speed: 0 } });
    var bytes = await getBytes(item.url, { total: item.size, onProgress: function (p) { set({ progress: p }); } });
    set({ status: 'verifying' });
    if (bytes.length !== item.size || (await sha256(bytes)) !== item.sha256) throw Object.assign(new Error('BAD_HASH'), { code: 'BAD_HASH' });
    return bytes;
  }
  /* ---------- otomatik (arka plan) güncelleme ----------
     Kabuk "hazırla, kapanınca kur" destekliyorsa (FC.host.update.deferred: Electron) ve cfg.autoInstall !== false:
     yeni sürüm bulununca kullanıcıya hiçbir şey sorulmadan arka planda indirilir, doğrulanır ve hazırlanır (status 'ready').
     Program kapanınca kabuk pencere açmadan kurar; bir sonraki açılışta yeni sürüm gelir ("neler yeni" gösterilir).
     Güncelle düğmesi o an basılırsa hazır güncelleme hemen kurulur ve program yeniden açılır. Hata olursa sessizce 'available'a döner. */
  function canBackground() {
    var h = host(), hu = h.update || {};
    return cfg.autoInstall !== false && !!(h.can && h.can.update && hu.deferred && hu.applyStaged && hu.applyPatch && hu.installFull);
  }
  async function background(p) {
    if (running || state.status === 'ready') return;
    running = true; set({ bg: true, error: null, fallback: false, patchError: null });
    var h = host(), meta = { version: p.version, channel: p.channel, targetSha256: p.targetSha256, targetSize: p.targetSize, file: p.full.file, deferred: true };
    try {
      var r = null;
      if (p.mode === 'patch') {
        try { var pb = await fetchVerified(p, 'patch'); set({ status: 'installing' }); r = await h.update.applyPatch(pb, Object.assign({ patchSha256: p.sha256 }, meta)); }
        catch (e) { set({ fallback: true, patchError: e.code || e.message }); r = null; }
      }
      if (r !== 'staged') { var fb = await fetchVerified(p.full, 'full'); set({ status: 'installing' }); r = await h.update.installFull(fb, meta); }
      if (r !== 'staged') throw Object.assign(new Error('NOT_STAGED'), { code: 'NOT_STAGED' });
      set({ status: 'ready', plan: p, progress: null });
    } catch (e) {
      set({ status: 'available', error: null, bgError: e.code || e.message || 'ERR' });
    } finally { running = false; set({ bg: false }); }
  }
  /** Tek tuş: her şeyi yapar. Yama yolunda herhangi bir hata → tam dosya. Hazırlanmış güncelleme varsa hemen kurar. */
  async function run() {
    if (running) return;
    var h = host();
    if (state.status === 'ready' && h.update && h.update.applyStaged) {
      try { set({ status: 'restarting' }); await h.update.applyStaged(); return 'staged'; }
      catch (e) { set({ status: 'available' }); }
    }
    var p = state.plan || (await check());
    if (!p) return;
    if (state.status === 'ready') return run();
    if (!h.can || !h.can.update) {
      set({ status: 'available' });
      FC.ui && FC.ui.openUrl('https://github.com/' + (cfg.owner || OWNER) + '/' + cfg.repo + '/releases/latest');
      return 'browser';
    }
    running = true; set({ error: null, fallback: false, patchError: null });
    var meta = { version: p.version, channel: p.channel, targetSha256: p.targetSha256, targetSize: p.targetSize, file: p.full.file };
    if (FC.storage) FC.storage.set('whatsnew.pending', { version: p.version, notes: p.notes });
    /* Yerel kabuk indirme + yama + kurulumu kendisi yapabiliyorsa (Android Java: WebView'de CORS yok, büyük APK JS'ye taşınmaz;
       ortak ApkPatchInstaller: kurulu APK + yama → yeni APK, hata olursa tam APK): FC.host.update.run(plan, ilerleme).
       ilerleme olayları: {patch:bool, done, total, finished} | {patchFailed:true, error} | {installing:true}.
       Döner: 'restarting' | 'done' | 'patch' | 'full' (ya da Promise). Hata → durum 'error'. */
    if (h.update && typeof h.update.run === 'function') {
      try {
        var tr = null, curMode = null;
        set({ status: 'downloading', mode: p.mode, progress: { done: 0, total: p.size, pct: 0, remaining: p.size, speed: 0 } });
        var rn = await h.update.run(p, function (ev) {
          if (!ev) return;
          if (ev.patchFailed) { set({ fallback: true, patchError: ev.error || 'PATCH' }); return; }
          if (ev.installing) { set({ status: 'installing' }); return; }
          var m = ev.patch ? 'patch' : 'full';
          if (!tr || m !== curMode) { tr = FC.progress.tracker(ev.total || (m === 'patch' ? p.size : p.full.size)); curMode = m; }
          set({ status: 'downloading', mode: m, progress: tr.update(ev.done || 0, ev.finished) });
        });
        set({ status: rn === 'restarting' ? 'restarting' : 'done' });
        return rn || 'native';
      } catch (e) {
        set({ status: 'error', error: e.code || e.message || 'ERR' });
        throw e;
      } finally { running = false; }
    }
    try {
      if (p.mode === 'patch') {
        try {
          var pb = await fetchVerified(p, 'patch');
          set({ status: 'installing' });
          var r1 = await h.update.applyPatch(pb, Object.assign({ patchSha256: p.sha256 }, meta));
          set({ status: r1 === 'restarting' ? 'restarting' : 'done' });
          return 'patch';
        } catch (e) {
          set({ fallback: true, patchError: e.code || e.message });
        }
      }
      var fb = await fetchVerified(p.full, 'full');
      set({ status: 'installing' });
      var r2 = await h.update.installFull(fb, meta);
      set({ status: r2 === 'restarting' ? 'restarting' : 'done' });
      return 'full';
    } catch (e) {
      set({ status: 'error', error: e.code || e.message || 'ERR' });
      throw e;
    } finally { running = false; }
  }

  function start(c) {
    cfg = c || {};
    if (timer) clearInterval(timer);
    var ms = Math.max(1, cfg.intervalHours || 6) * 3600000;
    set({ current: opts().version });
    if (cfg.autoCheck !== false) {
      setTimeout(function () { check({ silent: true }); }, cfg.firstDelayMs == null ? 6000 : cfg.firstDelayMs);
      timer = setInterval(function () { check({ silent: true }); }, ms);
      if (g.addEventListener) g.addEventListener('online', function () { if (state.status !== 'available') check({ silent: true }); });
    }
    return api;
  }
  function errorText(code) {
    var t = FC.t || function (k) { return k; };
    if (code === 'BAD_HASH') return t('fc.update.bad');
    if (code === 'OFFLINE') return t('fc.update.offline');
    return t('fc.update.failed', { e: code });
  }
  var api = { start: start, check: check, run: run, subscribe: subscribe, state: snapshot, errorText: errorText, plan: plan, cmp: cmp, parse: parse, sha256: sha256, manifestUrl: manifestUrl, assetUrl: assetUrl, _reset: function () { cfg = {}; subs = []; running = false; state = { status: 'idle', current: '', plan: null, progress: null, mode: null, error: null, checkedAt: null }; if (timer) clearInterval(timer); timer = null; }, _config: function (c) { cfg = c; } };
  FC.updater = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- contact.js ---- */
/* FC.contact — "Admin ile iletişim" kartı ve yöneticinin gelen kutusu (SPEC "Admin gelen kutusu").
     FC.contact.init({app:'falcon-ofis', version:'1.56.0'})
     FC.contact.mount(ayarlarKapsayicisi)     // kart kapsayıcının SON kartı olur ve öyle kalır
     FC.contact.send({tur:'oneri'|'hata', mesaj, iletisim})  → 'sent' | 'queued'
   Firestore REST (proje comm-calc-103111111, koleksiyon mesajlar, yalnız ekleme). Gönderilemeyen yerel kuyruğa alınır,
   internet gelince yeniden denenir. Programda hiçbir kişisel e-posta adresi bulunmaz (yedek e-posta yolu yok).
   Çökme raporları da yalnız gelen kutusuna gider. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var INBOX = 'https://firestore.googleapis.com/v1/projects/comm-calc-103111111/databases/(default)/documents/mesajlar?key=AIzaSyB12RFS6ENPpmnnPsETfjedNH-3hmNWQvA';
  var QKEY = 'contact.queue', MAXQ = 30;
  var cfg = { app: '', version: '' }, flushing = false, subs = [];
  function T(k, v) { return FC.t(k, v); }
  function S() { return FC.storage; }
  function deviceId() {
    var id = S().get('device');
    if (!id) {
      var b = new Uint8Array(9); try { g.crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 9; i++) b[i] = Math.random() * 256 | 0; }
      id = Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
      S().set('device', id);
    }
    return id;
  }
  function platform() {
    var h = FC.host || {}, nav = g.navigator || {};
    var os = /Android/i.test(nav.userAgent || '') ? 'android' : /Win/i.test(nav.platform || nav.userAgent || '') ? 'windows' : /Mac/i.test(nav.platform || '') ? 'mac' : /Linux/i.test(nav.platform || '') ? 'linux' : 'web';
    return (h.kind || 'browser') + '/' + (h.platform && h.platform !== 'web' ? h.platform : os);
  }
  function version() { try { return String(typeof cfg.version === 'function' ? cfg.version() : cfg.version || (FC.host && FC.host.version()) || ''); } catch (e) { return ''; } }
  /** SPEC alanları; hepsi stringValue */
  function fields(o) {
    var f = {
      tur: o.tur || 'oneri', uygulama: cfg.app || '', surum: version(), platform: platform(),
      dil: FC.i18n ? FC.i18n.lang() : 'tr', mesaj: String(o.mesaj || '').slice(0, 5000), zaman: new Date().toISOString(), cihaz: deviceId()
    };
    if (o.iletisim) f.iletisim = String(o.iletisim).slice(0, 160);
    return f;
  }
  function fetchFn() { return cfg.fetch || g.fetch; }
  function inbox(f) {
    var body = { fields: {} };
    Object.keys(f).forEach(function (k) { body.fields[k] = { stringValue: String(f[k]) }; });
    return fetchFn()(INBOX, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok; }, function () { return false; });
  }
  /* Yedek e-posta yolu kaldırıldı: programda hiçbir kişisel adres bulunmaz. Gelen kutusuna ulaşılamayan mesaj kuyrukta bekler, sonra yeniden denenir. */
  function mail() { return Promise.resolve(false); }
  function deliver(item) {
    return inbox(item.f).then(function (ok) {
      if (ok) return true;
      return item.mail ? mail(item.f) : false;
    });
  }
  function queue() { var q = S().get(QKEY, []); return Array.isArray(q) ? q : []; }
  function setQueue(q) { S().set(QKEY, q.slice(-MAXQ)); subs.forEach(function (f) { try { f(q.length); } catch (e) {} }); }
  function enqueue(item) { var q = queue(); q.push(item); setQueue(q); }
  function online() { return !(g.navigator && g.navigator.onLine === false); }
  /** Ham gönderim (çökme raporu da bunu kullanır). mail: yedek e-posta kullanılsın mı */
  function post(o, opt) {
    var item = { f: fields(o), mail: !!(opt && opt.mail) };
    if (!online()) { enqueue(item); return Promise.resolve('queued'); }
    return deliver(item).then(function (ok) { if (ok) { flush(); return 'sent'; } enqueue(item); return 'queued'; });
  }
  function send(o) { return post({ tur: o.tur === 'hata' ? 'hata' : 'oneri', mesaj: o.mesaj, iletisim: o.iletisim }, { mail: true }); }
  function flush() {
    if (flushing || !online()) return Promise.resolve();
    var q = queue(); if (!q.length) return Promise.resolve();
    flushing = true;
    return deliver(q[0]).then(function (ok) {
      flushing = false;
      if (!ok) return;
      var rest = queue(); rest.shift(); setQueue(rest);
      return flush();
    }, function () { flushing = false; });
  }

  /** Kartı kur; kapsayıcıya sonradan kart eklense de bu kart en sonda kalır. */
  function mount(container) {
    if (!container) return null;
    var ui = FC.ui, el = ui.el, old = container.querySelector('[data-fc-card="contact"]');
    if (old) old.remove();
    var c = ui.card({ key: 'contact', id: 'fc-contact', title: '', icon: 'mail' });
    function draw() {
      var keep = c.querySelector('textarea') ? { m: c.querySelector('textarea').value, r: c.querySelector('input').value, t: c.querySelector('select').value } : null;
      c.innerHTML = '';
      c.appendChild(el('h3.card-title', { html: ui.icon('mail') + '<span>' + ui.esc(T('fc.contact.title')) + '</span>' }));
      c.appendChild(el('p.card-desc', { text: T('fc.contact.desc') }));
      var type = el('select', null, [el('option', { value: 'oneri', text: T('fc.contact.oneri') }), el('option', { value: 'hata', text: T('fc.contact.hata') })]);
      var reach = el('input', { type: 'text', dir: 'auto', maxlength: '160', autocomplete: 'email', placeholder: T('fc.contact.reach') });
      var msg = el('textarea', { rows: '5', dir: 'auto', maxlength: '5000', placeholder: T('fc.contact.msg') });
      if (keep) { msg.value = keep.m; reach.value = keep.r; type.value = keep.t; }
      var st = el('div.field-hint', { role: 'status', 'aria-live': 'polite' });
      var btn = el('button.btn.primary', { type: 'button', html: ui.icon('mail') + ui.esc(T('fc.contact.send')) });
      c.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.contact.type') }), type]));
      c.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.contact.msg') }), msg]));
      c.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.contact.reach') }), reach]));
      c.appendChild(el('div.fc-row', null, [btn, st]));
      c.appendChild(el('p.field-hint', { text: T('fc.contact.privacy'), style: 'margin:12px 0 0' }));
      var n = queue().length; if (n) st.textContent = T('fc.contact.waiting', { n: n });
      btn.addEventListener('click', function () {
        var m = msg.value.trim();
        if (!m) { st.textContent = T('fc.contact.empty'); msg.classList.add('invalid'); msg.focus(); return; }
        msg.classList.remove('invalid');
        btn.disabled = true; st.textContent = T('fc.contact.sending');
        send({ tur: type.value, mesaj: m, iletisim: reach.value.trim() }).then(function (r) {
          msg.value = '';
          st.textContent = T(r === 'sent' ? 'fc.contact.ok' : 'fc.contact.queued');
          if (FC.ui.toast) FC.ui.toast(st.textContent, r === 'sent' ? '' : 'info');
        }).then(function () { btn.disabled = false; });
      });
    }
    draw(); FC.i18n.onChange(draw);
    container.appendChild(c);
    // son kart kalsın
    if (g.MutationObserver) new g.MutationObserver(function () { if (container.lastElementChild !== c && c.isConnected !== false && c.parentNode === container) container.appendChild(c); }).observe(container, { childList: true });
    return c;
  }
  function init(c) {
    for (var k in c) cfg[k] = c[k];
    if (g.addEventListener && !init.done) { init.done = true; g.addEventListener('online', function () { setTimeout(flush, 1500); }); setTimeout(flush, 5000); }
    return api;
  }
  var api = { init: init, mount: mount, send: send, post: post, flush: flush, queue: queue, onQueue: function (f) { subs.push(f); }, _fields: fields, _deviceId: deviceId };
  FC.contact = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- crash.js ---- */
/* FC.crash — beklenmeyen hataları yöneticiye bildirir (tur:"cokme").
     FC.crash.init({app:'falcon-ofis', version:'1.56.0'})
   window.onerror + unhandledrejection + kabuğun ana süreç hataları (FC.host.onMainError).
   Aynı hata imzası (sürüm başına) bir kez; günde en çok 5 rapor. Yalnızca hata metni, yığın, uygulama, sürüm, platform gider;
   metin içindeki e-posta, yol içindeki kullanıcı adı, URL sorguları, uzun sayılar ve tırnak içi veriler maskelenir. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var MAX_DAY = 5;
  var IGNORE = /ResizeObserver loop|^Script error\.?$|Failed to fetch|NetworkError|Load failed|network error|AbortError|The user aborted|permission-denied|QuotaExceeded|ERR_INTERNET_DISCONNECTED/i;
  var cfg = { app: '', version: '', now: null }, installed = false;
  function S() { return FC.storage; }
  function T(k, v) { return FC.t(k, v); }
  function now() { return cfg.now ? cfg.now() : new Date(); }
  function day() { return now().toISOString().slice(0, 10); }

  function sanitize(s, max) {
    s = String(s == null ? '' : s);
    s = s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>')
      .replace(/(https?:\/\/[^\s?#'")]+)[?#][^\s'")]*/g, '$1')
      .replace(/([A-Za-z]:[\\/]Users[\\/])[^\\/\s]+/gi, '$1<user>')
      .replace(/(\/(?:home|Users)\/)[^/\s]+/g, '$1<user>')
      .replace(/(\/storage\/emulated\/\d+\/)[^\s]*/g, '$1<path>')
      .replace(/\d{6,}/g, '<n>')
      .replace(/(["'`])((?:(?!\1).){0,400})\1/g, function (m, q, inner) { return /^[\w$.\-[\]]{0,40}$/.test(inner) ? m : q + '…' + q; });
    return s.slice(0, max || 600);
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
  /** İmza: maskelenmiş ileti + yığının ilk iki çerçevesi (satır/sütun hariç, derleme farkı imzayı bozmasın) */
  function signature(msg, stack) {
    var frames = String(stack || '').split('\n').slice(1, 3).map(function (l) { return l.trim().replace(/:\d+:\d+\)?$/, ''); }).join('|');
    return hash(sanitize(msg, 300) + '|' + frames);
  }
  /** Göndermeli mi? Gönderecekse sayaçları günceller. */
  function decide(sig) {
    if (S().get('crash.enabled', true) === false) return false;
    var key = String(cfg.version || '') + ':' + sig;
    var seen = S().get('crash.seen', []); if (!Array.isArray(seen)) seen = [];
    if (seen.indexOf(key) >= 0) return false;
    var d = S().get('crash.day', null), today = day();
    if (!d || d.d !== today) d = { d: today, n: 0 };
    if (d.n >= MAX_DAY) return false;
    d.n++; S().set('crash.day', d);
    seen.push(key); S().set('crash.seen', seen.slice(-200));
    return true;
  }
  function report(err, o) {
    o = o || {};
    var msg = err && (err.message || err.reason) || String(err || '');
    var stack = err && err.stack || '';
    if (!msg || IGNORE.test(msg)) return false;
    var sig = signature(msg, stack);
    if (!decide(sig)) return false;
    var text = '[' + (o.source || 'ui') + '] ' + sanitize(msg, 600) + (stack ? '\n\n' + sanitize(stack, 1800) : '') + '\n\n#' + sig;
    if (FC.contact) FC.contact.post({ tur: 'cokme', mesaj: text }, { mail: false });
    return true;
  }
  function install() {
    if (installed || !g.addEventListener) return; installed = true;
    g.addEventListener('error', function (e) {
      if (!e || (!e.error && !e.message)) return;   // kaynak yükleme hatası (img/script) → çökme değil
      report(e.error || { message: e.message, stack: (e.filename || '') + ':' + (e.lineno || '') }, { source: 'ui' });
    });
    g.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason; if (!r) return;
      if (r.code && /^(permission-denied|unavailable|resource-exhausted|auth\/|HTTP_|OFFLINE)/.test(String(r.code))) return;
      report(typeof r === 'object' ? r : { message: String(r) }, { source: 'promise' });
    });
    try { if (FC.host && FC.host.onMainError) FC.host.onMainError(function (e) { report(e, { source: 'main' }); }); } catch (e) {}
  }
  function init(c) { for (var k in c) cfg[k] = c[k]; install(); return api; }
  function sentToday() { var d = S().get('crash.day', null); return d && d.d === day() ? d.n : 0; }
  /** Ayarlar kartı: aç/kapat */
  function card() {
    var ui = FC.ui, c = ui.card({ key: 'crash', title: '', icon: 'bug' });
    function draw() {
      c.innerHTML = '';
      c.appendChild(ui.el('h3.card-title', { html: ui.icon('bug') + '<span>' + ui.esc(T('fc.crash.title')) + '</span>' }));
      c.appendChild(ui.el('p.card-desc', { text: T('fc.crash.desc') }));
      var cb = ui.el('input', { type: 'checkbox' }); cb.checked = S().get('crash.enabled', true) !== false;
      cb.addEventListener('change', function () { S().set('crash.enabled', cb.checked); });
      c.appendChild(ui.el('label.check', null, [cb, ui.el('span', { text: T('fc.crash.on') })]));
      c.appendChild(ui.el('p.field-hint', { text: T('fc.crash.sent', { n: sentToday() }), style: 'margin:10px 0 0' }));
    }
    draw(); FC.i18n.onChange(draw);
    return c;
  }
  var api = { init: init, report: report, card: card, sentToday: sentToday, _sanitize: sanitize, _signature: signature, _decide: decide, _config: function (c) { cfg = c; } , MAX_DAY: MAX_DAY };
  FC.crash = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- usage.js ---- */
/* FC.usage — "Kullanım Limitleri" kartı. Kullanıcının KENDİ Firebase'indeki bugünkü okuma/yazma/silme sayısı
   (ücretsiz Spark planı günlük sınırı: 50k okuma / 20k yazma / 20k silme) ve sağlayıcı başına yapay zeka çağrıları.
     FC.usage.count('firebase.read', 3)   FC.usage.count('ai.gemini')   FC.usage.count('firebase.full')  (kota hatası)
     FC.usage.wrapFetch()                 // isteğe bağlı: fetch ile yapılan Firestore REST ve AI çağrılarını kendisi sayar
     ayarlar.appendChild(FC.usage.card({project: () => 'proje-id'}))
   Gün Pasifik saatiyle gece yarısı döner (Firestore ve Gemini ücretsiz katmanı böyle sıfırlanır). */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var LIMIT = { read: 50000, write: 20000, 'delete': 20000 };
  var TZ = 'America/Los_Angeles', KEY = 'usage';
  var PROVIDERS = {
    gemini: { name: 'Google Gemini', limits: 'https://ai.google.dev/gemini-api/docs/rate-limits', host: /generativelanguage\.googleapis\.com/ },
    openai: { name: 'OpenAI', limits: 'https://platform.openai.com/settings/organization/limits', host: /api\.openai\.com/ },
    anthropic: { name: 'Anthropic Claude', limits: 'https://console.anthropic.com/settings/limits', host: /api\.anthropic\.com/ },
    groq: { name: 'Groq', limits: 'https://console.groq.com/settings/limits', host: /api\.groq\.com/ }
  };
  var subs = [], cfg = { now: null };
  function S() { return FC.storage; }
  function T(k, v) { return FC.t(k, v); }
  function now() { return cfg.now ? cfg.now() : new Date(); }
  function pacific(d) {
    try {
      var o = {}; new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
      return o;
    } catch (e) { var u = new Date(d.getTime() - 8 * 3600000); return { year: u.getUTCFullYear(), month: ('0' + (u.getUTCMonth() + 1)).slice(-2), day: ('0' + u.getUTCDate()).slice(-2), hour: u.getUTCHours(), minute: u.getUTCMinutes(), second: u.getUTCSeconds() }; }
  }
  function today() { var p = pacific(now()); return p.year + '-' + p.month + '-' + p.day; }
  function msToReset() { var p = pacific(now()); return Math.max(0, 86400000 - (((+p.hour % 24) * 3600 + (+p.minute) * 60 + (+p.second)) * 1000)); }
  function data() {
    var v = S().get(KEY, null), d = today();
    if (!v || v.day !== d) { v = { day: d, c: {}, project: v && v.project || '' }; S().set(KEY, v); }
    return v;
  }
  function count(key, n) {
    n = n == null ? 1 : +n || 0; if (n <= 0) return;
    var v = data(); v.c[key] = (v.c[key] || 0) + n; S().set(KEY, v);
    subs.forEach(function (f) { try { f(v); } catch (e) {} });
  }
  function get(key) { return data().c[key] || 0; }
  function setProject(p) { var v = data(); if (p && v.project !== p) { v.project = p; S().set(KEY, v); } }
  function onChange(f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }

  /* ---- isteğe bağlı otomatik sayım (fetch) ---- */
  function quota(status, txt) { return status === 429 || /RESOURCE_EXHAUSTED|quota exceeded|insufficient_quota/i.test(txt || ''); }
  function firestore(method, url, body, status) {
    var path = String(url).split('?')[0];
    if (/:(listen|write)\b|\/Listen\/|\/Write\//.test(path) || /:beginTransaction$|:rollback$/.test(path)) return;
    if (/:commit$|:batchWrite$/.test(path)) {
      var b = null; try { b = typeof body === 'string' ? JSON.parse(body) : null; } catch (e) {}
      ((b && b.writes) || []).forEach(function (w) { count(w && w['delete'] ? 'firebase.delete' : 'firebase.write'); });
      return;
    }
    if (/:runQuery$|:runAggregationQuery$|:batchGet$/.test(path)) return 'read-body';
    method = String(method || 'GET').toUpperCase();
    if (method === 'GET') return (path.split('/documents')[1] || '').split('/').filter(Boolean).length % 2 === 1 ? 'read-list' : count('firebase.read');
    if (method === 'DELETE') return count('firebase.delete');
    count('firebase.write');
  }
  function provider(url) { for (var k in PROVIDERS) if (PROVIDERS[k].host.test(url)) return k; return ''; }
  function wrapFetch() {
    var orig = g.fetch; if (!orig || orig.__fcUsage) return;
    var w = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || String(input);
      var method = (init && init.method) || (input && input.method) || 'GET';
      var isFs = /firestore\.googleapis\.com\/v1\//.test(url) && !/comm-calc-103111111\/databases\/\(default\)\/documents\/mesajlar/.test(url);
      var ai = provider(url);
      var p = orig.apply(this, arguments);
      if (!isFs && !ai) return p;
      return p.then(function (res) {
        try {
          if (ai) { count('ai.' + ai); if (res.status === 429) count('ai.' + ai + '.full'); return res; }
          var m = /\/projects\/([^/]+)\//.exec(url); if (m && res.ok) setProject(decodeURIComponent(m[1]));
          if (res.status === 429) { count('firebase.full'); return res; }
          var mode = firestore(method, url, init && init.body, res.status);
          if (mode && res.ok) res.clone().json().then(function (j) {
            var n = Array.isArray(j) ? j.filter(function (x) { return x && (x.document || x.found); }).length : ((j && j.documents) || []).length;
            count('firebase.read', Math.max(1, n));
          }).catch(function () {});
        } catch (e) {}
        return res;
      });
    };
    w.__fcUsage = true; g.fetch = w;
  }

  function fmt(n) { return FC.i18n.num(n, 0); }
  function dur(ms) { var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return (h ? h + ' ' + T('fc.h') + ' ' : '') + m + ' ' + T('fc.min'); }
  function card(o) {
    o = o || {};
    var ui = FC.ui, el = ui.el, c = ui.card({ key: 'usage', title: '', icon: 'gauge' });
    function meter(label, used, max) {
      var pct = Math.min(100, used / max * 100);
      var m = el('div.fc-meter' + (pct >= 100 ? '.full' : pct >= 80 ? '.warn' : ''));
      m.appendChild(el('div.fc-meter-head', null, [el('span', { text: label }), el('b.ltr', { text: fmt(used) + ' / ' + fmt(max) })]));
      var bar = el('div.update-bar', { role: 'progressbar', 'aria-valuenow': String(Math.round(pct)), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label }, [el('span', { style: 'width:' + pct + '%' })]);
      m.appendChild(bar);
      return m;
    }
    function draw() {
      var v = data(), proj = '';
      try { proj = (typeof o.project === 'function' ? o.project() : o.project) || v.project || ''; } catch (e) {}
      c.innerHTML = '';
      c.appendChild(el('h3.card-title', { html: ui.icon('gauge') + '<span>' + ui.esc(T('fc.usage.title')) + '</span>' }));
      c.appendChild(el('p.card-desc', { text: T(o.firebase === false && o.ai === false ? 'fc.usage.none' : 'fc.usage.desc') }));
      if (o.firebase !== false) {
        c.appendChild(el('div.fc-sub', { text: T('fc.usage.firebase') }));
        c.appendChild(el('div.field-hint', { text: proj ? T('fc.usage.project', { p: proj }) : T('fc.usage.noFirebase') }));
        c.appendChild(meter(T('fc.usage.read'), v.c['firebase.read'] || 0, LIMIT.read));
        c.appendChild(meter(T('fc.usage.write'), v.c['firebase.write'] || 0, LIMIT.write));
        c.appendChild(meter(T('fc.usage.delete'), v.c['firebase.delete'] || 0, LIMIT['delete']));
        if (v.c['firebase.full']) c.appendChild(el('div.notice.error', { text: T('fc.usage.full') }));
        c.appendChild(el('p.field-hint', { text: T('fc.usage.reset', { t: dur(msToReset()) }) + ' ' + T('fc.usage.device'), style: 'margin:10px 0 0' }));
      }
      if (o.ai !== false) {
        c.appendChild(el('div.fc-sub', { text: T('fc.usage.ai') }));
        var list = el('ul.fc-list'), keys = Object.keys(PROVIDERS);
        var shown = (o.providers || keys).filter(function (k) { return PROVIDERS[k]; });
        shown.forEach(function (k) {
          var n = v.c['ai.' + k] || 0;
          var left = el('div', null, [el('div', { html: '<b>' + ui.esc(PROVIDERS[k].name) + '</b>' }), el('div.field-hint', { text: T('fc.ai.' + k + '.note') })]);
          var lnk = el('a.fc-small', { href: PROVIDERS[k].limits, text: T('fc.usage.limits'), onclick: function (e) { e.preventDefault(); ui.openUrl(PROVIDERS[k].limits); } });
          list.appendChild(el('li', null, [left, el('div', { style: 'text-align:end;white-space:nowrap' }, [el('b.ltr', { text: T('fc.usage.calls', { n: fmt(n) }) }), el('br'), lnk])]));
        });
        c.appendChild(list);
      }
    }
    draw(); onChange(draw); FC.i18n.onChange(draw);
    var tick = setInterval(function () { if (c.isConnected === false) return; draw(); }, 60000);
    c.addEventListener('fc:destroy', function () { clearInterval(tick); });
    return c;
  }
  var api = { count: count, get: get, data: data, setProject: setProject, onChange: onChange, wrapFetch: wrapFetch, card: card, msToReset: msToReset, today: today, LIMIT: LIMIT, PROVIDERS: PROVIDERS, _config: function (c) { cfg = c; } };
  FC.usage = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- onboarding.js ---- */
/* FC.onboarding — ilk açılış sihirbazı: dil → görünüm → kendi Firebase'iniz → kendi AI anahtarınız (isteğe bağlı) → bitti.
     FC.onboarding.maybeStart({onFirebase: cfg => ..., onAi: ({provider, key}) => ...})   // yalnız ilk açılışta
     FC.onboarding.open(opts)                                                           // Ayarlar'dan yeniden aç
   opts.firebase:false / opts.ai:false ilgili adımı çıkarır. Varsayılan olarak yapılandırma ve anahtar FC.storage'da
   (fc.firebase.config, fc.ai) saklanır; opts.store:false ise yalnız geri çağrılar kullanılır (kabuğun güvenli deposu için). */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var GUIDE = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';
  var AI = {
    gemini: { name: 'Google Gemini', key: 'https://aistudio.google.com/app/apikey' },
    openai: { name: 'OpenAI', key: 'https://platform.openai.com/api-keys' },
    anthropic: { name: 'Anthropic Claude', key: 'https://console.anthropic.com/settings/keys' },
    groq: { name: 'Groq', key: 'https://console.groq.com/keys' }
  };
  function T(k, v) { return FC.t(k, v); }
  function S() { return FC.storage; }

  /** firebaseConfig metnini (JSON ya da `const firebaseConfig = {...}` kodu) nesneye çevirir; geçersizse null. */
  function parseFirebase(text) {
    var s = String(text || ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    s = s.slice(a, b + 1);
    var o = null;
    try { o = JSON.parse(s); } catch (e) {
      try {
        var j = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
          .replace(/'((?:[^'\\]|\\.)*)'/g, function (m, x) { return JSON.stringify(x.replace(/\\'/g, "'")); })
          .replace(/,\s*([}\]])/g, '$1');
        o = JSON.parse(j);
      } catch (e2) { return null; }
    }
    if (!o || typeof o !== 'object') return null;
    if (!/^AIza[0-9A-Za-z_-]{30,}$/.test(o.apiKey || '') || !/^[a-z0-9][a-z0-9-]{3,38}[a-z0-9]$/.test(o.projectId || '')) return null;
    var out = {}; ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId', 'databaseURL'].forEach(function (k) { if (o[k]) out[k] = String(o[k]); });
    return out;
  }
  /** Gerçek deneme: var olmayan bir belgeyi okur. Döner {code:'ok'|'rules'|'nodb'|'badkey'|'net'} */
  async function testFirebase(c, f) {
    f = f || g.fetch;
    var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(c.projectId) + '/databases/(default)/documents/_fc_baglanti/deneme?key=' + encodeURIComponent(c.apiKey);
    var r; try { r = await f(url, { cache: 'no-store' }); } catch (e) { return { code: 'net' }; }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (FC.usage) FC.usage.count('firebase.read');
    var msg = String(j && j.error && j.error.message || '');
    if (r.ok) return { code: 'ok' };
    if (r.status === 404 && !/database|does not exist/i.test(msg)) return { code: 'ok' };
    if (r.status === 404 || /has not been used|is disabled|does not exist/i.test(msg)) return { code: 'nodb' };
    if (r.status === 400 || /API key/i.test(msg)) return { code: 'badkey' };
    if (r.status === 403) return { code: 'rules' };
    return { code: 'net' };
  }
  async function testAi(p, key, f) {
    f = f || g.fetch;
    var u, h = {};
    if (p === 'gemini') u = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=' + encodeURIComponent(key);
    else if (p === 'openai') { u = 'https://api.openai.com/v1/models'; h.Authorization = 'Bearer ' + key; }
    else if (p === 'groq') { u = 'https://api.groq.com/openai/v1/models'; h.Authorization = 'Bearer ' + key; }
    else if (p === 'anthropic') { u = 'https://api.anthropic.com/v1/models?limit=1'; h['x-api-key'] = key; h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true'; }
    else return 'unknown';
    try { var r = await f(u, { headers: h }); return r.ok ? 'ok' : (r.status === 401 || r.status === 403 || r.status === 400) ? 'bad' : 'unknown'; } catch (e) { return 'unknown'; }
  }

  function open(opts) {
    opts = opts || {};
    var ui = FC.ui, el = ui.el;
    var steps = ['lang', 'look'];
    if (opts.firebase !== false) steps.push('firebase');
    if (opts.ai !== false) steps.push('ai');
    steps.push('done');
    var i = 0, m = ui.modal({ title: T('fc.ob.welcome'), icon: 'sparkles', cls: 'fc-onboarding', body: el('div'), buttons: [], dismiss: true, onClose: function () { S().set('onboarding.done', true); if (opts.onClose) opts.onClose(); } });
    var fbState = { text: '', conf: S().get('firebase.config', null), result: '' };
    var aiState = S().get('ai', { provider: 'gemini', key: '' }) || { provider: 'gemini', key: '' };
    function link(text, url) { return el('a', { href: url, text: text, onclick: function (e) { e.preventDefault(); ui.openUrl(url); } }); }
    function dots() { var d = el('div.fc-steps', { 'aria-label': T('fc.ob.step', { i: i + 1, n: steps.length }) }); steps.forEach(function (s, k) { d.appendChild(el('i' + (k <= i ? '.on' : ''))); }); return d; }
    function render() {
      var s = steps[i], b = m.body; b.innerHTML = ''; b.appendChild(dots());
      var titles = { lang: 'fc.ob.welcome', look: 'fc.ob.lookTitle', firebase: 'fc.ob.fbTitle', ai: 'fc.ob.aiTitle', done: 'fc.ob.doneTitle' };
      var icons = { lang: 'globe', look: 'type', firebase: 'cloud', ai: 'key', done: 'check' };
      m.setTitle(T(titles[s]), icons[s]);
      if (s === 'lang') { b.appendChild(el('p.muted', { text: T('fc.ob.langDesc') })); b.appendChild(FC.look.langOptions()); }
      if (s === 'look') { b.appendChild(el('p.muted', { text: T('fc.ob.lookDesc') })); b.appendChild(FC.look.controls()); }
      if (s === 'firebase') {
        b.appendChild(el('p', { text: T('fc.ob.fbDesc') }));
        b.appendChild(el('p.fc-row', { style: 'margin:0 0 4px' }, [link(T('fc.ob.fbGuide'), opts.guideUrl || GUIDE), link(T('fc.ob.fbConsole'), 'https://console.firebase.google.com/')]));
        var ta = el('textarea.mono.ltr', { rows: '7', spellcheck: 'false', placeholder: '{ "apiKey": "AIza…", "authDomain": "…", "projectId": "…", "appId": "…" }' });
        ta.value = fbState.text || (fbState.conf ? JSON.stringify(fbState.conf, null, 2) : '');
        var res = el('div', { role: 'status', 'aria-live': 'polite' });
        if (fbState.result) res.appendChild(fbState.result);
        var test = el('button.btn', { type: 'button', html: ui.icon('cloud') + ui.esc(T('fc.ob.test')) });
        ta.addEventListener('input', function () { fbState.text = ta.value; ta.classList.remove('invalid'); });
        test.addEventListener('click', async function () {
          var c = parseFirebase(ta.value); res.innerHTML = '';
          if (!c) { ta.classList.add('invalid'); res.appendChild(fbState.result = el('div.notice.error', { text: T('fc.ob.fbBad') })); return; }
          test.disabled = true; test.lastChild.textContent = T('fc.ob.testing');
          var r = await testFirebase(c, opts.fetch);
          test.disabled = false; test.lastChild.textContent = T('fc.ob.test');
          var map = { ok: ['ok', 'fc.ob.fbOk'], rules: ['', 'fc.ob.fbRules'], nodb: ['error', 'fc.ob.fbNoDb'], badkey: ['error', 'fc.ob.fbBadKey'], net: ['error', 'fc.ob.fbNet'] }[r.code];
          res.appendChild(fbState.result = el('div.notice' + (map[0] ? '.' + map[0] : ''), { text: T(map[1], { p: c.projectId }) }));
          if (r.code === 'ok' || r.code === 'rules') {
            fbState.conf = c;
            if (opts.store !== false) S().set('firebase.config', c);
            if (FC.usage) FC.usage.setProject(c.projectId);
            if (opts.onFirebase) try { opts.onFirebase(c, r.code); } catch (e) {}
          }
        });
        b.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.ob.fbPaste') }), ta]));
        b.appendChild(el('div.fc-row', null, [test]));
        b.appendChild(res);
        b.appendChild(el('p.field-hint', { text: T('fc.ob.fbLater'), style: 'margin:12px 0 0' }));
      }
      if (s === 'ai') {
        b.appendChild(el('p', { text: T('fc.ob.aiDesc') }));
        var sel = el('select'); Object.keys(AI).forEach(function (k) { sel.appendChild(el('option', { value: k, text: AI[k].name })); }); sel.value = aiState.provider || 'gemini';
        var key = el('input.mono.ltr', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'sk-… / AIza… / gsk_…' }); key.value = aiState.key || '';
        var getLink = el('div.field-hint');
        var drawLink = function () { getLink.innerHTML = ''; getLink.appendChild(link(T('fc.ob.aiGet') + ' — ' + AI[sel.value].name, AI[sel.value].key)); getLink.appendChild(el('div', { text: T('fc.ai.' + sel.value + '.note') })); };
        sel.addEventListener('change', function () { aiState.provider = sel.value; drawLink(); });
        key.addEventListener('input', function () { aiState.key = key.value.trim(); });
        drawLink();
        var res2 = el('div', { role: 'status', 'aria-live': 'polite' });
        var test2 = el('button.btn', { type: 'button', html: ui.icon('key') + ui.esc(T('fc.ob.test')) });
        test2.addEventListener('click', async function () {
          if (!aiState.key) { key.classList.add('invalid'); return; }
          key.classList.remove('invalid'); test2.disabled = true; res2.innerHTML = '';
          var r = await testAi(aiState.provider, aiState.key, opts.fetch); test2.disabled = false;
          saveAi();
          res2.appendChild(el('div.notice' + (r === 'ok' ? '.ok' : r === 'bad' ? '.error' : ''), { text: T(r === 'ok' ? 'fc.ob.aiOk' : r === 'bad' ? 'fc.ob.aiBad' : 'fc.ob.aiUnk') }));
        });
        b.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.ob.aiProvider') }), sel]));
        b.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.ob.aiKey') }), key, getLink]));
        b.appendChild(el('div.fc-row', null, [test2]));
        b.appendChild(res2);
      }
      if (s === 'done') { b.appendChild(el('p', { text: T('fc.ob.doneDesc') })); }
      var last = i === steps.length - 1;
      var btns = [];
      if (!last && i > 0) btns.push({ label: T('fc.skip'), cls: 'ghost', onClick: function () { i++; render(); return false; } });
      btns.push('spacer');
      if (i > 0) btns.push({ label: T('fc.back'), onClick: function () { i--; render(); return false; } });
      btns.push({ label: last ? T('fc.ob.start') : T('fc.next'), cls: 'primary', onClick: function () { if (s === 'ai') saveAi(); if (last) return true; i++; render(); return false; } });
      m.setButtons(btns);
    }
    function saveAi() {
      if (!aiState.key) return;
      var v = { provider: aiState.provider, key: aiState.key };
      if (opts.store !== false) S().set('ai', v);
      if (opts.onAi) try { opts.onAi(v); } catch (e) {}
    }
    var off = FC.i18n.onChange(function () { if (m.el.isConnected) render(); else off(); });
    render();
    return m;
  }
  function maybeStart(opts) { if (!S().get('onboarding.done', false)) return open(opts); return null; }
  /** Ayarlar için "Kurulum sihirbazını aç" düğmesi */
  function button(opts) {
    var ui = FC.ui, b = ui.el('button.btn.small', { type: 'button' });
    function draw() { b.innerHTML = ui.icon('sparkles') + ui.esc(T('fc.ob.reopen')); }
    b.addEventListener('click', function () { open(opts); });
    draw(); FC.i18n.onChange(draw);
    return b;
  }
  var api = { open: open, maybeStart: maybeStart, button: button, parseFirebase: parseFirebase, testFirebase: testFirebase, testAi: testAi, AI: AI };
  FC.onboarding = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- whatsnew.js ---- */
/* FC.whatsnew — güncellemeden sonraki ilk açılışta "Bu sürümde neler yeni".
     FC.whatsnew.start({version:'1.57.0'})   // açılışta bir kez
     FC.whatsnew.show()                       // Ayarlar'dan elle
   Notlar FC.updater kurulumdan ÖNCE fc.whatsnew.pending'e yazar ({version, notes:{tr,en,ar}}); burada o sürümle
   eşleşirse geçerli dilde gösterilir. İlk kurulumda pencere açılmaz. opts.notes ile (ör. gömülü CHANGELOG) verilebilir:
     {tr,en,ar} ya da function(version) → {tr,en,ar}|null. FC.init({whatsnew:{notes, delayMs}}) bunları buraya iletir. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var cfg = {};
  function S() { return FC.storage; }
  function T(k, v) { return FC.t(k, v); }
  function notesFor(v) {
    if (cfg.notes) { var n = typeof cfg.notes === 'function' ? cfg.notes(v) : cfg.notes; if (n) return n; }
    var p = S().get('whatsnew.pending', null);
    return p && String(p.version) === String(v) ? p.notes : null;
  }
  function show(v) {
    v = v || cfg.version;
    var ui = FC.ui, el = ui.el, notes = FC.i18n.pick(notesFor(v));
    var body = el('div');
    body.appendChild(el('p.muted', { text: T('fc.wn.ver', { v: v }) }));
    var lines = String(notes || '').split(/\r?\n/).map(function (x) { return x.replace(/^\s*[-*•]\s*/, '').trim(); }).filter(Boolean);
    if (lines.length > 1) { var ul = el('ul.fc-notes'); lines.forEach(function (l) { ul.appendChild(el('li', { text: l, dir: 'auto' })); }); body.appendChild(ul); }
    else body.appendChild(el('p', { text: lines[0] || T('fc.wn.none'), dir: 'auto' }));
    body.appendChild(el('div.notice.ok', null, [el('span', { html: ui.icon('check') }), el('span', { text: T('fc.wn.safe') })]));
    return ui.modal({ title: T('fc.wn.title'), icon: 'sparkles', cls: 'small', body: body });
  }
  /** Döner: gösterildiyse true */
  function start(c) {
    cfg = c || {};
    var v = String(cfg.version || (FC.host && FC.host.version()) || '');
    if (!v) return false;
    var seen = S().get('whatsnew.seen', null);
    S().set('whatsnew.seen', v);
    if (!shouldShow(v, seen)) return false;
    setTimeout(function () { show(v); }, cfg.delayMs == null ? 900 : cfg.delayMs);
    return true;
  }
  /** Saf karar: ilk kurulum (seen yok) ya da aynı/eski sürüm → false. Eski uygulamaların semver olmayan "görüldü" değerleri
      ("3.3", 3.3, "2.1.0.4") karşılaştırılamaz → yeni sürüm sayılır, pencere gösterilir. */
  function shouldShow(v, seen) {
    if (seen === null || seen === undefined || seen === '') return false;
    v = String(v); seen = String(seen);
    if (seen === v) return false;
    var U = FC.updater;
    if (U && U.cmp && U.parse && U.parse(v) && U.parse(seen)) return U.cmp(v, seen) > 0;
    return true;
  }
  function button() {
    var ui = FC.ui, b = ui.el('button.btn.small', { type: 'button' });
    function draw() { b.innerHTML = ui.icon('sparkles') + ui.esc(T('fc.wn.show')); }
    b.addEventListener('click', function () { show(); }); draw(); FC.i18n.onChange(draw);
    return b;
  }
  var api = { start: start, show: show, button: button, shouldShow: shouldShow };
  FC.whatsnew = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- announcements.js ---- */
/* FC.announcements — yönetici duyuruları (duyurular/istemci/duyuru.js'in çekirdek tasarımlı sürümü).
     FC.announcements.start({app:'kitaplik', version:'2.5.0', onUpdate: () => FC.updater.run()})
     topbar before: [FC.announcements.button()]     // 🔔 + okunmamış sayısı
   Kaynak: raw.githubusercontent.com/departures-mil/duyurular/main/duyurular.json (30 dk'da bir; çevrimdışıyken önbellek).
   Yeni duyuru bir kez kendiliğinden açılır, sonra zil listesinden okunur. Alanlar: id, tarih, baslik{tr,en,ar}, metin{…},
   hedef['*'|uygulama], aktif, baslangic, bitis, altSurum, ustSurum, link, onem:'onemli', guncellemeDugmesi. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var SRC = 'https://raw.githubusercontent.com/departures-mil/duyurular/main/duyurular.json';
  var cfg = { app: '', version: '0.0.0', intervalMin: 30 }, list = [], queue = [], open = false, btns = [];
  function S() { return FC.storage; }
  function T(k, v) { return FC.t(k, v); }
  function seen() { var a = S().get('ann.seen', []); return Array.isArray(a) ? a : []; }
  function markSeen(id) { var a = seen(); if (a.indexOf(id) < 0) { a.push(id); S().set('ann.seen', a.slice(-300)); } }
  function cmpLoose(a, b) {
    var x = String(a).replace(/^v\.?/i, '').split('.'), y = String(b).replace(/^v\.?/i, '').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var p = +x[i] || 0, q = +y[i] || 0; if (p !== q) return p < q ? -1 : 1; }
    return 0;
  }
  function fits(d) {
    if (!d || !d.id || d.aktif === false) return false;
    var h = d.hedef || ['*'];
    if (h.indexOf('*') < 0 && h.indexOf(cfg.app) < 0) return false;
    var now = Date.now();
    if (d.baslangic && Date.parse(d.baslangic) > now) return false;
    if (d.bitis && Date.parse(d.bitis) < now) return false;
    if (d.altSurum && cmpLoose(cfg.version, d.altSurum) < 0) return false;
    if (d.ustSurum && cmpLoose(cfg.version, d.ustSurum) > 0) return false;
    return true;
  }
  function date(d) { try { return new Date(d.tarih).toLocaleDateString(FC.i18n.locale()); } catch (e) { return ''; } }
  function item(d) {
    var ui = FC.ui, el = ui.el, pick = FC.i18n.pick;
    var h = el('h3', null, [d.onem === 'onemli' ? el('span.fc-tag', { text: T('fc.ann.important') }) : null, el('span', { text: pick(d.baslik), dir: 'auto' })]);
    var box = el('div.fc-ann', null, [h, el('div.fc-date', { text: date(d) }), el('div.fc-text', { text: pick(d.metin), dir: 'auto' })]);
    if (d.link) box.appendChild(el('div.fc-row', { style: 'margin-top:8px' }, [el('a', { href: d.link, html: ui.icon('ext') + ' ' + ui.esc(T('fc.ann.link')), onclick: function (e) { e.preventDefault(); ui.openUrl(d.link); } })]));
    return box;
  }
  function next() {
    if (open || !queue.length || !g.document.body) return;
    var d = queue.shift(); open = true;
    var b = [];
    if (d.guncellemeDugmesi && cfg.onUpdate) b.push({ label: T('fc.ann.update'), icon: 'download', onClick: function () { try { cfg.onUpdate(); } catch (e) {} } });
    b.push({ label: T('fc.ok'), cls: 'primary' });
    FC.ui.modal({ title: T('fc.ann.title'), icon: 'bell', cls: 'small', body: item(d), buttons: b, onClose: function () { markSeen(d.id); open = false; draw(); setTimeout(next, 300); } });
  }
  function showList() {
    var body = FC.ui.el('div');
    if (list.length) list.forEach(function (d) { body.appendChild(item(d)); }); else body.appendChild(FC.ui.el('p.muted', { text: T('fc.ann.none') }));
    list.forEach(function (d) { markSeen(d.id); });
    draw();
    return FC.ui.modal({ title: T('fc.ann.title'), icon: 'bell', body: body, buttons: [{ label: T('fc.close'), cls: 'primary' }] });
  }
  function unread() { var s = seen(); return list.filter(function (d) { return s.indexOf(d.id) < 0; }).length; }
  function draw() {
    btns.forEach(function (b) {
      var n = unread();
      b.innerHTML = FC.ui.icon('bell') + (n ? '<span class="sync-badge">' + n + '</span>' : '');
      b.title = T('fc.ann.title'); b.setAttribute('aria-label', T('fc.ann.title') + (n ? ' (' + n + ')' : ''));
    });
  }
  function button() { var b = FC.ui.el('button.icon-btn.ann-btn', { type: 'button' }); b.addEventListener('click', showList); btns.push(b); draw(); FC.i18n.onChange(draw); return b; }
  function ingest(all) {
    list = (all || []).filter(fits).sort(function (a, b) { return String(b.tarih).localeCompare(String(a.tarih)); });
    var s = seen();
    list.slice().reverse().forEach(function (d) { if (s.indexOf(d.id) < 0 && !queue.some(function (q) { return q.id === d.id; })) queue.push(d); });
    draw(); if (cfg.autoOpen !== false) next();
  }
  function refresh() {
    var f = cfg.fetch || g.fetch;
    return f((cfg.source || SRC) + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { var a = (j && j.duyurular) || []; S().set('ann.cache', a); ingest(a); })
      .catch(function () { ingest(S().get('ann.cache', [])); });
  }
  function start(c) {
    for (var k in c) cfg[k] = c[k];
    setTimeout(refresh, cfg.firstDelayMs == null ? 4000 : cfg.firstDelayMs);
    setInterval(refresh, Math.max(5, cfg.intervalMin) * 60000);
    return api;
  }
  var api = { start: start, refresh: refresh, button: button, show: showList, unread: unread, _ingest: ingest, _fits: fits };
  FC.announcements = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- lan-sync-merge.js ---- */
/* FC.lanMerge — Wi-Fi/LAN eşitlemesinin saf birleştirme kuralı (SPEC "Eşitleme kuralı"):
   hiçbir kayıt silinmez, hiçbir kayıt sessizce ezilmez.
     const r = FC.lanMerge.merge(yerel, uzak, {idKey:'id', updatedKey:'updatedAt'});
     r.records   → yazılacak canlı kayıtlar (arşivlenenler dahil, archived:true ile)
     r.conflicts → [{id, kept, lost, keptFrom:'local'|'remote'}]  eski hal çakışma yedeğine yazılır
     r.archived  → [{id, record, deletedAt, from}]                silme → "arşivlendi" (veri korunur)
   Kurallar
   - Bir tarafta olan kayıt eklenir.
   - İki tarafta farklıysa yeni olan (updatedKey) kalır, eskisi conflicts'e; eşitlikte sıralama belirleyicidir (iki cihaz aynı sonuca varır).
   - Silme işareti (deletedKey:true, zamanı deletedAtKey || updatedKey) karşı taraftaki canlı kaydı SİLMEZ: kayıt
     archivedKey:true, archivedAtKey ile korunur. Silmeden sonra düzenlenmiş kayıt canlı kalır.
   - Eski Falcon/Kitaplık hatası (uzak silme yerelde kalıcı silme) burada yoktur. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  function canon(x, skip) {
    if (x === null || typeof x !== 'object') return JSON.stringify(x === undefined ? null : x);
    if (Array.isArray(x)) return '[' + x.map(function (v) { return canon(v); }).join(',') + ']';
    return '{' + Object.keys(x).sort().filter(function (k) { return x[k] !== undefined && (!skip || skip.indexOf(k) < 0); }).map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
  }
  function ts(v) { if (v == null || v === '') return 0; if (typeof v === 'number') return v; var n = Date.parse(v); return isNaN(n) ? (+v || 0) : n; }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  function merge(local, remote, opt) {
    opt = opt || {};
    var ID = opt.idKey || 'id', UP = opt.updatedKey || 'updatedAt', DEL = opt.deletedKey || 'deleted', DELAT = opt.deletedAtKey || 'deletedAt',
      ARC = opt.archivedKey || 'archived', ARCAT = opt.archivedAtKey || 'archivedAt';
    var skip = [UP];
    function index(list) { var m = {}, order = []; (list || []).forEach(function (r) { if (!r || r[ID] == null) return; var k = String(r[ID]); if (!(k in m)) order.push(k); m[k] = r; }); return { m: m, order: order }; }
    var L = index(local), R = index(remote);
    var ids = L.order.slice(); R.order.forEach(function (k) { if (!(k in L.m)) ids.push(k); });
    var records = [], conflicts = [], archived = [];
    function dead(r) { return !!(r && r[DEL]); }
    function delTime(r) { return ts(r[DELAT]) || ts(r[UP]); }
    function archive(live, tomb, from) {
      var t = delTime(tomb), rec = copy(live);
      rec[ARC] = true; rec[ARCAT] = typeof tomb[DELAT] === 'string' || typeof tomb[UP] === 'string' ? new Date(t).toISOString() : t;
      if (ts(rec[UP]) < t) rec[UP] = typeof live[UP] === 'string' ? new Date(t).toISOString() : t;
      delete rec[DEL]; delete rec[DELAT];
      records.push(rec); archived.push({ id: String(live[ID]), record: rec, deletedAt: t, from: from });
    }
    ids.forEach(function (id) {
      var x = L.m[id], y = R.m[id];
      if (x && !y) { if (!dead(x)) records.push(x); return; }
      if (y && !x) { if (!dead(y)) records.push(y); return; }
      if (dead(x) && dead(y)) return;
      if (dead(y)) { if (delTime(y) >= ts(x[UP])) archive(x, y, 'remote'); else records.push(x); return; }
      if (dead(x)) { if (delTime(x) >= ts(y[UP])) archive(y, x, 'local'); else records.push(y); return; }
      var cx = canon(x, skip), cy = canon(y, skip);
      var sx = ts(x[UP]), sy = ts(y[UP]);
      if (cx === cy) { records.push(sy > sx ? y : x); return; }
      var localWins = sx > sy || (sx === sy && cx > cy);
      records.push(localWins ? x : y);
      conflicts.push({ id: id, kept: localWins ? x : y, lost: localWins ? y : x, keptFrom: localWins ? 'local' : 'remote' });
    });
    return { records: records, conflicts: conflicts, archived: archived };
  }
  var api = { merge: merge, canon: canon };
  FC.lanMerge = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- agent.js ---- */
/* FC.agent — Asistan Agent: kullanıcının TÜM uygulamalardaki çalışmasını izler, durumu geliştirmek için yorum yapar.
     FC.agent.start({app:'kitaplik', version:'2.5.0'})      // FC.init bunu kendisi çağırır (o.agent:false → kapalı)
     FC.agent.track('kitap.ekle')                          // isteğe bağlı: uygulamaya özgü eylem
     FC.agent.task('fatura-42', 'start'|'done', 'Fatura')  // isteğe bağlı: yarım kalan iş takibi
     topbar: FC.agent.button()  (FC.topbar kendisi ekler)  ·  ayarlar: FC.agent.card()  (FC.settings kendisi ekler)
   Gizlilik: yalnızca SAYILAR tutulur (etkin dakika, oturum, düğme adları, saat dağılımı, hata sayısı). Yazılan metin,
   kayıt içeriği, dosya adı TUTULMAZ. Veriler cihazda kalır; paylaşım yalnız kullanıcının kendi kanallarıyla olur:
     1) aynı bilgisayardaki diğer uygulamalar: Electron ana süreci %APPDATA%/FalconCekirdek/agent/*.json (fcHost.agent)
     2) kullanıcının KENDİ Firebase'i (fc.firebase.config varsa): fc_agent koleksiyonu, REST, sayaçlı
     3) Wi-Fi/LAN eşitlemesi: FC.agent.exportShare() / FC.agent.importShare(obj)
   Kendi anahtar deposu olan uygulama: start({ai: () => ({provider:'gemini', key}), firebase: () => ({projectId, apiKey})}).
   Yorumlar: önce çevrim dışı kurallar; açıksa ve kullanıcının KENDİ AI anahtarı varsa (fc.ai) çevrim içi yapay zeka
   (günde en çok cfg.aiPerDay çağrı, FC.usage ile sayılır). Teslim: bildirim + uygulama içi panel; ikisi de ayarlardan kapanır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var KEEP_DAYS = 60, MAX_NOTES = 60, TICK_MS = 60000, IDLE_MS = 120000, CHECK_MS = 30 * 60000, SHARE_MS = 30 * 60000;
  var FREQ = ['instant', 'daily', 'weekly', 'manual'];
  var DEF = { on: true, notify: true, panel: true, freq: 'daily', ai: true, apps: null };
  var run = { app: '', version: '', started: false, lastInput: 0, streak: 0, timers: [], subs: [], btns: [], now: null, fetch: null, aiPerDay: 4, busy: null };

  function S() { return FC.storage; }
  function T(k, v) { return FC.t ? FC.t(k, v) : k; }
  function now() { return run.now ? run.now() : new Date(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { d = d || now(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysAgo(n) { var d = now(); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, 12)); }
  function cfg() { var c = S().get('agent.cfg', null) || {}; var o = {}; for (var k in DEF) o[k] = c[k] === undefined ? DEF[k] : c[k]; if (FREQ.indexOf(o.freq) < 0) o.freq = 'daily'; return o; }
  function setCfg(p) { var c = cfg(); for (var k in p) c[k] = p[k]; S().set('agent.cfg', c); emit(); return c; }
  function device() {
    var id = S().get('device');
    if (!id) { id = ''; for (var i = 0; i < 18; i++) id += Math.floor(Math.random() * 16).toString(16); S().set('device', id); }
    return id;
  }
  function safe(f) { try { return typeof f === 'function' ? f() : f; } catch (e) { return null; } }
  function srcKey() { return (run.app || 'app') + '@' + device(); }

  /* ---------- kayıt ---------- */
  function emptyDay() { return { act: 0, ses: 0, mx: 0, a: {}, h: [], err: 0 }; }
  function mine() {
    var m = S().get('agent.mine', null);
    if (!m || m.app !== run.app) m = { app: run.app, dev: device(), v: run.version, u: 0, days: {}, tasks: {} };
    return m;
  }
  function prune(days) { var lim = daysAgo(KEEP_DAYS); for (var k in days) if (k < lim) delete days[k]; return days; }
  function save(m) { m.u = now().getTime(); m.v = run.version; prune(m.days); S().set('agent.mine', m); }
  function today(m) { var k = dayKey(); return m.days[k] || (m.days[k] = emptyDay()); }
  /** Eylem adını temizler: e-posta, sayı, uzun metin maskelenir (kayıt içeriği sızmasın). */
  function clean(name) {
    var s = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
    s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '@').replace(/\d+([.,:/-]\d+)*/g, '#');
    if (s.length > 40) s = s.slice(0, 40);
    return s;
  }
  function track(name, n) {
    if (!cfg().on || !run.app) return;
    var k = clean(name); if (!k) return;
    var m = mine(), d = today(m); n = n == null ? 1 : +n || 0;
    d.a[k] = (d.a[k] || 0) + n;
    var keys = Object.keys(d.a); if (keys.length > 120) { keys.sort(function (x, y) { return d.a[x] - d.a[y]; }); delete d.a[keys[0]]; }
    save(m); if (cfg().freq === 'instant') schedule();
  }
  function task(id, state, label) {
    if (!cfg().on || !run.app) return;
    var m = mine(), k = String(id == null ? '' : id).slice(0, 60) || 'task';
    if (state === 'done') { if (m.tasks[k]) { delete m.tasks[k]; today(m).done = (today(m).done || 0) + 1; } }
    else if (!m.tasks[k]) m.tasks[k] = { since: now().getTime(), label: clean(label || id) };
    save(m);
  }
  function tick() {
    if (!cfg().on || !run.app) return;
    var d = g.document, visible = !d || d.visibilityState !== 'hidden';
    var active = visible && (now().getTime() - run.lastInput) < IDLE_MS;
    if (!active) { run.streak = 0; return; }
    var m = mine(), day = today(m), h = now().getHours();
    day.act += 1; day.h[h] = (day.h[h] || 0) + 1;
    run.streak += 1; if (run.streak > day.mx) day.mx = run.streak;
    save(m);
  }
  function input() { run.lastInput = now().getTime(); }
  function onClick(e) {
    input();
    var t = e && e.target; if (!t || !t.closest) return;
    var b = t.closest('[data-fc-track],button,[role=button],a[href],.nav-item,.tab');
    if (!b || b.closest('[data-fc-agent]')) return;
    var name = b.getAttribute('data-fc-track') || b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent;
    if (!name) return;
    if (/^\W{0,3}\s*(e[sş]itle|sync|مزامن)/i.test(String(name).trim())) name = /wi.?fi|lan|qr/i.test(name) ? 'fc.sync.lan' : 'fc.sync';
    track(name);
  }

  /* ---------- paylaşım (diğer uygulamalar / cihazlar) ---------- */
  function peers() { var p = S().get('agent.peers', null); return p && typeof p === 'object' ? p : {}; }
  /** Kaynak başına yeni olan kalır (u). Kendi kaydımız asla dışarıdan ezilmez. */
  function importShare(obj) {
    if (!obj) return 0;
    var list = Array.isArray(obj) ? obj : obj.sources ? obj.sources : [obj], p = peers(), me = srcKey(), n = 0;
    list.forEach(function (s) {
      if (!s || !s.app || !s.dev || !s.days) return;
      var k = s.app + '@' + s.dev; if (k === me) return;
      if (!p[k] || (+s.u || 0) > (+p[k].u || 0)) { p[k] = { app: String(s.app), dev: String(s.dev), v: s.v || '', u: +s.u || 0, days: prune(s.days), tasks: s.tasks || {} }; n++; }
    });
    if (n) { S().set('agent.peers', p); emit(); }
    return n;
  }
  function exportShare() { var p = peers(), out = [mine()]; for (var k in p) out.push(p[k]); return { schema: 1, sources: out }; }
  function hostAgent() { var h = g.fcHost, a = (h && h.agent) || g.fcAgentHost; return a && typeof a.read === 'function' ? a : null; }
  function fbCfg() { var c = run.firebase ? safe(run.firebase) : S().get('firebase.config', null); return c && c.projectId && c.apiKey ? c : null; }
  function fsBase(c) { return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(c.projectId) + '/databases/(default)/documents/fc_agent'; }
  function share(force) {
    var t = now().getTime(), last = S().get('agent.shareAt', 0) || 0;
    if (!force && t - last < SHARE_MS) return Promise.resolve();
    S().set('agent.shareAt', t);
    var jobs = [], m = mine(), ha = hostAgent();
    if (ha) jobs.push(Promise.resolve().then(function () { return ha.write(srcKey(), JSON.stringify(m)); })
      .then(function () { return ha.read(); }).then(function (all) { var arr = []; for (var k in (all || {})) { try { arr.push(JSON.parse(all[k])); } catch (e) {} } importShare(arr); }).catch(function () {}));
    var c = fbCfg(), f = run.fetch || g.fetch;
    if (c && f) {
      var id = encodeURIComponent((run.app + '_' + m.dev).replace(/[^\w-]/g, '_'));
      jobs.push(f(fsBase(c) + '/' + id + '?key=' + encodeURIComponent(c.apiKey), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { veri: { stringValue: JSON.stringify(m) }, zaman: { stringValue: new Date(t).toISOString() } } }) })
        .then(function (r) { if (FC.usage) FC.usage.count('firebase.write'); if (!r.ok) throw new Error('HTTP_' + r.status); return f(fsBase(c) + '?pageSize=50&key=' + encodeURIComponent(c.apiKey)); })
        .then(function (r) { if (!r.ok) throw new Error('HTTP_' + r.status); return r.json(); })
        .then(function (j) {
          var docs = (j && j.documents) || [], arr = [];
          if (FC.usage) FC.usage.count('firebase.read', Math.max(1, docs.length));
          docs.forEach(function (d) { try { arr.push(JSON.parse(d.fields.veri.stringValue)); } catch (e) {} });
          importShare(arr);
        }).catch(function () {}));
    }
    return Promise.all(jobs).then(function () {});
  }

  /* ---------- analiz ---------- */
  function sources() {
    var c = cfg(), all = [mine()], p = peers();
    for (var k in p) all.push(p[k]);
    return all.filter(function (s) { return !c.apps || c.apps.indexOf(s.app) >= 0 || s.app === run.app && c.apps.indexOf(run.app) >= 0; });
  }
  function knownApps() { var a = [run.app], p = peers(); for (var k in p) if (a.indexOf(p[k].app) < 0) a.push(p[k].app); return a.filter(Boolean); }
  function appName(id) { return T('fc.agent.app.' + id) !== 'fc.agent.app.' + id ? T('fc.agent.app.' + id) : String(id || '').replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  /** Haftalık özet: son 7 gün (w) ve önceki 7 gün (pw), uygulama başına. */
  function summary() {
    var w0 = daysAgo(6), p0 = daysAgo(13), apps = {}, tot = { w: 0, pw: 0, days: {}, h: [], ses: 0, err: 0, mx: 0, a: {}, tasks: [] };
    sources().forEach(function (s) {
      var A = apps[s.app] || (apps[s.app] = { w: 0, pw: 0, ses: 0, err: 0, a: {}, sync: 0, early: 0 });
      for (var k in s.days) {
        var d = s.days[k];
        if (k >= w0) {
          A.w += d.act || 0; A.ses += d.ses || 0; A.err += d.err || 0; tot.w += d.act || 0; tot.ses += d.ses || 0; tot.err += d.err || 0;
          if ((d.act || 0) > 0) tot.days[k] = 1;
          if ((d.mx || 0) > tot.mx) tot.mx = d.mx;
          (d.h || []).forEach(function (v, i) { if (v) tot.h[i] = (tot.h[i] || 0) + v; });
          for (var a in d.a) { A.a[a] = (A.a[a] || 0) + d.a[a]; if (/^fc\.sync/.test(a)) A.sync += d.a[a]; }
        } else if (k >= p0) { A.pw += d.act || 0; tot.pw += d.act || 0; }
        else A.early += d.act || 0;
      }
      for (var t in (s.tasks || {})) tot.tasks.push({ app: s.app, id: t, label: s.tasks[t].label, since: s.tasks[t].since });
    });
    return { apps: apps, tot: tot };
  }
  function hm(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? T('fc.agent.hm', { h: h, m: m }) : T('fc.agent.m', { m: m }); }
  /** Çevrim dışı kurallar → [{id, key, text, prio}] (metin anahtar + değişkenlerle; dil değişince yeniden çizilir). */
  function rules(sm) {
    sm = sm || summary();
    var out = [], tot = sm.tot, apps = sm.apps, names = Object.keys(apps);
    function add(id, prio, key, vars) { out.push({ id: id, prio: prio, key: key, vars: vars || {} }); }
    if (tot.w < 5 && tot.pw < 5) { add('start', 1, 'fc.agent.r.start'); return out; }
    if (tot.pw >= 30) {
      var ch = Math.round((tot.w - tot.pw) / tot.pw * 100);
      if (ch >= 25) add('up', 2, 'fc.agent.r.up', { p: ch, t: hm(tot.w) });
      else if (ch <= -25) add('down', 3, 'fc.agent.r.down', { p: -ch, t: hm(tot.w) });
    }
    var used = names.filter(function (n) { return apps[n].w > 0; }).sort(function (a, b) { return apps[b].w - apps[a].w; });
    if (used.length > 1 && tot.w > 0) add('top', 2, 'fc.agent.r.top', { a: appName(used[0]), p: Math.round(apps[used[0]].w / tot.w * 100), n: used.length });
    var night = 0; [23, 0, 1, 2, 3, 4].forEach(function (i) { night += tot.h[i] || 0; });
    if (tot.w >= 60 && night / tot.w >= 0.2) add('night', 4, 'fc.agent.r.night', { p: Math.round(night / tot.w * 100) });
    if (tot.mx >= 90) add('break', 4, 'fc.agent.r.break', { t: hm(tot.mx) });
    var peak = -1, pv = 0; tot.h.forEach(function (v, i) { if (v > pv) { pv = v; peak = i; } });
    if (peak >= 0 && tot.w >= 120) add('peak', 1, 'fc.agent.r.peak', { h: pad(peak) + ':00', h2: pad((peak + 1) % 24) + ':00' });
    var rep = null;
    names.forEach(function (n) {
      var A = apps[n], best = null, bv = 0;
      for (var a in A.a) if (!/^fc\./.test(a) && A.a[a] > bv) { bv = A.a[a]; best = a; }
      if (best && bv >= 30 && (!rep || bv > rep.n)) rep = { a: n, x: best, n: bv };
      if (A.w >= 60 && A.sync === 0 && n === run.app && run.syncSeen) add('sync:' + n, 4, 'fc.agent.r.sync', { a: appName(n) });
      if (A.err >= 3) add('err:' + n, 5, 'fc.agent.r.err', { a: appName(n), n: A.err });
      if (A.w === 0 && A.pw + A.early >= 60) add('idle:' + n, 1, 'fc.agent.r.idle', { a: appName(n) });
      if (A.ses >= 40 && A.w / A.ses < 3) add('frag:' + n, 2, 'fc.agent.r.frag', { a: appName(n), n: A.ses });
    });
    if (rep) add('rep:' + rep.a, 3, 'fc.agent.r.repeat', { a: appName(rep.a), x: rep.x, n: rep.n });
    var old = tot.tasks.filter(function (t) { return now().getTime() - t.since > 3 * 86400000; });
    if (old.length) add('tasks', 5, 'fc.agent.r.tasks', { n: old.length, x: old.slice(0, 3).map(function (t) { return t.label + ' (' + appName(t.app) + ')'; }).join(', ') });
    var dn = Object.keys(tot.days).length;
    if (dn >= 5) add('streak', 1, 'fc.agent.r.streak', { n: dn });
    try { if (FC.updater && FC.updater.state().plan) add('update', 3, 'fc.agent.r.update'); } catch (e) {}
    return out.sort(function (a, b) { return b.prio - a.prio; });
  }
  function notes() { var n = S().get('agent.notes', []); return Array.isArray(n) ? n : []; }
  function noteText(n) { return n.text != null ? (typeof n.text === 'string' ? n.text : FC.i18n.pick(n.text)) : T(n.key, n.vars); }
  function unread() { return notes().filter(function (n) { return !n.read; }).length; }
  /** Aynı kural 3 gün içinde aynı değerle tekrar yazılmaz. */
  function addNotes(list, src) {
    var all = notes(), t = now().getTime(), fresh = [];
    list.forEach(function (r) {
      var sig = (r.id || '') + '|' + JSON.stringify(r.vars || r.text || '');
      var dup = all.some(function (n) { return n.sig === sig && t - n.t < 3 * 86400000; });
      if (dup) return;
      var n = { id: t.toString(36) + Math.random().toString(36).slice(2, 6), t: t, sig: sig, src: src, rid: r.id, key: r.key, vars: r.vars, text: r.text, prio: r.prio || 2, read: false };
      all.unshift(n); fresh.push(n);
    });
    S().set('agent.notes', all.slice(0, MAX_NOTES));
    return fresh;
  }
  function aiCfg() { var a = run.ai ? safe(run.ai) : S().get('ai', null); return a && a.key && a.provider ? a : null; }
  function aiCallsToday() { var d = S().get('agent.ai', null); return d && d.d === dayKey() ? d.n : 0; }
  function digest(sm) {
    var apps = {};
    for (var n in sm.apps) { var A = sm.apps[n], top = Object.keys(A.a).sort(function (x, y) { return A.a[y] - A.a[x]; }).slice(0, 8); apps[appName(n)] = { weekMin: A.w, prevWeekMin: A.pw, sessions: A.ses, errors: A.err, topActions: top.map(function (k) { return k + ' ×' + A.a[k]; }) }; }
    return { weekMin: sm.tot.w, prevWeekMin: sm.tot.pw, activeDays: Object.keys(sm.tot.days).length, longestStretchMin: sm.tot.mx, minutesByHour: sm.tot.h, openTasks: sm.tot.tasks.length, apps: apps };
  }
  function prompt(sm) {
    var L = { tr: 'Türkçe', en: 'English', ar: 'العربية' }[FC.i18n.lang()] || 'Türkçe';
    return 'You are a friendly productivity coach inside a set of free desktop/mobile apps. Below are anonymous usage COUNTS (no content) of one person across their apps over the last 7 days compared to the 7 days before. ' +
      'Write 3 to 5 short, concrete, encouraging suggestions to improve how they work (focus, breaks, routines, using features better, finishing open tasks, syncing/backups). ' +
      'Each suggestion max 2 sentences, in ' + L + '. Answer ONLY with a JSON array of strings.\n\n' + JSON.stringify(digest(sm));
  }
  function askAi(sm) {
    var a = aiCfg(), f = run.fetch || g.fetch, k = a && a.key, u, h = { 'Content-Type': 'application/json' }, body, pick;
    if (!a || !f) return Promise.reject(new Error('NO_AI'));
    var p = prompt(sm), M = run.models || {};
    if (a.provider === 'gemini') { u = 'https://generativelanguage.googleapis.com/v1beta/models/' + (a.model || M.gemini || 'gemini-flash-latest') + ':generateContent?key=' + encodeURIComponent(k); body = { contents: [{ parts: [{ text: p }] }] }; pick = function (j) { return j.candidates[0].content.parts[0].text; }; }
    else if (a.provider === 'anthropic') { u = 'https://api.anthropic.com/v1/messages'; h['x-api-key'] = k; h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true'; body = { model: a.model || M.anthropic || 'claude-haiku-5-5', max_tokens: 700, messages: [{ role: 'user', content: p }] }; pick = function (j) { return j.content[0].text; }; }
    else { u = a.provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'; h.Authorization = 'Bearer ' + k; body = { model: a.model || (a.provider === 'groq' ? (M.groq || 'llama-3.3-70b-versatile') : (M.openai || 'gpt-4o-mini')), messages: [{ role: 'user', content: p }] }; pick = function (j) { return j.choices[0].message.content; }; }
    S().set('agent.ai', { d: dayKey(), n: aiCallsToday() + 1 });
    if (FC.usage) FC.usage.count('ai.' + a.provider);
    return f(u, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) { if (r.status === 429 && FC.usage) FC.usage.count('ai.' + a.provider + '.full'); throw new Error('HTTP_' + r.status); }
      return r.json();
    }).then(function (j) {
      var s = String(pick(j) || ''), m = s.match(/\[[\s\S]*\]/), arr = [];
      try { arr = JSON.parse(m ? m[0] : s); } catch (e) { arr = s.split(/\n+/).map(function (x) { return x.replace(/^[\s\-*\d.)]+/, ''); }); }
      arr = (Array.isArray(arr) ? arr : []).map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 5);
      if (!arr.length) throw new Error('EMPTY');
      var l = FC.i18n.lang();
      return arr.map(function (x, i) { var t = {}; t[l] = x.slice(0, 400); return { id: 'ai' + i, prio: 3, text: t }; });
    });
  }
  function due(c) {
    var last = S().get('agent.lastRun', 0) || 0, t = now().getTime();
    if (c.freq === 'manual') return false;
    if (c.freq === 'instant') return t - last >= CHECK_MS;
    if (c.freq === 'weekly') return t - last >= 7 * 86400000;
    return dayKey(new Date(last)) !== dayKey() && t - last >= 12 * 3600000;
  }
  /** Analiz: çevrim dışı kurallar her zaman; çevrim içi AI uygunsa eklenir. → yeni notlar */
  function analyze(manual) {
    var c = cfg();
    if (!c.on) return Promise.resolve([]);
    if (run.busy) return run.busy;
    S().set('agent.lastRun', now().getTime());
    var sm, online = (g.navigator && g.navigator.onLine === false) ? false : true;
    run.busy = share(true).then(function () {
      sm = summary();
      var fresh = addNotes(rules(sm).slice(0, manual ? 6 : 4), 'offline');
      var useAi = c.ai && online && aiCfg() && aiCallsToday() < run.aiPerDay && (manual || c.freq !== 'instant' || aiCallsToday() === 0);
      if (!useAi) return fresh;
      return askAi(sm).then(function (list) { return fresh.concat(addNotes(list, 'ai')); }, function () { return fresh; });
    }).then(function (fresh) { run.busy = null; deliver(fresh); emit(); return fresh; }, function () { run.busy = null; return []; });
    return run.busy;
  }
  function schedule() { var c = cfg(); if (c.on && due(c)) analyze(false); }

  /* ---------- teslim: bildirim + panel ---------- */
  function deliver(fresh) {
    var c = cfg(); if (!fresh || !fresh.length) return;
    var top = fresh.slice().sort(function (a, b) { return b.prio - a.prio; })[0];
    var title = T('fc.agent.title') + (fresh.length > 1 ? ' (' + fresh.length + ')' : ''), body = noteText(top);
    if (c.notify) notify(title, body);
    else if (c.panel && FC.ui && g.document && g.document.body) FC.ui.toast(T('fc.agent.newNotes', { n: fresh.length }), 'info');
  }
  function notify(title, body) {
    try {
      if (run.notifyFn) { try { if (run.notifyFn(String(title), String(body)) !== false) return true; } catch (e) {} }
      var A = g.AndroidBridge;
      if (A && typeof A.notify === 'function') { A.notify(String(title), String(body)); return true; }
      var N = g.Notification;
      if (N && N.permission === 'granted') { var n = new N(title, { body: body, tag: 'fc-agent' }); n.onclick = function () { try { g.focus(); } catch (e) {} if (cfg().panel) show(); }; return true; }
      if (N && N.permission === 'default' && N.requestPermission) N.requestPermission().then(function (p) { if (p === 'granted') notify(title, body); });
      else if (FC.ui && g.document && g.document.body) FC.ui.toast(title + ': ' + body, 'info', 7000);
    } catch (e) {}
    return false;
  }
  function draw() {
    var c = cfg(), n = unread();
    run.btns.forEach(function (b) {
      b.style.display = c.on && c.panel ? '' : 'none';
      b.innerHTML = FC.ui.icon('sparkles') + (n ? '<span class="sync-badge">' + (n > 99 ? '99+' : n) + '</span>' : '');
      b.title = T('fc.agent.title'); b.setAttribute('aria-label', T('fc.agent.title') + (n ? ' (' + n + ')' : ''));
    });
  }
  function emit() { if (g.document) draw(); run.subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function button() { var b = FC.ui.el('button.icon-btn.agent-btn', { type: 'button', 'data-fc-agent': '' }); b.addEventListener('click', function () { show(); }); run.btns.push(b); draw(); FC.i18n.onChange(draw); return b; }
  function fmtTime(t) { try { return new Date(t).toLocaleString(FC.i18n.locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function statsBox(sm) {
    var ui = FC.ui, el = ui.el, box = el('div.fc-agent-stats');
    box.appendChild(el('div.fc-row', { style: 'margin:0 0 8px' }, [
      el('span.fc-agent-chip', { text: T('fc.agent.week', { t: hm(sm.tot.w) }) }),
      el('span.fc-agent-chip', { text: T('fc.agent.days', { n: Object.keys(sm.tot.days).length }) }),
      el('span.fc-agent-chip', { text: T('fc.agent.open', { n: sm.tot.tasks.length }) })]));
    var names = Object.keys(sm.apps).filter(function (n) { return sm.apps[n].w > 0; }).sort(function (a, b) { return sm.apps[b].w - sm.apps[a].w; });
    var max = names.length ? sm.apps[names[0]].w : 1;
    names.slice(0, 8).forEach(function (n) {
      var w = sm.apps[n].w;
      box.appendChild(el('div.fc-agent-bar', null, [el('span.fc-agent-bar-l', { text: appName(n) }), el('span.fc-agent-bar-t', null, [el('span.fc-agent-bar-f', { style: 'width:' + Math.max(4, Math.round(w / max * 100)) + '%' })]), el('span.fc-agent-bar-v', { text: hm(w) })]));
    });
    return box;
  }
  function show() {
    var ui = FC.ui, el = ui.el, body = el('div', { 'data-fc-agent': '' }), m;
    function render() {
      body.innerHTML = '';
      var sm = summary();
      body.appendChild(statsBox(sm));
      body.appendChild(el('div.fc-sub', { text: T('fc.agent.notes') }));
      var list = notes();
      if (!list.length) body.appendChild(el('p.muted', { text: T('fc.agent.none') }));
      list.slice(0, 30).forEach(function (n) {
        body.appendChild(el('div.fc-ann.fc-agent-note' + (n.read ? '' : '.unread'), null, [
          el('div.fc-date', null, [el('span.fc-agent-chip' + (n.src === 'ai' ? '.ai' : ''), { text: T(n.src === 'ai' ? 'fc.agent.srcAi' : 'fc.agent.srcOff') }), ' ' + fmtTime(n.t)]),
          el('div.fc-text', { text: noteText(n), dir: 'auto' })]));
      });
    }
    render();
    m = ui.modal({ title: T('fc.agent.title'), icon: 'sparkles', body: body, onClose: markRead, buttons: [
      { label: T('fc.agent.analyze'), icon: 'zap', onClick: function (close, btn) { btn.disabled = true; analyze(true).then(function () { btn.disabled = false; render(); }); return false; } },
      'spacer', { label: T('fc.close'), cls: 'primary' }] });
    return m;
  }
  function markRead() { var all = notes(); all.forEach(function (n) { n.read = true; }); S().set('agent.notes', all); emit(); }

  /* ---------- ayarlar kartı ---------- */
  function card() {
    var ui = FC.ui, el = ui.el, c = ui.card({ key: 'agent', title: '', icon: 'sparkles' });
    c.setAttribute('data-fc-agent', '');
    function chk(key, label, hint) {
      var cb = el('input', { type: 'checkbox' }); cb.checked = !!cfg()[key];
      cb.addEventListener('change', function () { var p = {}; p[key] = cb.checked; setCfg(p); if (key === 'notify' && cb.checked) { try { if (g.Notification && g.Notification.permission === 'default') g.Notification.requestPermission(); } catch (e) {} } draw2(); });
      return el('label.check', { title: hint || '' }, [cb, el('span', { text: label })]);
    }
    function draw2() {
      var o = cfg(); c.innerHTML = '';
      c.appendChild(el('h3.card-title', { html: ui.icon('sparkles') + '<span>' + ui.esc(T('fc.agent.title')) + '</span>' }));
      c.appendChild(el('p.card-desc', { text: T('fc.agent.desc') }));
      c.appendChild(chk('on', T('fc.agent.on')));
      if (o.on) {
        c.appendChild(chk('notify', T('fc.agent.notify')));
        c.appendChild(chk('panel', T('fc.agent.panel')));
        c.appendChild(chk('ai', T('fc.agent.ai')));
        if (o.ai && !aiCfg()) c.appendChild(el('p.field-hint', { text: T('fc.agent.noKey'), style: 'margin:4px 0 0' }));
        var sel = el('select', { 'aria-label': T('fc.agent.freq') });
        FREQ.forEach(function (f) { sel.appendChild(el('option', { value: f, text: T('fc.agent.freq.' + f) })); });
        sel.value = o.freq; sel.addEventListener('change', function () { setCfg({ freq: sel.value }); });
        c.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.agent.freq') }), sel]));
        var apps = knownApps();
        c.appendChild(el('div.fc-sub', { text: T('fc.agent.apps') }));
        apps.forEach(function (a) {
          var cb = el('input', { type: 'checkbox' }); cb.checked = !o.apps || o.apps.indexOf(a) >= 0;
          cb.addEventListener('change', function () { var cur = cfg().apps || apps.slice(); cur = cur.filter(function (x) { return x !== a; }); if (cb.checked) cur.push(a); setCfg({ apps: cur.length >= knownApps().length ? null : cur }); });
          c.appendChild(el('label.check', null, [cb, el('span', { text: appName(a) })]));
        });
        c.appendChild(el('p.field-hint', { text: T('fc.agent.appsHint'), style: 'margin:6px 0 0' }));
        var sm = summary();
        c.appendChild(el('p.field-hint', { text: T('fc.agent.status', { t: hm(sm.tot.w), n: notes().length, a: aiCallsToday(), m: run.aiPerDay }), style: 'margin:10px 0 0' }));
        c.appendChild(el('div.fc-row', null, [
          el('button.btn.small.primary', { type: 'button', html: ui.icon('zap') + ui.esc(T('fc.agent.analyze')), onclick: function (e) { var b = e.currentTarget; b.disabled = true; analyze(true).then(function (f) { b.disabled = false; FC.ui.toast(f.length ? T('fc.agent.newNotes', { n: f.length }) : T('fc.agent.nothing'), 'info'); draw2(); }); } }),
          el('button.btn.small', { type: 'button', html: ui.icon('sparkles') + ui.esc(T('fc.agent.showNotes')), onclick: function () { show(); } }),
          el('button.btn.small', { type: 'button', text: T('fc.agent.clear'), onclick: function () { FC.ui.modal({ title: T('fc.agent.clear'), cls: 'small', body: ui.el('p', { text: T('fc.agent.clearQ') }), buttons: [{ label: T('fc.cancel') }, { label: T('fc.agent.clear'), cls: 'primary', onClick: function () { clearAll(); draw2(); } }] }); } })]));
      }
      c.appendChild(el('p.field-hint', { text: T('fc.agent.privacy'), style: 'margin:10px 0 0' }));
    }
    draw2(); FC.i18n.onChange(draw2); run.subs.push(function () { if (c.isConnected && !c.contains(g.document.activeElement)) draw2(); });
    return c;
  }
  function clearAll() { ['agent.mine', 'agent.peers', 'agent.notes', 'agent.lastRun', 'agent.shareAt'].forEach(function (k) { S().remove(k); }); var ha = hostAgent(); if (ha && ha.remove) try { ha.remove(srcKey()); } catch (e) {} emit(); }

  /* ---------- başlat ---------- */
  function start(o) {
    o = o || {};
    if (o.now) run.now = o.now; if (o.fetch) run.fetch = o.fetch; if (o.aiPerDay != null) run.aiPerDay = +o.aiPerDay; if (o.models) run.models = o.models; if (o.ai) run.ai = o.ai; if (o.notify) run.notifyFn = o.notify; if (o.firebase) run.firebase = o.firebase;
    run.app = String(o.app || run.app || 'app'); run.version = String(o.version || ''); if (o.sync) run.syncSeen = true;
    if (run.started) return api; run.started = true;
    if (!cfg().on) return api;
    var m = mine(); today(m).ses += 1; save(m); input();
    if (FC.crash && FC.crash.report && !FC.crash.report._agent) {
      var orig = FC.crash.report;
      FC.crash.report = function () { try { var mm = mine(); today(mm).err += 1; save(mm); } catch (e) {} return orig.apply(this, arguments); };
      FC.crash.report._agent = true;
    }
    var d = g.document;
    if (d && d.addEventListener) {
      d.addEventListener('click', onClick, true);
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { d.addEventListener(ev, input, { capture: true, passive: true }); });
      if (g.addEventListener) g.addEventListener('hashchange', function () { track('sayfa ' + String(g.location.hash || '').split(/[?&]/)[0].slice(0, 30)); });
    }
    if (o.timers !== false) {
      run.timers.push(setInterval(tick, TICK_MS));
      run.timers.push(setInterval(function () { share(false); schedule(); }, CHECK_MS));
      run.timers.push(setTimeout(function () { share(true).then(schedule); }, o.firstDelayMs == null ? 20000 : o.firstDelayMs));
    }
    return api;
  }
  function stop() { run.timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); run.timers = []; }

  if (FC.i18n) FC.i18n.add({
    tr: {
      'fc.agent.app.kitaplik': 'Kitaplık', 'fc.agent.app.falcon-ofis': 'Falcon Ofis', 'fc.agent.app.mahzen': 'Mahzen', 'fc.agent.app.bereket-defter': 'Bereket Defter', 'fc.agent.app.organizer': 'Düzenli Evim', 'fc.agent.app.aile-ajandasi': 'Aile Ajandası', 'fc.agent.app.ajandam': 'Ajandam', 'fc.agent.app.cv-maker': 'CV Maker', 'fc.agent.app.sinav-hazirlama': 'Sınav Hazırlama', 'fc.agent.app.baski-hesabi': 'Baskı Hesabı', 'fc.agent.app.comm-calc': 'Comm Calc', 'fc.agent.app.merkezi-servis': 'Merkezi Servis', 'fc.agent.app.ofis-gunlugu': 'Ofis Günlüğü', 'fc.agent.app.pixhawk-log-analiz': 'Pixhawk Log Analiz', 'fc.agent.app.kalori-hesaplayici': 'Kalori Hesaplayıcı', 'fc.agent.app.ing-mufredat': 'İngilizce Müfredat', 'fc.agent.app.iha-mufredat': 'İHA Müfredat', 'fc.agent.app.tv-bakim': 'TV Bakım', 'fc.agent.app.desktop-duzen': 'Masaüstü Düzen',
      'fc.agent.title': 'Asistan Agent', 'fc.agent.desc': 'Tüm uygulamalarınızdaki çalışmanızı izler ve daha verimli çalışmanız için yorum yapar.',
      'fc.agent.on': 'Agent açık', 'fc.agent.notify': 'Önerileri bildirim olarak göster', 'fc.agent.panel': 'Uygulama içi panel (✦ düğmesi)',
      'fc.agent.ai': 'Çevrim içi yapay zeka yorumları (kendi anahtarınızla; internet yoksa çevrim dışı kurallar)', 'fc.agent.noKey': 'Yapay zeka anahtarı bağlı değil; şimdilik yalnız çevrim dışı yorumlar yapılır. Anahtarı programın yapay zeka / kurulum ayarından ekleyebilirsiniz.',
      'fc.agent.freq': 'Yorum sıklığı', 'fc.agent.freq.instant': 'Anlık (yarım saatte bir)', 'fc.agent.freq.daily': 'Günlük', 'fc.agent.freq.weekly': 'Haftalık', 'fc.agent.freq.manual': 'Yalnızca istediğimde',
      'fc.agent.apps': 'İzlenen uygulamalar', 'fc.agent.appsHint': 'Diğer uygulamalar; aynı bilgisayarda, kendi Firebase hesabınızla ya da Wi-Fi eşitlemesiyle göründükçe listeye eklenir.',
      'fc.agent.status': 'Bu hafta: {t} · {n} yorum · bugün yapay zeka: {a}/{m}', 'fc.agent.analyze': 'Şimdi analiz et', 'fc.agent.showNotes': 'Yorumları göster', 'fc.agent.clear': 'Kayıtları sil',
      'fc.agent.clearQ': 'Agent\'ın bu cihazdaki tüm sayaçları ve yorumları silinsin mi? Uygulama verileriniz etkilenmez.',
      'fc.agent.privacy': 'Gizlilik: yalnızca sayılar tutulur (süre, düğme adları, saatler). Yazdıklarınız ve kayıt içerikleri asla okunmaz; veriler cihazınızda ve kendi hesaplarınızda kalır.',
      'fc.agent.notes': 'Yorumlar', 'fc.agent.none': 'Henüz yorum yok. Biraz çalıştıktan sonra ya da “Şimdi analiz et” ile yorumlar burada görünür.',
      'fc.agent.srcAi': 'Yapay zeka', 'fc.agent.srcOff': 'Çevrim dışı', 'fc.agent.newNotes': 'Asistan Agent {n} yeni yorum yaptı', 'fc.agent.nothing': 'Yeni bir yorum yok; her şey yolunda görünüyor.',
      'fc.agent.week': 'Bu hafta {t}', 'fc.agent.days': '{n}/7 gün etkin', 'fc.agent.open': '{n} açık iş', 'fc.agent.hm': '{h} sa {m} dk', 'fc.agent.m': '{m} dk',
      'fc.agent.r.start': 'Merhaba! Çalışmanızı izlemeye başladım. Birkaç gün sonra size özel öneriler yapacağım.',
      'fc.agent.r.up': 'Bu hafta geçen haftaya göre %{p} daha fazla çalıştınız ({t}). Harika bir tempo; düzenli molaları unutmayın.',
      'fc.agent.r.down': 'Bu hafta çalışma süreniz geçen haftaya göre %{p} azaldı ({t}). Günün belli bir saatini düzenli işlere ayırmak ritmi geri getirir.',
      'fc.agent.r.top': 'Bu hafta zamanınızın %{p}\'ini {a} uygulamasında geçirdiniz ({n} uygulama kullanıldı). Diğer işlerin geride kalmadığından emin olun.',
      'fc.agent.r.night': 'Çalışmanızın %{p}\'i gece 23:00–05:00 arasında. Önemli işleri gündüze almak hem hatayı hem yorgunluğu azaltır.',
      'fc.agent.r.break': 'Bir oturumda {t} ara vermeden çalıştınız. Her 50–60 dakikada 5 dakikalık mola odağı korur.',
      'fc.agent.r.peak': 'En verimli saatiniz {h}–{h2}. Zor ve önemli işleri bu saate planlayın.',
      'fc.agent.r.repeat': '{a} içinde “{x}” işlemini bu hafta {n} kez yaptınız. Bunun için bir şablon, kısayol ya da toplu işlem kullanmak zaman kazandırır.',
      'fc.agent.r.sync': '{a} içinde bu hafta hiç eşitleme yapılmadı. Verilerinizin yedeği için Eşitle düğmesini kullanın.',
      'fc.agent.r.err': '{a} bu hafta {n} kez hata verdi. Güncellemeyi kontrol edin; sürerse Ayarlar → Admin ile iletişim\'den bildirin.',
      'fc.agent.r.idle': '{a} bu hafta hiç açılmadı. Bekleyen işiniz varsa kısa bir göz atmak iyi olabilir.',
      'fc.agent.r.frag': '{a} bu hafta {n} kez kısa süreli açıldı. İşleri gruplayıp tek seferde yapmak bölünmeyi azaltır.',
      'fc.agent.r.tasks': '3 günden uzun süredir açık {n} işiniz var: {x}. Bugün birini bitirmeyi deneyin.',
      'fc.agent.r.streak': 'Bu hafta {n} gün düzenli çalıştınız. Süreklilik en büyük güç; böyle devam!',
      'fc.agent.r.update': 'Yeni bir güncelleme hazır. Tek tıkla güncelleyerek son iyileştirmelerden yararlanın.'
    },
    en: {
      'fc.agent.app.kitaplik': 'Library', 'fc.agent.app.mahzen': 'Cellar', 'fc.agent.app.bereket-defter': 'Bereket Ledger', 'fc.agent.app.organizer': 'Tidy Home', 'fc.agent.app.aile-ajandasi': 'Family Planner', 'fc.agent.app.ajandam': 'My Planner', 'fc.agent.app.sinav-hazirlama': 'Exam Builder', 'fc.agent.app.baski-hesabi': 'Print Cost', 'fc.agent.app.merkezi-servis': 'Central Shuttle', 'fc.agent.app.ofis-gunlugu': 'Office Log', 'fc.agent.app.kalori-hesaplayici': 'Calorie Calculator', 'fc.agent.app.ing-mufredat': 'English Curriculum', 'fc.agent.app.iha-mufredat': 'UAV Curriculum', 'fc.agent.app.tv-bakim': 'TV Care',
      'fc.agent.title': 'Assistant Agent', 'fc.agent.desc': 'Follows your work across all your apps and comments on how to work more effectively.',
      'fc.agent.on': 'Agent on', 'fc.agent.notify': 'Show suggestions as notifications', 'fc.agent.panel': 'In-app panel (✦ button)',
      'fc.agent.ai': 'Online AI comments (with your own key; offline rules when there is no internet)', 'fc.agent.noKey': 'No AI key connected; only offline comments for now. You can add a key in the program\'s AI / setup settings.',
      'fc.agent.freq': 'Comment frequency', 'fc.agent.freq.instant': 'Instant (every half hour)', 'fc.agent.freq.daily': 'Daily', 'fc.agent.freq.weekly': 'Weekly', 'fc.agent.freq.manual': 'Only when I ask',
      'fc.agent.apps': 'Watched apps', 'fc.agent.appsHint': 'Other apps are added as they appear on the same computer, on your own Firebase account or via Wi-Fi sync.',
      'fc.agent.status': 'This week: {t} · {n} comments · AI today: {a}/{m}', 'fc.agent.analyze': 'Analyse now', 'fc.agent.showNotes': 'Show comments', 'fc.agent.clear': 'Clear records',
      'fc.agent.clearQ': 'Delete all of the agent\'s counters and comments on this device? Your app data is not affected.',
      'fc.agent.privacy': 'Privacy: only numbers are kept (time, button names, hours). What you type and your records are never read; data stays on your device and your own accounts.',
      'fc.agent.notes': 'Comments', 'fc.agent.none': 'No comments yet. They will appear here after some work or with “Analyse now”.',
      'fc.agent.srcAi': 'AI', 'fc.agent.srcOff': 'Offline', 'fc.agent.newNotes': 'Assistant Agent made {n} new comments', 'fc.agent.nothing': 'No new comments; everything looks fine.',
      'fc.agent.week': 'This week {t}', 'fc.agent.days': '{n}/7 days active', 'fc.agent.open': '{n} open tasks', 'fc.agent.hm': '{h} h {m} min', 'fc.agent.m': '{m} min',
      'fc.agent.r.start': 'Hello! I have started following your work. In a few days I will make suggestions just for you.',
      'fc.agent.r.up': 'You worked {p}% more this week than last week ({t}). Great pace — don\'t forget regular breaks.',
      'fc.agent.r.down': 'Your working time dropped {p}% compared with last week ({t}). Setting a fixed hour for routine work brings the rhythm back.',
      'fc.agent.r.top': 'You spent {p}% of your time this week in {a} ({n} apps used). Make sure other work isn\'t falling behind.',
      'fc.agent.r.night': '{p}% of your work is between 23:00 and 05:00. Moving important tasks to daytime reduces mistakes and fatigue.',
      'fc.agent.r.break': 'You worked {t} without a break in one session. A 5-minute break every 50–60 minutes keeps you focused.',
      'fc.agent.r.peak': 'Your most productive hour is {h}–{h2}. Plan hard and important work for that time.',
      'fc.agent.r.repeat': 'You did “{x}” {n} times this week in {a}. A template, shortcut or bulk action would save time.',
      'fc.agent.r.sync': 'No sync was done in {a} this week. Use the Sync button to keep a backup of your data.',
      'fc.agent.r.err': '{a} had {n} errors this week. Check for updates; if it continues, report it via Settings → Contact admin.',
      'fc.agent.r.idle': '{a} was not opened this week. If something is pending there, a quick look may help.',
      'fc.agent.r.frag': '{a} was opened {n} times for short periods this week. Grouping tasks and doing them at once reduces interruptions.',
      'fc.agent.r.tasks': 'You have {n} tasks open for more than 3 days: {x}. Try to finish one today.',
      'fc.agent.r.streak': 'You worked steadily on {n} days this week. Consistency is the biggest strength — keep going!',
      'fc.agent.r.update': 'A new update is ready. Update with one click to get the latest improvements.'
    },
    ar: {
      'fc.agent.app.kitaplik': 'المكتبة', 'fc.agent.app.mahzen': 'المخزن', 'fc.agent.app.bereket-defter': 'دفتر البركة', 'fc.agent.app.organizer': 'بيتي المنظّم', 'fc.agent.app.aile-ajandasi': 'أجندة العائلة', 'fc.agent.app.ajandam': 'أجندتي', 'fc.agent.app.sinav-hazirlama': 'إعداد الاختبارات', 'fc.agent.app.baski-hesabi': 'حساب الطباعة', 'fc.agent.app.merkezi-servis': 'الخدمة المركزية', 'fc.agent.app.ofis-gunlugu': 'يوميات المكتب', 'fc.agent.app.kalori-hesaplayici': 'حاسبة السعرات', 'fc.agent.app.ing-mufredat': 'منهج الإنجليزية', 'fc.agent.app.iha-mufredat': 'منهج الطائرات المسيّرة', 'fc.agent.app.tv-bakim': 'صيانة التلفاز',
      'fc.agent.title': 'الوكيل المساعد', 'fc.agent.desc': 'يتابع عملك في جميع تطبيقاتك ويقدّم ملاحظات لتعمل بكفاءة أكبر.',
      'fc.agent.on': 'تشغيل الوكيل', 'fc.agent.notify': 'عرض الاقتراحات كإشعارات', 'fc.agent.panel': 'لوحة داخل التطبيق (زر ✦)',
      'fc.agent.ai': 'ملاحظات الذكاء الاصطناعي عبر الإنترنت (بمفتاحك الخاص؛ قواعد دون اتصال عند انقطاع الإنترنت)', 'fc.agent.noKey': 'لا يوجد مفتاح ذكاء اصطناعي مرتبط؛ الملاحظات الآن دون اتصال فقط. يمكنك إضافة المفتاح من إعدادات الذكاء الاصطناعي / الإعداد في البرنامج.',
      'fc.agent.freq': 'تكرار الملاحظات', 'fc.agent.freq.instant': 'فوري (كل نصف ساعة)', 'fc.agent.freq.daily': 'يومي', 'fc.agent.freq.weekly': 'أسبوعي', 'fc.agent.freq.manual': 'فقط عندما أطلب',
      'fc.agent.apps': 'التطبيقات المتابَعة', 'fc.agent.appsHint': 'تُضاف التطبيقات الأخرى عند ظهورها على الحاسوب نفسه أو في حساب Firebase الخاص بك أو عبر مزامنة Wi-Fi.',
      'fc.agent.status': 'هذا الأسبوع: {t} · {n} ملاحظة · الذكاء الاصطناعي اليوم: {a}/{m}', 'fc.agent.analyze': 'حلّل الآن', 'fc.agent.showNotes': 'عرض الملاحظات', 'fc.agent.clear': 'حذف السجلات',
      'fc.agent.clearQ': 'هل تريد حذف جميع عدّادات الوكيل وملاحظاته على هذا الجهاز؟ لا تتأثر بيانات تطبيقاتك.',
      'fc.agent.privacy': 'الخصوصية: تُحفظ الأرقام فقط (المدة، أسماء الأزرار، الساعات). لا تُقرأ كتاباتك ولا محتوى سجلاتك أبداً؛ تبقى البيانات على جهازك وفي حساباتك الخاصة.',
      'fc.agent.notes': 'الملاحظات', 'fc.agent.none': 'لا توجد ملاحظات بعد. ستظهر هنا بعد قليل من العمل أو عند الضغط على «حلّل الآن».',
      'fc.agent.srcAi': 'ذكاء اصطناعي', 'fc.agent.srcOff': 'دون اتصال', 'fc.agent.newNotes': 'قدّم الوكيل المساعد {n} ملاحظة جديدة', 'fc.agent.nothing': 'لا توجد ملاحظات جديدة؛ كل شيء يبدو جيداً.',
      'fc.agent.week': 'هذا الأسبوع {t}', 'fc.agent.days': '{n}/7 أيام نشطة', 'fc.agent.open': '{n} مهام مفتوحة', 'fc.agent.hm': '{h} س {m} د', 'fc.agent.m': '{m} د',
      'fc.agent.r.start': 'مرحباً! بدأت متابعة عملك. بعد بضعة أيام سأقدّم لك اقتراحات خاصة بك.',
      'fc.agent.r.up': 'عملت هذا الأسبوع أكثر بنسبة {p}% من الأسبوع الماضي ({t}). وتيرة رائعة؛ لا تنسَ الاستراحات المنتظمة.',
      'fc.agent.r.down': 'انخفض وقت عملك بنسبة {p}% مقارنة بالأسبوع الماضي ({t}). تخصيص ساعة ثابتة للأعمال المعتادة يعيد الإيقاع.',
      'fc.agent.r.top': 'قضيت {p}% من وقتك هذا الأسبوع في {a} (استُخدم {n} تطبيقات). تأكد من ألّا تتأخر الأعمال الأخرى.',
      'fc.agent.r.night': '{p}% من عملك بين 23:00 و05:00. نقل المهام المهمة إلى النهار يقلّل الأخطاء والتعب.',
      'fc.agent.r.break': 'عملت {t} دون استراحة في جلسة واحدة. استراحة 5 دقائق كل 50–60 دقيقة تحافظ على التركيز.',
      'fc.agent.r.peak': 'أكثر ساعاتك إنتاجية {h}–{h2}. خطّط للأعمال الصعبة والمهمة في هذا الوقت.',
      'fc.agent.r.repeat': 'نفّذت «{x}» {n} مرة هذا الأسبوع في {a}. استخدام قالب أو اختصار أو إجراء جماعي يوفّر الوقت.',
      'fc.agent.r.sync': 'لم تتم أي مزامنة في {a} هذا الأسبوع. استخدم زر المزامنة للاحتفاظ بنسخة احتياطية من بياناتك.',
      'fc.agent.r.err': 'ظهرت في {a} {n} أخطاء هذا الأسبوع. تحقّق من التحديثات؛ وإن استمرت فأبلغ عنها من الإعدادات ← التواصل مع المسؤول.',
      'fc.agent.r.idle': 'لم يُفتح {a} هذا الأسبوع. إن كان لديك عمل معلّق فيه فنظرة سريعة قد تفيد.',
      'fc.agent.r.frag': 'فُتح {a} {n} مرة لفترات قصيرة هذا الأسبوع. تجميع المهام وإنجازها دفعة واحدة يقلّل الانقطاع.',
      'fc.agent.r.tasks': 'لديك {n} مهام مفتوحة منذ أكثر من 3 أيام: {x}. حاول إنهاء واحدة اليوم.',
      'fc.agent.r.streak': 'عملت بانتظام {n} أيام هذا الأسبوع. الاستمرارية أكبر قوة؛ واصل!',
      'fc.agent.r.update': 'تحديث جديد جاهز. حدّث بنقرة واحدة للاستفادة من آخر التحسينات.'
    }
  });

  var api = { start: start, stop: stop, track: track, task: task, analyze: analyze, rules: rules, summary: summary, notes: notes, noteText: noteText, unread: unread,
    button: button, show: show, card: card, config: cfg, configure: setCfg, exportShare: exportShare, importShare: importShare, share: share, clear: clearAll,
    knownApps: knownApps, hasSync: function () { run.syncSeen = true; }, onChange: function (f) { run.subs.push(f); }, _tick: tick, _input: input, _clean: clean, _due: due,
    _reset: function () { stop(); run.started = false; run.subs = []; run.btns = []; run.busy = null; run.streak = 0; } };
  FC.agent = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- settings.js ---- */
/* FC.settings — Falcon .settings-grid kurucusu. Sıra: [Görünüm] · uygulamanın kartları · [Asistan Agent] · [Kullanım Limitleri] ·
   [Otomatik hata raporu] · [Hakkında] · Admin ile iletişim (HER ZAMAN SON).
     FC.settings.build(document.getElementById('ayarlar'), {
       cards: [benimKartim1, benimKartim2],   // DOM düğümleri
       usage: {project: () => cfg.projectId}, // false → yok
       look: true, crash: true, about: {version:'1.57.0'}, onboarding: {...sihirbaz seçenekleri}
     });
   Sonradan kart eklemek için grid.add(kart) — iletişim kartı yine sonda kalır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  function T(k, v) { return FC.t(k, v); }
  function about(o) {
    var ui = FC.ui, c = ui.card({ key: 'about', title: '', icon: 'info' });
    function draw() {
      c.innerHTML = '';
      c.appendChild(ui.el('h3.card-title', { html: ui.icon('info') + '<span>' + ui.esc(T('fc.settings.about')) + '</span>' }));
      var v = o.version || (FC.host && FC.host.version()) || '';
      c.appendChild(ui.el('p.card-desc', null, [T('fc.settings.version') + ' ', ui.el('span.version-badge', { text: 'v' + v, style: 'margin:0' })]));
      var row = ui.el('div.fc-row');
      if (FC.updater) row.appendChild(ui.el('button.btn.small', { type: 'button', html: ui.icon('download') + ui.esc(T('fc.update.check')), onclick: function () { FC.updater.check().then(function (p) { FC.ui.toast(p ? T('fc.update.avail', { v: p.version }) : FC.updater.state().error ? FC.updater.errorText(FC.updater.state().error) : T('fc.update.none', { v: v }), p ? 'info' : ''); }); } }));
      if (FC.whatsnew) row.appendChild(FC.whatsnew.button());
      if (FC.onboarding && o.onboarding !== false) row.appendChild(FC.onboarding.button(o.onboarding || {}));
      c.appendChild(row);
    }
    draw(); FC.i18n.onChange(draw);
    return c;
  }
  function build(container, o) {
    o = o || {};
    var grid = container.classList && container.classList.contains('settings-grid') ? container : FC.ui.el('div.settings-grid');
    if (grid !== container) container.appendChild(grid);
    if (o.look !== false && FC.look) grid.appendChild(FC.look.card());
    (o.cards || []).forEach(function (c) { if (c) grid.appendChild(c); });
    if (o.agent !== false && FC.agent) grid.appendChild(FC.agent.card());
    if (o.usage !== false && FC.usage) grid.appendChild(FC.usage.card(o.usage || {}));
    if (o.crash !== false && FC.crash) grid.appendChild(FC.crash.card());
    if (o.about !== false) grid.appendChild(about(o.about || {}));
    if (o.contact !== false && FC.contact) FC.contact.mount(grid);
    return {
      el: grid,
      add: function (card) { var last = grid.querySelector('[data-fc-card="contact"]'); grid.insertBefore(card, last && last.parentNode === grid ? last : null); return card; }
    };
  }
  var api = { build: build, about: about };
  FC.settings = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- topbar.js ---- */
/* FC.topbar — sağ üst sıra (Falcon .topbar-actions):
     [ek düğmeler] Eşitle · Wi-Fi · Güncelle · Tema · Dil | Küçült · Orta · Tam ekran · Kapat
   const tb = FC.topbar.mount(document.querySelector('.topbar'), {
     sync: {onClick: () => app.syncNow()},   // false → gizli
     lan:  {onClick: () => app.openLan()},
     before: [benimDugmem]                    // isteğe bağlı, Eşitle'nin önüne
   });
   tb.setSync('idle'|'syncing'|'error'|'off'|'offline', bekleyenSayisi);  tb.setLan('on'|'off'|'busy');
   Pencere düğmeleri FC.host.window.* çağırır; kabuğun desteklemediği düğme gösterilmez. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  function T(k, v) { return FC.t(k, v); }

  function mount(parent, o) {
    o = o || {};
    var ui = FC.ui, el = ui.el, icon = ui.icon, h = FC.host;
    var bar = el('div.topbar-actions');
    (o.before || []).forEach(function (n) { bar.appendChild(n); });
    if (FC.agent && o.agent !== false) bar.appendChild(FC.agent.button());
    var redraws = [];

    /* Eşitle */
    var syncState = o.sync && o.sync.state || 'off', syncBadge = 0, syncBtn = null;
    if (o.sync !== false) {
      syncBtn = el('button.btn.small.top-act.sync-act', { type: 'button', 'data-fc-track': 'fc.sync' });
      if (FC.agent) FC.agent.hasSync();
      syncBtn.addEventListener('click', function () { if (o.sync && o.sync.onClick) o.sync.onClick(syncState); });
      bar.appendChild(syncBtn);
      redraws.push(function () {
        var ic = syncState === 'off' ? 'cloudOff' : syncState === 'offline' ? 'cloudOff' : 'sync';
        syncBtn.className = 'btn small top-act sync-act ' + syncState;
        syncBtn.innerHTML = icon(ic) + '<span class="top-act-label">' + ui.esc(T('fc.sync')) + '</span>' + (syncBadge > 0 ? '<span class="sync-badge">' + (syncBadge > 99 ? '99+' : syncBadge) + '</span>' : '');
        var tip = T('fc.sync.' + syncState) + (syncBadge > 0 ? ' · ' + T('fc.sync.pending', { n: syncBadge }) : '');
        syncBtn.title = tip; syncBtn.setAttribute('aria-label', tip);
        syncBtn.disabled = syncState === 'syncing';
      });
    }
    /* Wi-Fi / LAN */
    var lanState = o.lan && o.lan.state || 'off', lanBtn = null;
    if (o.lan !== false) {
      lanBtn = el('button.icon-btn.lan-act', { type: 'button', 'data-fc-track': 'fc.sync.lan' });
      lanBtn.addEventListener('click', function () { if (o.lan && o.lan.onClick) o.lan.onClick(lanState); });
      bar.appendChild(lanBtn);
      redraws.push(function () {
        lanBtn.className = 'icon-btn lan-act ' + lanState;
        lanBtn.innerHTML = icon(lanState === 'off' ? 'wifiOff' : 'wifi', lanState === 'busy' ? 'fc-pulse' : '');
        var tip = T(lanState === 'on' ? 'fc.lan.on' : lanState === 'busy' ? 'fc.lan.busy' : 'fc.lan.off');
        lanBtn.title = tip; lanBtn.setAttribute('aria-label', tip);
      });
    }
    /* Güncelle */
    if (o.update !== false && FC.updater) {
      var wrap = el('div.top-act-wrap'), ub = el('button.btn.small.top-act.update-act', { type: 'button' });
      var float = el('div.update-float', { role: 'status' }); float.hidden = true;
      var pbox = FC.progress.box(); float.appendChild(pbox.el);
      var floatBtns = el('div.fc-row'); float.appendChild(floatBtns);
      wrap.appendChild(ub); wrap.appendChild(float); bar.appendChild(wrap);
      var us = FC.updater.state(), hideT = null, showResult = false, readyShown = false, readyHidden = false;
      function busy(s) { return ['downloading', 'verifying', 'installing', 'restarting'].indexOf(s) >= 0; }
      function drawUpdate() {
        var s = us.status, p = us.plan;
        var bgBusy = us.bg && !showResult && (busy(s) || s === 'queued');   // arka planda indiriliyor: kullanıcıyı rahatsız etme
        ub.className = 'btn small top-act update-act' + (s === 'available' || s === 'ready' ? ' avail' : '') + ((busy(s) && !bgBusy) || s === 'checking' ? ' busy' : '');
        ub.disabled = busy(s) && !us.bg;
        ub.innerHTML = icon(s === 'checking' ? 'sync' : 'download', s === 'checking' ? 'fc-spin' : '') + '<span class="top-act-label">' + ui.esc(T('fc.update')) + '</span>' + (s === 'available' || s === 'ready' ? '<span class="update-dot"></span>' : '');
        var tip = s === 'ready' && p ? T('fc.update.ready', { v: p.version }) : s === 'available' && p ? T('fc.update.avail', { v: p.version }) : s === 'none' ? T('fc.update.none', { v: us.current }) : T('fc.update.check');
        ub.title = tip; ub.setAttribute('aria-label', tip);
        floatBtns.innerHTML = '';
        if (bgBusy) float.hidden = true;
        else if (s === 'ready' && p) {
          float.hidden = false; pbox.busy(T('fc.update.ready', { v: p.version })); pbox.el.querySelector('.update-bar').hidden = true;
          floatBtns.appendChild(el('button.btn.small.primary', { type: 'button', html: icon('download') + ui.esc(T('fc.update.now')), onclick: function () { FC.updater.run().catch(function () {}); } }));
          if (!readyShown) { readyShown = true; clearTimeout(hideT); hideT = setTimeout(function () { showResult = false; readyHidden = true; drawUpdate(); }, 10000); }
          if (readyHidden && !showResult) float.hidden = true;
        } else if (busy(s)) {
          float.hidden = false;
          if (s === 'downloading' && us.progress) {
            pbox.title(us.fallback ? T('fc.update.fallback') : T('fc.update.downloading') + (p ? ' v' + p.version : ''));
            pbox.set(us.progress, { patch: us.mode === 'patch' });
          } else pbox.busy(T('fc.update.' + s));
        } else if (s === 'done') {
          float.hidden = false; pbox.busy(T('fc.update.done')); pbox.el.querySelector('.update-bar').hidden = true;
          clearTimeout(hideT); hideT = setTimeout(function () { float.hidden = true; }, 6000);
        } else if (showResult) {
          float.hidden = false;
          if (s === 'checking') pbox.busy(T('fc.update.checking'));
          else if (s === 'available' && p) {
            pbox.busy(T('fc.update.avail', { v: p.version }));
            pbox.el.querySelector('.update-bar').hidden = true;
            pbox.el.querySelector('.update-detail').textContent = T('fc.update.press') + ' · ' + FC.progress.mb(p.size) + (p.mode === 'patch' ? ' · ' + T('fc.update.patchMode') : '');
            floatBtns.appendChild(el('button.btn.small.primary', { type: 'button', html: icon('download') + ui.esc(T('fc.update')), onclick: function () { FC.updater.run().catch(function () {}); } }));
          } else if (s === 'none') { pbox.busy(T('fc.update.none', { v: us.current })); pbox.el.querySelector('.update-bar').hidden = true; }
          else if (s === 'error' || us.error) { pbox.busy(FC.updater.errorText(us.error)); pbox.el.querySelector('.update-bar').hidden = true; floatBtns.appendChild(el('button.btn.small', { type: 'button', text: T('fc.retry'), onclick: function () { FC.updater.check(); } })); }
          if (s !== 'checking' && s !== 'available') { clearTimeout(hideT); hideT = setTimeout(function () { showResult = false; float.hidden = true; }, 5000); }
        } else float.hidden = true;
        var bb = pbox.el.querySelector('.update-bar'); if (bb && (busy(s) || s === 'checking')) bb.hidden = false;
      }
      ub.addEventListener('click', function () {
        if (us.status === 'available' || us.status === 'ready') { showResult = false; FC.updater.run().catch(function () { showResult = true; drawUpdate(); }); }
        else if (us.bg) { showResult = true; drawUpdate(); }   // arka plandaki indirmenin ilerlemesini göster
        else { showResult = true; FC.updater.check(); drawUpdate(); }
      });
      g.document.addEventListener('mousedown', function (e) { if (showResult && !wrap.contains(e.target)) { showResult = false; drawUpdate(); } });
      FC.updater.subscribe(function (s) { us = s; drawUpdate(); });
      redraws.push(drawUpdate);
    }
    /* Tema + Dil */
    if (o.theme !== false && FC.look) bar.appendChild(FC.look.themeButton());
    if (o.lang !== false) bar.appendChild(FC.i18n.switcher());
    /* Pencere */
    var can = (h && h.can) || {};
    if (o.window !== false && (can.minimize || can.half || can.fullscreen || can.close)) {
      var wc = el('div.win-controls'), half = false, full = false;
      function wbtn(name, ic, fn, cls) { var b = el('button.icon-btn' + (cls ? '.' + cls : ''), { type: 'button', 'data-win': name, html: icon(ic) }); b.addEventListener('click', fn); wc.appendChild(b); return b; }
      var bMin = can.minimize && wbtn('minimize', 'minus', function () { h.window.minimize(); });
      var bHalf = can.half && wbtn('half', 'half', function () { h.window.half(); });
      var bFull = can.fullscreen && wbtn('fullscreen', 'full', function () { h.window.toggleFullscreen(); });
      var bClose = can.close && wbtn('close', 'x', function () { h.window.close(); }, 'danger');
      bar.appendChild(el('span.topbar-sep', { 'aria-hidden': 'true' }));
      bar.appendChild(wc);
      var drawWin = function () {
        [[bMin, 'fc.win.minimize'], [bHalf, half ? 'fc.win.restore' : 'fc.win.half'], [bFull, 'fc.win.fullscreen'], [bClose, 'fc.win.close']].forEach(function (x) { if (x[0]) { x[0].title = T(x[1]); x[0].setAttribute('aria-label', T(x[1])); } });
        if (bHalf) bHalf.setAttribute('aria-pressed', String(half));
        if (bFull) bFull.setAttribute('aria-pressed', String(full));
      };
      h.window.onState(function (s) { half = !!(s && s.half); full = !!(s && s.fullscreen); drawWin(); });
      h.window.state().then(function (s) { half = !!(s && s.half); full = !!(s && s.fullscreen); drawWin(); }, function () {});
      redraws.push(drawWin);
    }
    function redraw() { redraws.forEach(function (f) { f(); }); }
    redraw(); FC.i18n.onChange(redraw);
    if (parent) parent.appendChild(bar);
    return {
      el: bar,
      setSync: function (s, badge) { syncState = s || 'off'; syncBadge = +badge || 0; redraw(); },
      setLan: function (s) { lanState = s || 'off'; redraw(); },
      redraw: redraw
    };
  }
  var api = { mount: mount };
  FC.topbar = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- init.js ---- */
/* FC.init — tek çağrıda çekirdeği başlatır (her modül ayrıca tek başına da kullanılabilir).
     FC.init({app:'kitaplik', repo:'kitaplik', version:'2.5.0', announcements:true});
   Yapılan: dil + görünüm uygulanır, iletişim kuyruğu ve çökme raporu kurulur, güncelleme denetimi (açılış + 6 saat),
   "neler yeni" (güncellemeden sonraki ilk açılış; whatsnew:{notes, delayMs} ya da false), isteğe bağlı duyurular ve ilk açılış sihirbazı. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  FC.version = '1.2.0';
  FC.init = function (o) {
    o = o || {};
    var v = o.version || (FC.host && FC.host.version()) || '0.0.0';
    FC.i18n.apply(); FC.look.init();
    if (FC.contact) FC.contact.init({ app: o.app, version: v });
    if (FC.crash && o.crash !== false) FC.crash.init({ app: o.app, version: v });
    if (FC.updater && o.update !== false && (o.repo || o.manifestUrl)) FC.updater.start({ repo: o.repo, owner: o.owner, app: o.app, version: v, channel: o.channel, setupChannel: o.setupChannel, manifestUrl: o.manifestUrl });
    var wn = FC.whatsnew && o.whatsnew !== false ? FC.whatsnew.start(Object.assign({}, typeof o.whatsnew === 'object' && o.whatsnew ? o.whatsnew : {}, { version: v })) : false;
    if (FC.announcements && o.announcements) FC.announcements.start({ app: o.app, version: v, onUpdate: function () { FC.updater.run().catch(function () {}); } });
    if (FC.agent && o.agent !== false) FC.agent.start(Object.assign({ app: o.app, version: v }, o.agent || {}));
    if (FC.onboarding && o.onboarding && !wn) setTimeout(function () { FC.onboarding.maybeStart(o.onboarding); }, 600);
    return FC;
  };
  if (typeof module === 'object' && module.exports) module.exports = FC.init;
})(typeof globalThis !== 'undefined' ? globalThis : this);
