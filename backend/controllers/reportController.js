const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
const { generateDailyPdf, generateWeeklyPdf, generateMonthlyPdf, generateClassPdf } = require('../utils/pdfGenerator');
const { getSettingValue } = require('./settingController');

const getSchoolInfo = async () => ({
  name: await getSettingValue('schoolName') || 'SDH KUPANG',
  address: await getSettingValue('schoolAddress') || '',
  phone: await getSettingValue('schoolPhone') || '',
  email: await getSettingValue('schoolEmail') || '',
  logoUrl: await getSettingValue('logoUrl') || null,
  primaryColor: await getSettingValue('primaryColor') || '#1e40af',
});

const dateRange = (d) => { const s = new Date(d); s.setHours(0,0,0,0); const e = new Date(s); e.setDate(e.getDate()+1); return { start: s, end: e }; };

exports.daily = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], class: cls, format = 'json' } = req.query;
    const { start, end } = dateRange(date);
    let records = await Attendance.find({ date: { $gte: start, $lt: end } })
      .populate('student', 'nis name class grade parentName parentPhone')
      .populate('sanctions.sanction', 'name')
      .sort({ arrivalTime: 1 });
    if (cls) records = records.filter(r => r.student?.class === cls);

    if (format === 'pdf') {
      const school = await getSchoolInfo();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-harian-${date}.pdf`);
      return generateDailyPdf(records, date, school, res);
    }
    if (format === 'excel') return exportDailyExcel(records, date, res);

    const stats = { total: records.length, late: records.filter(r => r.status === 'Late').length, onTime: records.filter(r => r.status === 'OnTime').length };
    res.json({ success: true, data: records, stats, date });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.weekly = async (req, res) => {
  try {
    const { from, to, class: cls, format = 'json' } = req.query;
    const start = new Date(from); start.setHours(0,0,0,0);
    const end = new Date(to); end.setDate(end.getDate()+1); end.setHours(0,0,0,0);

    let records = await Attendance.find({ date: { $gte: start, $lt: end }, status: 'Late' })
      .populate('student', 'nis name class grade')
      .populate('sanctions.sanction', 'name')
      .sort({ date: 1, arrivalTime: 1 });
    if (cls) records = records.filter(r => r.student?.class === cls);

    if (format === 'pdf') {
      const school = await getSchoolInfo();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-mingguan.pdf`);
      return generateWeeklyPdf(records, from, to, school, res);
    }
    if (format === 'excel') return exportWeeklyExcel(records, from, to, res);

    const byDay = {};
    records.forEach(r => {
      const d = r.date.toISOString().split('T')[0];
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(r);
    });
    res.json({ success: true, data: byDay, total: records.length, from, to });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.monthly = async (req, res) => {
  try {
    const { month, year, class: cls, format = 'json' } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    let records = await Attendance.find({ date: { $gte: start, $lt: end }, status: 'Late' })
      .populate('student', 'nis name class grade')
      .populate('sanctions.sanction', 'name')
      .sort({ student: 1, date: 1 });
    if (cls) records = records.filter(r => r.student?.class === cls);

    if (format === 'pdf') {
      const school = await getSchoolInfo();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-bulanan-${year}-${month}.pdf`);
      return generateMonthlyPdf(records, month, year, school, res);
    }
    if (format === 'excel') return exportMonthlyExcel(records, month, year, res);

    const byStudent = {};
    records.forEach(r => {
      const key = r.student._id.toString();
      if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0, dates: [] };
      byStudent[key].count++;
      byStudent[key].dates.push(r.date);
    });
    const sorted = Object.values(byStudent).sort((a, b) => b.count - a.count);
    res.json({ success: true, data: sorted, total: records.length, month, year });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.byClass = async (req, res) => {
  try {
    const { class: cls, from, to, format = 'json' } = req.query;
    const filter = { status: 'Late' };
    if (from && to) { filter.date = { $gte: new Date(from), $lte: new Date(to) }; }

    const records = await Attendance.find(filter)
      .populate({ path: 'student', match: { class: cls, isArchived: false }, select: 'nis name class grade' })
      .sort({ date: -1 });

    const filtered = records.filter(r => r.student);
    const byStudent = {};
    filtered.forEach(r => {
      const key = r.student._id.toString();
      if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0, dates: [], lastDate: null };
      byStudent[key].count++;
      byStudent[key].dates.push(r.date);
      if (!byStudent[key].lastDate || r.date > byStudent[key].lastDate) byStudent[key].lastDate = r.date;
    });
    const data = Object.values(byStudent).sort((a, b) => b.count - a.count);

    if (format === 'pdf') {
      const school = await getSchoolInfo();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-kelas-${cls}.pdf`);
      return generateClassPdf(data, cls, school, res);
    }
    if (format === 'excel') return exportClassExcel(data, cls, res);

    res.json({ success: true, data, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const styleHeader = (sheet) => {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow.height = 22;
};

const exportWeeklyExcel = async (records, from, to, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Laporan Mingguan');
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Tanggal', key: 'date', width: 15 },
    { header: 'NIS', key: 'nis', width: 15 },
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Kelas', key: 'class', width: 10 },
    { header: 'Terlambat (menit)', key: 'tardinessMinutes', width: 18 },
    { header: 'Sanksi', key: 'sanctions', width: 30 },
  ];
  records.forEach((r, i) => sheet.addRow({
    no: i + 1,
    date: r.date ? new Date(r.date).toLocaleDateString('id-ID') : '-',
    nis: r.student?.nis,
    name: r.student?.name,
    class: r.student?.class,
    tardinessMinutes: r.tardinessMinutes,
    sanctions: r.sanctions?.map(s => s.sanction?.name).join(', ') || '-',
  }));
  styleHeader(sheet);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-mingguan.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

const exportMonthlyExcel = async (records, month, year, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Laporan Bulanan');
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIS', key: 'nis', width: 15 },
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Kelas', key: 'class', width: 10 },
    { header: 'Jumlah Terlambat', key: 'count', width: 16 },
    { header: 'Tanggal-tanggal', key: 'dates', width: 50 },
  ];
  const byStudent = {};
  records.forEach(r => {
    const key = r.student._id.toString();
    if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0, dates: [] };
    byStudent[key].count++;
    byStudent[key].dates.push(new Date(r.date).toLocaleDateString('id-ID'));
  });
  Object.values(byStudent).sort((a, b) => b.count - a.count).forEach((s, i) => sheet.addRow({
    no: i + 1,
    nis: s.student?.nis,
    name: s.student?.name,
    class: s.student?.class,
    count: s.count,
    dates: s.dates.join(', '),
  }));
  styleHeader(sheet);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-bulanan-${year}-${month}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

const exportClassExcel = async (data, cls, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Kelas ${cls}`);
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIS', key: 'nis', width: 15 },
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Kelas', key: 'class', width: 10 },
    { header: 'Jumlah Terlambat', key: 'count', width: 16 },
    { header: 'Terakhir', key: 'lastDate', width: 15 },
  ];
  data.forEach((s, i) => sheet.addRow({
    no: i + 1,
    nis: s.student?.nis,
    name: s.student?.name,
    class: s.student?.class,
    count: s.count,
    lastDate: s.lastDate ? new Date(s.lastDate).toLocaleDateString('id-ID') : '-',
  }));
  styleHeader(sheet);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-kelas-${cls}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

const exportDailyExcel = async (records, date, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Laporan Harian');
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIS', key: 'nis', width: 15 },
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Kelas', key: 'class', width: 10 },
    { header: 'Waktu Masuk', key: 'arrivalTime', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Terlambat (menit)', key: 'tardinessMinutes', width: 18 },
    { header: 'Sanksi', key: 'sanctions', width: 30 },
  ];
  records.forEach((r, i) => sheet.addRow({
    no: i + 1,
    nis: r.student?.nis,
    name: r.student?.name,
    class: r.student?.class,
    arrivalTime: r.arrivalTime ? new Date(r.arrivalTime).toLocaleTimeString('id-ID') : '-',
    status: r.status,
    tardinessMinutes: r.tardinessMinutes,
    sanctions: r.sanctions?.map(s => s.sanction?.name).join(', ') || '-',
  }));
  styleHeader(sheet);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-harian-${date}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};
