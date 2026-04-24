const Student = require('../models/Student');
const ExcelJS = require('exceljs');

exports.getAll = async (req, res) => {
  try {
    const { search, class: cls, grade, page = 1, limit = 50, active = 'true' } = req.query;
    const filter = { isArchived: false };
    if (active !== 'all') filter.isActive = active === 'true';
    if (cls) filter.class = cls;
    if (grade) filter.grade = grade;
    if (search) filter.$or = [
      { nis: new RegExp(search, 'i') },
      { name: new RegExp(search, 'i') },
    ];

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit)),
      Student.countDocuments(filter),
    ]);

    res.json({ success: true, data: students, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByNis = async (req, res) => {
  try {
    const student = await Student.findOne({ nis: req.params.nis, isArchived: false });
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'NIS sudah terdaftar' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { hard } = req.query;
    if (hard === 'true') {
      await Student.findByIdAndDelete(req.params.id);
    } else {
      await Student.findByIdAndUpdate(req.params.id, { isArchived: true, isActive: false });
    }
    res.json({ success: true, message: 'Siswa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File Excel tidak ditemukan' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    const students = [];
    sheet.eachRow((row, i) => {
      if (i === 1) return;
      const [, nis, name, cls, grade, parentName, parentPhone, parentEmail, address] = row.values;
      if (nis && name) students.push({ nis: String(nis), name, class: cls, grade, parentName, parentPhone: String(parentPhone), parentEmail: parentEmail || '', address: address || '' });
    });

    let created = 0, updated = 0, errors = [];
    for (const s of students) {
      try {
        await Student.findOneAndUpdate({ nis: s.nis }, s, { upsert: true, new: true });
        created++;
      } catch (err) {
        errors.push({ nis: s.nis, message: err.message });
        updated++;
      }
    }
    res.json({ success: true, message: `Import selesai: ${created} berhasil`, data: { created, errors } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const students = await Student.find({ isArchived: false }).sort({ name: 1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Siswa');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama', key: 'name', width: 30 },
      { header: 'Kelas', key: 'class', width: 10 },
      { header: 'Tingkat', key: 'grade', width: 10 },
      { header: 'Nama Orang Tua', key: 'parentName', width: 25 },
      { header: 'No. HP Orang Tua', key: 'parentPhone', width: 18 },
      { header: 'Email Orang Tua', key: 'parentEmail', width: 25 },
      { header: 'Alamat', key: 'address', width: 40 },
    ];
    students.forEach((s, i) => sheet.addRow({ no: i + 1, ...s.toObject() }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data-siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const classes = await Student.distinct('class', { isArchived: false });
    const grades = await Student.distinct('grade', { isArchived: false });
    res.json({ success: true, data: { classes: classes.sort(), grades: grades.sort() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SDH KUPANG';
    const sheet = workbook.addWorksheet('Template Import Siswa');

    const columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Lengkap', key: 'name', width: 30 },
      { header: 'Kelas', key: 'class', width: 12 },
      { header: 'Tingkat', key: 'grade', width: 10 },
      { header: 'Nama Orang Tua', key: 'parentName', width: 25 },
      { header: 'No. HP Orang Tua', key: 'parentPhone', width: 20 },
      { header: 'Email Orang Tua', key: 'parentEmail', width: 28 },
      { header: 'Alamat', key: 'address', width: 40 },
    ];
    sheet.columns = columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    });
    headerRow.height = 24;

    // Contoh data baris 1
    sheet.addRow({
      nis: '2024001',
      name: 'Contoh Nama Siswa',
      class: 'X IPA 1',
      grade: 'X',
      parentName: 'Nama Ayah/Ibu',
      parentPhone: '08123456789',
      parentEmail: 'email@contoh.com',
      address: 'Jl. Contoh No. 1, Kupang',
    });
    // Contoh data baris 2
    sheet.addRow({
      nis: '2024002',
      name: 'Contoh Nama Siswa 2',
      class: 'X IPS 1',
      grade: 'X',
      parentName: 'Nama Orang Tua 2',
      parentPhone: '08987654321',
      parentEmail: '',
      address: '',
    });

    // Style contoh rows
    [2, 3].forEach(rowNum => {
      const row = sheet.getRow(rowNum);
      row.eachCell(cell => {
        cell.font = { italic: true, color: { argb: 'FF6B7280' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    });

    // Catatan
    sheet.addRow([]);
    const noteRow = sheet.addRow(['PETUNJUK: Hapus baris contoh (baris 2 dan 3) sebelum import. Kolom NIS, Nama, Kelas, Tingkat, Nama Orang Tua, dan No. HP wajib diisi.']);
    noteRow.getCell(1).font = { bold: true, color: { argb: 'FFB45309' }, italic: true };
    sheet.mergeCells(`A${noteRow.number}:H${noteRow.number}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template-import-siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
