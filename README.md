# CV Maker

Windows için taşınabilir (kurulumsuz) CV hazırlama programı. Electron ile yazıldı.

## Özellikler
- Her açılışta tam ekran (F11 ile geçiş), arayüz Türkçe / English / العربية (Arapça'da sağdan sola).
- CV dili ayrı seçilebilir (başlıklar ve tarihler o dilde yazılır).
- Vesikalık fotoğraf (3:4 kırpma, döndürme, yakınlaştırma).
- Kişisel bilgiler: her alan gizlenebilir, sürükle-bırak ile sıralanabilir, özel alan eklenebilir.
- 15 bölüm türü (Hakkımda, İş Deneyimi, Eğitim, Yetenekler, Diller, Sertifikalar, Kurslar, Projeler,
  Ödüller, Yayınlar, Gönüllülük, Referanslar, Hobiler, Özel bölüm, Belgeler). Her bölüm ve her öğe
  eklenebilir, silinebilir, gizlenebilir, çoğaltılabilir, yukarı/aşağı veya sürükle-bırak ile taşınabilir.
- Belgeler bölümü: diploma, onur belgesi vb. PDF/resim dosyaları; PDF çıktısının sonuna sayfa olarak eklenir.
- 6 hazır şablon + "Şablon olarak kaydet" ile sınırsız özel şablon, .cvtemplate olarak içe/dışa aktarma.
- Çıktı: PDF, Word (DOCX), JPEG (her sayfa bir resim).
- Birden fazla CV, .cvmaker dosyası olarak yedekleme / geri yükleme, geri al / yinele.
- Veriler programın yanındaki `CV Maker Data` klasöründe tutulur.
- Ayarlar > Güncellemeler: Firebase Hosting'den tek tuşla güncelleme; yeni dosya adı `CV Maker v1.X.exe`.

## Geliştirme
```
npm install
npm start                 # geliştirme modunda çalıştır
npm run build             # dist/CV Maker v<sürüm>.exe
```

## Yeni sürüm yayınlama
`node scripts/release.js --notes "Değişiklikler"` (dillere göre: `--tr "..." --en "..." --ar "..."`).
Sürüm GitHub'a gönderilir; GitHub Actions exe'yi derleyip sürüm olarak yayınlar, betik ardından güncelleme bilgisini Firebase'e yükler.
- sürümü 1.N → 1.(N+1) yükseltir ve `CV Maker v1.(N+1).exe` dosyasını derler,
- exe'yi GitHub Releases'e (`departures-mil/cv-maker`) yükler (Firebase'in ücretsiz planı exe kabul etmiyor),
- `firebase/public/latest.json` ve indirme sayfasını Firebase Hosting'e (`cv-maker-d10a0`) yükler.

Gerekenler: `gh` (depoya yazma izni) ve Google kimlik bilgisi (`GOOGLE_APPLICATION_CREDENTIALS`,
`FIREBASE_SERVICE_ACCOUNT` veya `gcloud auth application-default login`).

Program açılışta `https://cv-maker-d10a0.web.app/latest.json` dosyasını okur; yeni sürüm varsa üstte
"Şimdi güncelle" düğmesi çıkar. Düğme yeni exe'yi eskisinin yanına indirir, eskisini siler ve yeni sürümü açar.
