# CV Maker

Windows için CV hazırlama programı (Electron). Kurulumlu sürüm: `CV-Maker-Setup-<sürüm>.exe` (NSIS, tek tık, kullanıcı başına,
Türkçe / English / العربية). Tek kullanıcılık bir masaüstü aracıdır: bulut ya da Wi-Fi eşitlemesi yoktur.

Arayüz, güncelleme, pencere düğmeleri, Admin ile iletişim, çökme raporu, Kullanım Limitleri, ilk açılış rehberi, "neler yeni",
duyurular, renk şemaları ve Asistan Agent **ortak çekirdekten** gelir (departures-mil/ortak-cekirdek; kopyası `cekirdek/` ve
`src/cekirdek/`, commit `cekirdek/VERSION`'da). Uygulamaya özgü bağlantılar `src/kabuk.js`'tedir.

## Özellikler (2.2)
- **Analiz ve YZ** sekmesi (`src/pro.js`, kurallar `src/checks.js`): CV puanı ve denetimler (tarih çakışması/boşluk, eksik bilgi,
  zayıf ifade, ATS uyumu, sayfa sayısı, belge geçerliliği), hedef ülke teamülleri, tek sayfaya sığdırma (yazı küçültülmez),
  iş ilanı anahtar kelime eşleşmesi, yapay zekâ ile ilana göre uyarlama, ✦ metin iyileştirme, ön yazı, 3 dilli çeviri kopyası
  (kaynak değişince "güncellenmeli"), belge geçerlilik takvimi ve açılış hatırlatması.
- **Havacılık** (`src/aviation.js`): Lisanslar, Tip Yetkileri, Uçuş Saatleri tablosu, Sağlık Sertifikası, ICAO dil seviyesi,
  öneri listeleri (SHGM/EASA/GCAA/GACA…), meslek şablonları, 3 dilli havacılık sözlüğü (çevrim dışı çeviri yedeği).
- **Yapay zekâ** (`src/ai.js`): kullanıcının KENDİ anahtarı (Gemini / OpenAI / Anthropic / Groq, `FC.storage 'ai'`) → internet yoksa
  yerel model (Ollama, `FC.storage 'ai.local'`) → çevrim dışı kurallar. Çağrılar Kullanım Limitleri kartında sayılır.
- **Başvurular** sekmesi (`src/apps.js`): durum, gönderilen CV'nin o anki hâli, ön yazı, sonraki adım hatırlatması.
  Başvurular `cvs.json` içinde (`applications`) durur, CV'lerle birlikte yedeklenir.
- İçe/dışa aktarma: LinkedIn profil PDF'i, JSON Resume, Europass XML (v3.4); paylaşım sürümü; PDF üst bilgisi.
- QR kod (vCard ya da bağlantı, `qrcode-generator`, çevrim dışı); yeni şablonlar: ATS uyumlu, Havacılık, Europass tarzı.
- Fotoğraf: arka planı düz renge çevirme, parlaklık/kontrast, biyometrik ve kare oran. Yazım denetimi (sağ tık önerileri).

## Veriler ve yedekler
- Veriler: `%APPDATA%\CV Maker\data` (cvs.json, settings.json, attachments). Güncelleme ve yeniden kurulum dokunmaz;
  `package.json` → `name` / `productName` / `build.appId` bu yüzden değiştirilmez.
- Yedekler: `data\backups\` — her günün ilk açılışında, her güncellemeden (indirme başlarken), geri yüklemeden ve içe
  aktarmadan önce otomatik alınır, hiçbiri silinmez. Kullanılmayan ekler `backups\attachments-removed\` içine taşınır.
- Ayarlar → Veriler ve yedekler: yedek listesi, geri yükleme, eski taşınabilir sürümün "CV Maker Data" klasörünü içe aktarma.
- Sürüm geçmişi: `data\history\<cvId>\` — düzenlerken en çok 3 dakikada bir, aynısı yazılmaz; fotoğraf `history\photos\` altında
  tek kopya. Son 7 gün tamamı, 90 güne kadar günde bir, sonrası haftada bir tutulur (yedekler bundan bağımsızdır, silinmez).
- İsteğe bağlı şifreleme (Ayarlar → Gizlilik ve güvenlik): `cvs.json` ve geçmiş Windows DPAPI (Electron `safeStorage`) ile
  şifrelenir; `security.json` durumu tutar. Açılamayan şifreli verinin üzerine asla yazılmaz.

## Görünüm
Varsayılan şema Falcon; Ayarlar → Görünüm'den şema (Klasik = 2.0.x'in renkleri, Zümrüt, …), koyu/açık/otomatik mod,
yazı boyutu ve dil. Arayüz yazı tipleri gömülü Inter + Noto Sans Arabic. CV için "Inter + Noto Sans Arabic" yazı tipi
seçilirse PDF'e gömülür (`lib/pdf.js`).

## Güncellemeler
Program açılışta ve 6 saatte bir `https://github.com/departures-mil/cv-maker/releases/latest/download/latest.json` okur
(SPEC biçimi, ortak çekirdek). Sağ üstte **Güncelle**: tek tık; önce önceki sürümden yama (yalnızca değişen kısımlar),
olmazsa tam `app.asar`; yüzde, MB inen/toplam, kalan MB ve hız gösterilir. Program kapanınca dosya değiştirilir ve yeniden açılır.

**2.0.x köprüsü:** 2.0.x kendi güncelleyicisiyle aynı latest.json'u okur ama SPEC alanlarını tanımaz. Her yayından sonra
`legacy` işi `tools/eski-kanal.js` ile dosyaya eski alanları (`installer`, `url`, `sha256` …) ekler; 2.0.x tam kurulumu
bir kez indirip sessizce kurar (`/S --updated --force-run`), sonrası çekirdek güncellemesidir. Test: `test/eski-kanal.test.js`
(2.0.5'in güncelleyicisi `test/fixtures/v2.0.5` ile çalıştırılır).

## Yeni sürüm yayınlama
1. `package.json` sürümünü yükselt (semver X.Y.Z), `release-notes.json`'a o sürümün `tr` / `en` / `ar` notunu yaz.
2. `main` dalına gönder (ya da Actions → release → Run workflow, main). `.github/workflows/release.yml`:
   test (ubuntu, xvfb ile Electron açılış testi) → derleme (windows: NSIS + app.asar) → ortak `reusable-release.yml`
   (yamalar, `latest.json`, release başlığı `CV Maker vX.Y.Z`, etiket `vX.Y.Z`) → eski kanal köprüsü.
   Testler geçmezse yayın olmaz. Sürüm zaten yayınlandıysa atlanır.

## Geliştirme
```
npm ci
npm start
npm test                         # veri deposu, 2.2 birim testleri, ana süreç, eski kanal köprüsü, çekirdek, Electron açılış testi + 2.2 senaryosu (Linux'ta xvfb-run)
CVM_SMOKE=1 CVM_SHOTS=ekran CVM_LANG=tr xvfb-run -a npx electron . --no-sandbox   # 2.2 senaryosunun ekran görüntüleri
npm run build                    # yerelde Windows kurulumu (dist/)
PLAYWRIGHT_CORE=… node tools/ekran.js ekran/   # ekran görüntüleri (sahte kabuk)
```
