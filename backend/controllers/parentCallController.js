const ParentCall = require('../models/ParentCall');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { generateParentLetterPdf } = require('../utils/pdfGenerator');
const { getSettingValue } = require('./settingController');

exports.getAll = async (req, res) => {
  try {
    const { student, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (student) filter.student = student;
    const [records, total] = await Promise.all([
      ParentCall.find(filter).populate('student', 'nis name class grade parentName parentPhone').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      ParentCall.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkEligible = async (req, res) => {
  try {
    const thresholds = await getSettingValue('parentCallThreshold') || [{ count: 5, period: 1, level: 'warning' }];
    const students = await Student.find({ isArchived: false });
    const results = [];

    for (const student of students) {
      for (const t of thresholds) {
        const periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - t.period);
        const count = await Attendance.countDocuments({ student: student._id, status: 'Late', date: { $gte: periodStart } });
        if (count >= t.count) {
          results.push({ student, count, threshold: t });
          break;
        }
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { studentId, period, notes } = req.body;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const [pStart, pEnd] = period.split('|');
    const attendances = await Attendance.find({
      student: studentId,
      status: 'Late',
      date: { $gte: new Date(pStart), $lte: new Date(pEnd) },
    }).populate('sanctions.sanction', 'name').sort({ date: 1 });

    const tardinessDates = attendances.map(a => a.date);
    const allSanctions = [...new Set(attendances.flatMap(a => a.sanctions.map(s => s.sanction?.name)).filter(Boolean))];

    const call = await ParentCall.create({
      student: studentId,
      triggeredDate: new Date(),
      period: `${pStart} - ${pEnd}`,
      totalTardiness: attendances.length,
      tardinessDates,
      sanctionsAssigned: allSanctions,
      notes,
      createdBy: req.user._id,
    });
    await call.populate('student');
    res.status(201).json({ success: true, data: call });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateLetter = async (req, res) => {
  try {
    const call = await ParentCall.findById(req.params.id).populate('student');
    if (!call) return res.status(404).json({ success: false, message: 'Data panggilan tidak ditemukan' });

    const school = {
      name: await getSettingValue('schoolName') || 'SDH KUPANG',
      address: await getSettingValue('schoolAddress') || '',
      phone: await getSettingValue('schoolPhone') || '',
      email: await getSettingValue('schoolEmail') || '',
      logoUrl: await getSettingValue('logoUrl') || null,
    };

    call.letterGenerated = true;
    call.letterGeneratedAt = new Date();
    await call.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=surat-panggilan-${call.student.nis}.pdf`);
    generateParentLetterPdf(call, school, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markSent = async (req, res) => {
  try {
    const call = await ParentCall.findByIdAndUpdate(req.params.id, { letterSentDate: new Date() }, { new: true });
    res.json({ success: true, data: call });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
