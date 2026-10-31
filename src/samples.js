'use strict';
/* Example CV shown on first launch, in the interface language. */

const SAMPLE_TEXT = {
  tr: {
    cvName: 'Örnek CV', fullName: 'Ayşe Yılmaz', jobTitle: 'Muhasebe Uzmanı', email: 'ayse.yilmaz@ornek.com', phone: '+90 532 000 00 00', address: 'İstanbul, Türkiye',
    nationality: 'T.C.', drivingLicense: 'B',
    summary: '8 yıllık deneyime sahip, detaycı ve çözüm odaklı muhasebe uzmanıyım. Finansal raporlama, vergi mevzuatı ve ERP sistemlerinde güçlü bilgiye sahibim.',
    position: 'Kıdemli Muhasebe Uzmanı', company: 'Örnek Holding A.Ş.', location: 'İstanbul',
    description: '- Aylık ve yıllık finansal raporların hazırlanması\n- Vergi beyannamelerinin takibi\n- 4 kişilik ekibin koordinasyonu',
    degree: 'Lisans', school: 'İstanbul Üniversitesi', field: 'İşletme',
    skills: ['Finansal raporlama', 'SAP / ERP', 'Microsoft Excel', 'Vergi mevzuatı'],
    languages: [['Türkçe', 'native'], ['İngilizce', 'advanced']],
    cert: 'SMMM Ruhsatı', certIssuer: 'TÜRMOB',
  },
  en: {
    cvName: 'Sample CV', fullName: 'Jane Smith', jobTitle: 'Accountant', email: 'jane.smith@example.com', phone: '+44 7700 900000', address: 'London, United Kingdom',
    nationality: 'British', drivingLicense: 'B',
    summary: 'Detail-oriented accountant with 8 years of experience in financial reporting, tax compliance and ERP systems.',
    position: 'Senior Accountant', company: 'Example Holdings Ltd', location: 'London',
    description: '- Prepared monthly and annual financial reports\n- Managed tax filings\n- Coordinated a team of 4',
    degree: 'BSc', school: 'University of London', field: 'Business Administration',
    skills: ['Financial reporting', 'SAP / ERP', 'Microsoft Excel', 'Tax compliance'],
    languages: [['English', 'native'], ['French', 'intermediate']],
    cert: 'ACCA', certIssuer: 'ACCA Global',
  },
  ar: {
    cvName: 'سيرة ذاتية نموذجية', fullName: 'أحمد محمد', jobTitle: 'محاسب', email: 'ahmed@example.com', phone: '+966 50 000 0000', address: 'الرياض، المملكة العربية السعودية',
    nationality: 'سعودي', drivingLicense: 'خاصة',
    summary: 'محاسب دقيق يتمتع بخبرة 8 سنوات في إعداد التقارير المالية والامتثال الضريبي وأنظمة تخطيط الموارد.',
    position: 'محاسب أول', company: 'شركة المثال القابضة', location: 'الرياض',
    description: '- إعداد التقارير المالية الشهرية والسنوية\n- متابعة الإقرارات الضريبية\n- تنسيق عمل فريق من 4 أشخاص',
    degree: 'بكالوريوس', school: 'جامعة الملك سعود', field: 'إدارة الأعمال',
    skills: ['التقارير المالية', 'SAP / ERP', 'Microsoft Excel', 'الأنظمة الضريبية'],
    languages: [['العربية', 'native'], ['الإنجليزية', 'advanced']],
    cert: 'محاسب قانوني معتمد', certIssuer: 'الهيئة السعودية للمراجعين والمحاسبين',
  },
};

function buildSample(lang) {
  const x = SAMPLE_TEXT[lang] || SAMPLE_TEXT.tr;
  const cv = newCv(x.cvName);
  for (const k of ['fullName', 'jobTitle', 'email', 'phone', 'address', 'nationality', 'drivingLicense']) cv.personal[k].value = x[k];
  cv.personal.phone.numbers = [newPhone(x.phone, ['call', 'whatsapp'])];
  const sec = (type) => cv.sections.find((s) => s.type === type);
  sec('summary').items[0].text = x.summary;
  Object.assign(sec('experience').items[0], { position: x.position, company: x.company, location: x.location, start: '2019-03', current: true, description: x.description });
  Object.assign(sec('education').items[0], { degree: x.degree, school: x.school, field: x.field, start: '2011-09', end: '2015-06' });
  sec('skills').items = x.skills.map((name, i) => Object.assign(newItem('skills'), { name, level: 5 - (i % 2) }));
  sec('languages').items = x.languages.map(([name, level]) => Object.assign(newItem('languages'), { name, level }));
  Object.assign(sec('certificates').items[0], { name: x.cert, issuer: x.certIssuer, date: '2018-05' });
  sec('references').items = [];
  sec('documents').items = [];
  return cv;
}
