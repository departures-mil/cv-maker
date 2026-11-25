'use strict';
/* Havacılık modülü: öneri listeleri (lisans, otorite, uçak tipi, yetki, eğitim sertifikası), meslek şablonları,
   belge geçerlilik takibi ve 3 dilli havacılık sözlüğü (çevrim dışı çeviri yedeği).
   Terimler ICAO / EASA Part-FCL, Part-66, Part-CC ve SHGM (SHY-FCL, SHY-66) resmî adlandırmasına göre yazılmıştır.
   Hem tarayıcıda (global) hem Node testlerinde (module.exports) çalışır. */
(function (g) {
  const AV_LISTS = {
    licence: {
      tr: ['ATPL(A) – Havayolu Nakliye Pilot Lisansı (Uçak)', 'ATPL(H) – Havayolu Nakliye Pilot Lisansı (Helikopter)', 'Frozen ATPL(A) – Teorik ATPL', 'CPL(A) – Ticari Pilot Lisansı (Uçak)', 'CPL(H) – Ticari Pilot Lisansı (Helikopter)', 'MPL – Çok Ekipli Pilot Lisansı', 'PPL(A) – Özel Pilot Lisansı', 'IR(A) – Aletli Uçuş Yetkisi', 'FI(A) – Uçuş Öğretmeni Yetkisi', 'Uçak Bakım Lisansı – Kategori B1.1 (SHY-66 / Part-66)', 'Uçak Bakım Lisansı – Kategori B1.3 (Helikopter, türbin)', 'Uçak Bakım Lisansı – Kategori B2 (Aviyonik)', 'Uçak Bakım Lisansı – Kategori C', 'Kabin Ekibi Sertifikası (Part-CC)', 'Uçuş Harekât Uzmanı Lisansı (Flight Dispatcher)', 'Hava Trafik Kontrolörü Lisansı (ATCO)', 'Yer Hizmetleri Yetki Belgesi'],
      en: ['ATPL(A) – Airline Transport Pilot Licence (Aeroplane)', 'ATPL(H) – Airline Transport Pilot Licence (Helicopter)', 'Frozen ATPL(A)', 'CPL(A) – Commercial Pilot Licence (Aeroplane)', 'CPL(H) – Commercial Pilot Licence (Helicopter)', 'MPL – Multi-crew Pilot Licence', 'PPL(A) – Private Pilot Licence', 'IR(A) – Instrument Rating', 'FI(A) – Flight Instructor Rating', 'Aircraft Maintenance Licence – Category B1.1 (Part-66)', 'Aircraft Maintenance Licence – Category B1.3 (Helicopter, turbine)', 'Aircraft Maintenance Licence – Category B2 (Avionics)', 'Aircraft Maintenance Licence – Category C', 'Cabin Crew Attestation (Part-CC)', 'Flight Dispatcher / Flight Operations Officer Licence', 'Air Traffic Controller Licence (ATCO)', 'Ground Handling Authorisation'],
      ar: ['ATPL(A) – رخصة طيار النقل الجوي (طائرة)', 'ATPL(H) – رخصة طيار النقل الجوي (مروحية)', 'Frozen ATPL(A) – رخصة طيار نقل جوي مجمّدة', 'CPL(A) – رخصة الطيار التجاري (طائرة)', 'CPL(H) – رخصة الطيار التجاري (مروحية)', 'MPL – رخصة طيار الطاقم المتعدد', 'PPL(A) – رخصة الطيار الخاص', 'IR(A) – تأهيل الطيران الآلي', 'FI(A) – تأهيل مدرب الطيران', 'رخصة صيانة الطائرات – الفئة B1.1 (Part-66)', 'رخصة صيانة الطائرات – الفئة B1.3 (مروحية توربينية)', 'رخصة صيانة الطائرات – الفئة B2 (إلكترونيات الطيران)', 'رخصة صيانة الطائرات – الفئة C', 'شهادة طاقم الضيافة الجوية (Part-CC)', 'رخصة ضابط عمليات الطيران (مُرحِّل جوي)', 'رخصة مراقب الحركة الجوية (ATCO)', 'تصريح الخدمات الأرضية'],
    },
    authority: {
      tr: ['SHGM – Sivil Havacılık Genel Müdürlüğü (Türkiye)', 'EASA – Avrupa Birliği Havacılık Emniyeti Ajansı', 'UK CAA – Birleşik Krallık Sivil Havacılık Otoritesi', 'FAA – ABD Federal Havacılık İdaresi', 'GCAA – Genel Sivil Havacılık Otoritesi (BAE)', 'GACA – Sivil Havacılık Genel Otoritesi (Suudi Arabistan)', 'QCAA – Katar Sivil Havacılık Otoritesi', 'DGCA – Sivil Havacılık Genel Müdürlüğü (Kuveyt)', 'BCAA – Bahreyn Sivil Havacılık İşleri', 'CAA Umman – Sivil Havacılık Otoritesi', 'CARC – Sivil Havacılık Düzenleme Komisyonu (Ürdün)', 'ECAA – Mısır Sivil Havacılık Otoritesi', 'TCCA – Transport Canada'],
      en: ['SHGM – Directorate General of Civil Aviation (Türkiye)', 'EASA – European Union Aviation Safety Agency', 'UK CAA – Civil Aviation Authority', 'FAA – Federal Aviation Administration (USA)', 'GCAA – General Civil Aviation Authority (UAE)', 'GACA – General Authority of Civil Aviation (Saudi Arabia)', 'QCAA – Qatar Civil Aviation Authority', 'DGCA – Directorate General of Civil Aviation (Kuwait)', 'BCAA – Bahrain Civil Aviation Affairs', 'CAA Oman – Civil Aviation Authority', 'CARC – Civil Aviation Regulatory Commission (Jordan)', 'ECAA – Egyptian Civil Aviation Authority', 'TCCA – Transport Canada Civil Aviation'],
      ar: ['SHGM – المديرية العامة للطيران المدني (تركيا)', 'EASA – وكالة الاتحاد الأوروبي لسلامة الطيران', 'UK CAA – هيئة الطيران المدني في المملكة المتحدة', 'FAA – إدارة الطيران الفيدرالية (الولايات المتحدة)', 'GCAA – الهيئة العامة للطيران المدني (الإمارات)', 'GACA – الهيئة العامة للطيران المدني (السعودية)', 'QCAA – هيئة الطيران المدني القطرية', 'DGCA – الإدارة العامة للطيران المدني (الكويت)', 'BCAA – شؤون الطيران المدني (البحرين)', 'هيئة الطيران المدني (عُمان)', 'CARC – هيئة تنظيم الطيران المدني (الأردن)', 'ECAA – سلطة الطيران المدني المصري', 'TCCA – هيئة النقل الكندية (الطيران المدني)'],
    },
    aircraft: ['Airbus A220', 'Airbus A319/A320/A321 (A320 family)', 'Airbus A320neo family', 'Airbus A330', 'Airbus A340', 'Airbus A350', 'Airbus A380', 'Boeing 737 Classic', 'Boeing 737 NG', 'Boeing 737 MAX', 'Boeing 747', 'Boeing 757/767', 'Boeing 777', 'Boeing 787', 'Embraer E170/E175', 'Embraer E190/E195', 'Embraer E-Jets E2', 'ATR 42/72', 'De Havilland Dash 8 Q400', 'Bombardier CRJ 700/900', 'Cessna 172', 'Piper PA-28', 'Diamond DA40', 'Diamond DA42', 'Tecnam P2006T', 'Bell 206', 'Bell 412', 'Leonardo AW139', 'Airbus H135', 'Airbus H145', 'Sikorsky S-92'],
    privilege: {
      tr: ['PIC – Kaptan Pilot', 'SIC – İkinci Pilot (F/O)', 'Seyir Yedek Pilotu (CRP)', 'TRI – Tip Yetkisi Öğretmeni', 'TRE – Tip Yetkisi Denetçisi', 'SFI – Simülatör Uçuş Öğretmeni', 'B1 – Mekanik', 'B2 – Aviyonik', 'C – Üs Bakım Sertifikasyonu', 'Kabin Ekibi – Tip Eğitimi'],
      en: ['PIC – Pilot-in-Command', 'SIC – First Officer', 'Cruise Relief Pilot (CRP)', 'TRI – Type Rating Instructor', 'TRE – Type Rating Examiner', 'SFI – Synthetic Flight Instructor', 'B1 – Mechanical', 'B2 – Avionics', 'C – Base Maintenance Certification', 'Cabin Crew – Aircraft Type Training'],
      ar: ['PIC – قائد الطائرة', 'SIC – مساعد الطيار', 'طيار احتياط للرحلات الطويلة (CRP)', 'TRI – مدرب تأهيل الطراز', 'TRE – ممتحن تأهيل الطراز', 'SFI – مدرب الطيران على جهاز المحاكاة', 'B1 – ميكانيكي', 'B2 – إلكترونيات الطيران', 'C – شهادة صيانة القاعدة', 'طاقم الضيافة – تدريب على طراز الطائرة'],
    },
    certificate: {
      tr: ['CRM – Ekip Kaynak Yönetimi', 'Tehlikeli Maddeler (DGR) – IATA', 'SEP – Emniyet ve Acil Durum Prosedürleri', 'AVSEC – Havacılık Güvenliği', 'İnsan Faktörleri (Human Factors)', 'MCC – Çok Ekipli İşbirliği', 'JOC – Jet Oryantasyon Kursu', 'UPRT – Anormal Uçuş Durumlarını Önleme ve Kurtarma Eğitimi', 'PBN – Performansa Dayalı Seyrüsefer', 'ETOPS / EDTO', 'RVSM', 'LVO – Düşük Görüş Operasyonları', 'Yakıt Tankı Emniyeti (FTS)', 'EWIS', 'İlk Yardım', 'Emniyet Yönetim Sistemi (SMS)', 'Ağırlık ve Denge (Load Control)', 'Ramp Emniyeti'],
      en: ['CRM – Crew Resource Management', 'Dangerous Goods Regulations (DGR) – IATA', 'SEP – Safety and Emergency Procedures', 'AVSEC – Aviation Security', 'Human Factors', 'MCC – Multi-Crew Cooperation', 'JOC – Jet Orientation Course', 'UPRT – Upset Prevention and Recovery Training', 'PBN – Performance-Based Navigation', 'ETOPS / EDTO', 'RVSM', 'LVO – Low Visibility Operations', 'Fuel Tank Safety (FTS)', 'EWIS – Electrical Wiring Interconnection System', 'First Aid', 'Safety Management System (SMS)', 'Weight and Balance / Load Control', 'Ramp Safety'],
      ar: ['CRM – إدارة موارد الطاقم', 'لوائح البضائع الخطرة (DGR) – إياتا', 'SEP – إجراءات السلامة والطوارئ', 'AVSEC – أمن الطيران', 'العوامل البشرية', 'MCC – التعاون بين أفراد الطاقم المتعدد', 'JOC – دورة التأهيل على الطائرات النفاثة', 'UPRT – التدريب على منع الأوضاع غير الطبيعية والتعافي منها', 'PBN – الملاحة القائمة على الأداء', 'ETOPS / EDTO', 'RVSM – تقليل الفصل العمودي الأدنى', 'LVO – عمليات الرؤية المنخفضة', 'سلامة خزانات الوقود (FTS)', 'EWIS – نظام توصيلات الأسلاك الكهربائية', 'الإسعافات الأولية', 'نظام إدارة السلامة (SMS)', 'الوزن والاتزان / مراقبة الحمولة', 'السلامة في ساحة الطائرات'],
    },
  };

  function avList(name, lang) {
    const l = AV_LISTS[name];
    if (!l) return [];
    return Array.isArray(l) ? l : l[lang] || l.en;
  }

  /* ---------- meslek şablonları ---------- */
  const PROFESSIONS = {
    general: { icon: '📄', template: 'professional', sections: ['summary', 'experience', 'education', 'skills', 'languages', 'certificates', 'references', 'documents'] },
    ats: { icon: '🤖', template: 'ats', sections: ['summary', 'experience', 'education', 'skills', 'certificates', 'languages'] },
    pilot: {
      icon: '👨‍✈️', template: 'aviation', aviation: true,
      sections: ['summary', 'licences', 'typeRatings', 'flightHours', 'medical', 'experience', 'education', 'certificates', 'languages', 'skills', 'references', 'documents'],
      title: { tr: 'Kaptan Pilot', en: 'Captain', ar: 'كابتن طيار' },
      skills: { tr: ['CRM', 'Çok ekipli operasyon (MCC)', 'Tehdit ve Hata Yönetimi (TEM)', 'PBN / RNAV / RNP', 'ETOPS', 'LVO (CAT II/III)'], en: ['Crew Resource Management', 'Multi-crew operations', 'Threat and Error Management (TEM)', 'PBN / RNAV / RNP', 'ETOPS', 'Low visibility operations (CAT II/III)'], ar: ['إدارة موارد الطاقم', 'عمليات الطاقم المتعدد', 'إدارة التهديدات والأخطاء (TEM)', 'PBN / RNAV / RNP', 'ETOPS', 'عمليات الرؤية المنخفضة (CAT II/III)'] },
    },
    cabinCrew: {
      icon: '🧳', template: 'aviation', aviation: true,
      sections: ['summary', 'experience', 'licences', 'typeRatings', 'certificates', 'medical', 'languages', 'skills', 'education', 'references', 'documents'],
      title: { tr: 'Kabin Memuru', en: 'Cabin Crew Member', ar: 'مضيف جوي' },
      skills: { tr: ['Emniyet ve acil durum prosedürleri (SEP)', 'İlk yardım', 'Yolcu hizmetleri', 'Kriz ve çatışma yönetimi', 'Ekip çalışması (CRM)', 'Tehlikeli maddeler farkındalığı'], en: ['Safety and emergency procedures (SEP)', 'First aid', 'In-flight customer service', 'Conflict management', 'Teamwork (CRM)', 'Dangerous goods awareness'], ar: ['إجراءات السلامة والطوارئ (SEP)', 'الإسعافات الأولية', 'خدمة الركاب على متن الطائرة', 'إدارة النزاعات', 'العمل الجماعي (CRM)', 'الوعي بالبضائع الخطرة'] },
    },
    maintenance: {
      icon: '🔧', template: 'aviation', aviation: true,
      sections: ['summary', 'licences', 'typeRatings', 'experience', 'certificates', 'education', 'skills', 'languages', 'references', 'documents'],
      title: { tr: 'B1 Lisanslı Uçak Bakım Teknisyeni', en: 'B1 Licensed Aircraft Maintenance Engineer', ar: 'مهندس صيانة طائرات مرخص B1' },
      skills: { tr: ['Hat bakım ve üs bakım', 'Arıza tespiti (troubleshooting)', 'AMM / IPC / SRM kullanımı', 'Bakım kayıtları ve CRS imzası', 'İnsan Faktörleri', 'EWIS / Yakıt Tankı Emniyeti'], en: ['Line and base maintenance', 'Troubleshooting', 'AMM / IPC / SRM', 'Maintenance records and CRS', 'Human Factors', 'EWIS / Fuel Tank Safety'], ar: ['الصيانة الخطية وصيانة القاعدة', 'تحديد الأعطال وإصلاحها', 'استخدام AMM / IPC / SRM', 'سجلات الصيانة وشهادة الإفراج عن الخدمة (CRS)', 'العوامل البشرية', 'EWIS / سلامة خزانات الوقود'] },
    },
    groundOps: {
      icon: '🛄', template: 'professional', aviation: true,
      sections: ['summary', 'experience', 'certificates', 'licences', 'education', 'skills', 'languages', 'references', 'documents'],
      title: { tr: 'Yer Hizmetleri Memuru', en: 'Ground Handling Agent', ar: 'موظف الخدمات الأرضية' },
      skills: { tr: ['Yolcu ve bagaj hizmetleri (DCS)', 'Ramp hizmetleri ve koordinasyon', 'Yük kontrol ve ağırlık-denge', 'Tehlikeli maddeler (DGR)', 'IATA AHM standartları', 'Ramp emniyeti'], en: ['Passenger and baggage services (DCS)', 'Ramp services and coordination', 'Load control and weight & balance', 'Dangerous goods (DGR)', 'IATA AHM standards', 'Ramp safety'], ar: ['خدمات الركاب والأمتعة (DCS)', 'خدمات ساحة الطائرات والتنسيق', 'مراقبة الحمولة والوزن والاتزان', 'البضائع الخطرة (DGR)', 'معايير دليل المناولة الأرضية (IATA AHM)', 'السلامة في ساحة الطائرات'] },
    },
    dispatch: {
      icon: '🗺️', template: 'professional', aviation: true,
      sections: ['summary', 'licences', 'experience', 'certificates', 'education', 'skills', 'languages', 'references', 'documents'],
      title: { tr: 'Uçuş Harekât Uzmanı', en: 'Flight Dispatcher', ar: 'ضابط عمليات الطيران' },
      skills: { tr: ['Uçuş planlama (Lido / Jeppesen)', 'NOTAM ve meteoroloji analizi', 'Uçuş takibi (flight following)', 'Performans ve yakıt politikası', 'ETOPS / EDTO planlama', 'Uçuş görev süresi sınırlamaları (FTL)'], en: ['Flight planning (Lido / Jeppesen)', 'NOTAM and meteorological analysis', 'Flight following', 'Performance and fuel policy', 'ETOPS / EDTO planning', 'Flight time limitations (FTL)'], ar: ['تخطيط الرحلات (Lido / Jeppesen)', 'تحليل النوتام والأرصاد الجوية', 'متابعة الرحلات', 'الأداء وسياسة الوقود', 'تخطيط ETOPS / EDTO', 'حدود أوقات الطيران (FTL)'] },
    },
    atc: {
      icon: '🗼', template: 'professional', aviation: true,
      sections: ['summary', 'licences', 'experience', 'medical', 'certificates', 'education', 'languages', 'skills', 'references', 'documents'],
      title: { tr: 'Hava Trafik Kontrolörü', en: 'Air Traffic Controller', ar: 'مراقب الحركة الجوية' },
      skills: { tr: ['Meydan kontrol (TWR)', 'Yaklaşma kontrol (APP / radar)', 'Saha kontrol (ACC)', 'Standart ICAO frazeolojisi', 'Durumsal farkındalık', 'Acil durum yönetimi'], en: ['Aerodrome control (TWR)', 'Approach control (APP / radar)', 'Area control (ACC)', 'Standard ICAO phraseology', 'Situational awareness', 'Emergency handling'], ar: ['مراقبة المطار (TWR)', 'مراقبة الاقتراب (APP / رادار)', 'مراقبة المنطقة (ACC)', 'المصطلحات القياسية للإيكاو', 'الوعي الظرفي', 'إدارة حالات الطوارئ'] },
    },
  };

  /* ---------- belge geçerlilik takibi ---------- */
  const EXPIRY_TYPES = ['licences', 'typeRatings', 'medical', 'certificates'];
  function parseDay(v) {
    const [y, m, d] = String(v || '').split('-').map(Number);
    if (!y || !m) return null;
    // yalnız ay girilmişse ayın son günü geçerlilik sonu sayılır
    return d ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m, 0, 23, 59, 59);
  }
  /** Süresi dolmuş ya da `days` gün içinde dolacak belgeler; en yakın önce. */
  function expiringItems(cvs, now = new Date(), days = 90) {
    const out = [];
    for (const cv of cvs) {
      for (const s of cv.sections || []) {
        if (!EXPIRY_TYPES.includes(s.type)) continue;
        for (const it of s.items || []) {
          const d = parseDay(it.expiry);
          if (!d) continue;
          const left = Math.ceil((d - now) / 86400000);
          if (left > days) continue;
          out.push({ cvId: cv.id, cvName: cv.name, sectionId: s.id, type: s.type, itemId: it.id, title: it.name || it.aircraft || (it.medClass ? '@med.' + it.medClass : ''), /* '@anahtar' = arayüzde çevrilen etiket */ expiry: it.expiry, daysLeft: left, expired: left < 0 });
        }
      }
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /* ---------- havacılık sözlüğü (çevrim dışı çeviri yedeği) ---------- */
  const GLOSSARY = [
    { tr: 'Kaptan Pilot', en: 'Captain', ar: 'كابتن طيار' },
    { tr: 'İkinci Pilot', en: 'First Officer', ar: 'مساعد طيار' },
    { tr: 'Kıdemli İkinci Pilot', en: 'Senior First Officer', ar: 'مساعد طيار أول' },
    { tr: 'Eğitmen Kaptan', en: 'Training Captain', ar: 'كابتن مدرب' },
    { tr: 'Kabin Memuru', en: 'Cabin Crew Member', ar: 'مضيف جوي' },
    { tr: 'Kabin Amiri', en: 'Cabin Manager', ar: 'رئيس طاقم الضيافة' },
    { tr: 'Kabin Şefi', en: 'Senior Cabin Crew Member', ar: 'كبير المضيفين' },
    { tr: 'Uçak Bakım Teknisyeni', en: 'Aircraft Maintenance Technician', ar: 'فني صيانة طائرات' },
    { tr: 'B1 Lisanslı Uçak Bakım Teknisyeni', en: 'B1 Licensed Aircraft Maintenance Engineer', ar: 'مهندس صيانة طائرات مرخص B1' },
    { tr: 'B2 Lisanslı Uçak Bakım Teknisyeni', en: 'B2 Licensed Aircraft Maintenance Engineer', ar: 'مهندس صيانة طائرات مرخص B2' },
    { tr: 'Uçuş Harekât Uzmanı', en: 'Flight Dispatcher', ar: 'ضابط عمليات الطيران' },
    { tr: 'Hava Trafik Kontrolörü', en: 'Air Traffic Controller', ar: 'مراقب الحركة الجوية' },
    { tr: 'Yer Hizmetleri Memuru', en: 'Ground Handling Agent', ar: 'موظف الخدمات الأرضية' },
    { tr: 'Yük Kontrol Memuru', en: 'Load Control Agent', ar: 'موظف مراقبة الحمولة' },
    { tr: 'İstasyon Müdürü', en: 'Station Manager', ar: 'مدير المحطة' },
    { tr: 'Uçuş Emniyeti Uzmanı', en: 'Flight Safety Officer', ar: 'مسؤول سلامة الطيران' },
    { tr: 'Kalite Güvence Uzmanı', en: 'Quality Assurance Specialist', ar: 'أخصائي ضمان الجودة' },
    { tr: 'Hat Bakım', en: 'Line Maintenance', ar: 'الصيانة الخطية' },
    { tr: 'Üs Bakım', en: 'Base Maintenance', ar: 'صيانة القاعدة' },
    { tr: 'Tip Yetkisi', en: 'Type Rating', ar: 'تأهيل الطراز' },
    { tr: 'Uçuş Saati', en: 'Flight Hours', ar: 'ساعات الطيران' },
    { tr: 'Ekip Kaynak Yönetimi', en: 'Crew Resource Management', ar: 'إدارة موارد الطاقم' },
    { tr: 'Tehlikeli Maddeler', en: 'Dangerous Goods', ar: 'البضائع الخطرة' },
    { tr: 'Emniyet ve Acil Durum Prosedürleri', en: 'Safety and Emergency Procedures', ar: 'إجراءات السلامة والطوارئ' },
    { tr: 'Havacılık Güvenliği', en: 'Aviation Security', ar: 'أمن الطيران' },
    { tr: 'İnsan Faktörleri', en: 'Human Factors', ar: 'العوامل البشرية' },
    { tr: 'Emniyet Yönetim Sistemi', en: 'Safety Management System', ar: 'نظام إدارة السلامة' },
    { tr: 'Sivil Havacılık Genel Müdürlüğü', en: 'Directorate General of Civil Aviation', ar: 'المديرية العامة للطيران المدني' },
    { tr: 'Lisans', en: 'Licence', ar: 'رخصة' },
    { tr: 'Sağlık Sertifikası', en: 'Medical Certificate', ar: 'الشهادة الطبية' },
    { tr: 'Ramp Hizmetleri', en: 'Ramp Services', ar: 'خدمات ساحة الطائرات' },
    { tr: 'Yolcu Hizmetleri', en: 'Passenger Services', ar: 'خدمات الركاب' },
    { tr: 'Lisans', en: 'Bachelor\'s Degree', ar: 'بكالوريوس', degree: true },
    { tr: 'Yüksek Lisans', en: 'Master\'s Degree', ar: 'ماجستير' },
    { tr: 'Doktora', en: 'PhD', ar: 'دكتوراه' },
    { tr: 'Ön Lisans', en: 'Associate Degree', ar: 'دبلوم مشارك' },
    { tr: 'Lise', en: 'High School', ar: 'الثانوية العامة' },
    { tr: 'Türkçe', en: 'Turkish', ar: 'التركية' },
    { tr: 'İngilizce', en: 'English', ar: 'الإنجليزية' },
    { tr: 'Arapça', en: 'Arabic', ar: 'العربية' },
    { tr: 'Almanca', en: 'German', ar: 'الألمانية' },
    { tr: 'Fransızca', en: 'French', ar: 'الفرنسية' },
    { tr: 'Rusça', en: 'Russian', ar: 'الروسية' },
    { tr: 'İspanyolca', en: 'Spanish', ar: 'الإسبانية' },
    { tr: 'Farsça', en: 'Persian', ar: 'الفارسية' },
    { tr: 'İstanbul, Türkiye', en: 'Istanbul, Türkiye', ar: 'إسطنبول، تركيا' },
    { tr: 'Ankara, Türkiye', en: 'Ankara, Türkiye', ar: 'أنقرة، تركيا' },
    { tr: 'Dubai, BAE', en: 'Dubai, UAE', ar: 'دبي، الإمارات' },
    { tr: 'Doha, Katar', en: 'Doha, Qatar', ar: 'الدوحة، قطر' },
    { tr: 'Riyad, Suudi Arabistan', en: 'Riyadh, Saudi Arabia', ar: 'الرياض، السعودية' },
    { tr: 'Halen', en: 'Present', ar: 'حتى الآن' },
  ];
  /* Sözlükte birebir karşılığı olan metni çevirir; yoksa null (çevrim dışında serbest metin çevrilmez). */
  function glossaryTranslate(text, from, to, ctx) {
    const s = String(text || '').trim();
    if (!s) return '';
    const low = s.toLocaleLowerCase(from === 'tr' ? 'tr-TR' : undefined);
    // "Lisans" eğitim bölümünde öğrenim derecesidir (Bachelor's), lisans bölümünde pilot/bakım lisansıdır
    const list = ctx === 'degree' ? GLOSSARY.filter((e) => e.degree).concat(GLOSSARY) : GLOSSARY.filter((e) => !e.degree).concat(GLOSSARY.filter((e) => e.degree));
    for (const e of list) {
      for (const l of from ? [from] : ['tr', 'en', 'ar']) {
        if (e[l] && e[l].toLocaleLowerCase(l === 'tr' ? 'tr-TR' : undefined) === low) return e[to] || null;
      }
    }
    // listelerdeki karşılık (lisans, otorite, yetki, sertifika): aynı sıradaki öğe
    for (const name of ['licence', 'authority', 'privilege', 'certificate']) {
      const L = AV_LISTS[name];
      for (const l of ['tr', 'en', 'ar']) {
        const i = L[l].indexOf(s);
        if (i >= 0 && L[to][i]) return L[to][i];
      }
    }
    return null;
  }
  /** Havacılıkla ilgili bir CV mi? (unvan ya da havacılık bölümleri) */
  function isAviationCv(cv) {
    if ((cv.sections || []).some((s) => ['licences', 'typeRatings', 'flightHours', 'medical'].includes(s.type) && s.items.length)) return true;
    const t = String((cv.personal && cv.personal.jobTitle && cv.personal.jobTitle.value) || '').toLowerCase();
    return /pilot|kaptan|captain|first officer|cabin|kabin|aircraft|uçak|ucak|aviation|havacılık|dispatch|harekât|harekat|atc|kontrolör|controller|طيار|طائرات|طيران|مضيف|الجوية/.test(t);
  }

  const api = { AV_LISTS, avList, PROFESSIONS, EXPIRY_TYPES, expiringItems, parseDay, GLOSSARY, glossaryTranslate, isAviationCv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.AV = api;
})(typeof window !== 'undefined' ? window : globalThis);
