# CV Maker

Windows için CV hazırlama programı (Electron). Kurulumlu sürüm: `CV-Maker-Setup-<sürüm>.exe`.

## Veriler ve yedekler
- Veriler: `%APPDATA%\CV Maker\data` (cvs.json, settings.json, attachments).
- Yedekler: `data\backups\` — her günün ilk açılışında, her güncellemeden, geri yüklemeden ve içe aktarmadan
  önce otomatik alınır, hiçbiri silinmez. Kullanılmayan ekler `backups\attachments-removed\` içine taşınır.
- Ayarlar > Veriler: yedek listesi, geri yükleme, eski taşınabilir sürümün "CV Maker Data" klasörünü içe aktarma.
- Taşınabilir sürümden (v1.x) gelenler: v2.0 güncellemesi kurulumu indirir, kurar; kurulan program açılışta
  eski kayıtları birleştirir. Eski klasör olduğu gibi kalır (`data\backups\legacy-portable_*` içinde de kopyası var).

## Güncellemeler
Program açılışta `https://github.com/departures-mil/cv-maker/releases/latest/download/latest.json` dosyasını okur.
Yeni sürüm varsa bildirim gelir, üstte "Şimdi güncelle" çıkar.
- Küçük güncelleme (bundle, ~150 KB): yalnızca programın kendi dosyaları; `data\app\<sürüm>` içine açılır.
- Tam güncelleme (kurulum): Electron veya npm paketleri değişince. `package.json > cvmaker.minShell` yeni
  sürüme yükseltilir; eski kurulumlar o zaman kurulum dosyasını indirip sessizce kurar.

## Yeni sürüm yayınlama
1. Kodu değiştir, `package.json` sürümünü yükselt (ör. 2.0.0 → 2.1.0), `release-notes.json`'a notları yaz.
2. `main` dalına gönder. GitHub Actions (Windows) test eder, kurulumu ve bundle'ı derler, `v<sürüm>` olarak yayınlar.

## Geliştirme
```
npm install
npm start
npm test
node scripts/release.js --no-installer   # yalnızca bundle + latest.json (dist/release)
```
