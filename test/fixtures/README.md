v2.0.5/ — kurulu 2.0.x programlarının güncelleyicisi (main.js, lib/updater.js, lib/datastore.js, update-config.json; v2.0.5'ten
değiştirilmeden alındı; 2.0.6 ve 2.0.7'de güncelleme kodu aynıdır, yalnız Asistan Agent eklendi). test/eski-kanal.test.js bunu
sahte electron ile çalıştırıp yeni latest.json'u okutur (köprü testi). Programa girmez (package.json → build.files).
