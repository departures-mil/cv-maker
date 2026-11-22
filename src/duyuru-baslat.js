// Admin duyuruları (https://github.com/departures-mil/duyurular)
Duyuru.baslat({
  uygulama: 'cv-maker',
  surum: '2.0.4',
  dil: function () { return document.documentElement.lang; },
  guncelle: function () { try { checkUpdates(false, true); } catch (e) {} }
});
