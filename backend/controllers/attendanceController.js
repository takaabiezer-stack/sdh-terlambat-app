const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Setting = require('../models/Setting');
const { getSettingValue } = require('./settingController');

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const calculateStatus = async (arrivalTime) => {
  const cutoffStr = await getSettingValue('onTimeCutoff') || '07:30';
  const grace = parseInt(await getSettingValue('gracePeriodMinutes') || 0);
  const cutoffMins = parseTime(cutoffStr) + grace;
  const arrMins = arrivalTime.getHours() * 60 + arrivalTime.getMinutes();
  if (arrMins <= cutoffMins) return { status: 'OnTime', tardinessMinutes: 0 };
  return { status: 'Late', tardinessMinutes: arrMins - parseTime(cutoffStr) };
};

exports.create = async (req, res) => {
  try {
    const { studentId, nis, arrivalTime: rawTime, sanctionIds = [], notes = '', inputMethod = 'manual' } = req.body;

    let student;
    if (nis) student = await Student.findOne({ nis, isArchived: false });
    else if (studentId) student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const now = rawTime ? new Date(rawTime) : new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await Attendance.findOne({ student: student._id, date: today });
    if (existing) return res.status(400).json({ success: false, message: 'Siswa sudah absen hari ini', data: existing });

    const { status, tardinessMinutes } = await calculateStatus(now);

    const sanctions = sanctionIds.map(id => ({ sanction: id, assignedBy: req.user._id }));

    const attendance = await Attendance.create({
      student: student._id,
      date: today,
      arrivalTime: now,
      status,
      tardinessMinutes,
      sanctions,
      inputMethod,
      notes,
      createdBy: req.user._id,
    });

    await attendance.populate([{ path: 'student', select: 'nis name class grade' }, { path: 'sanctions.sanction', select: 'name' }]);

    res.status(201).json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const { class: cls, status } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = { date: { $gte: today, $lt: tomorrow } };
    if (status) filter.status = status;

    let records = await Attendance.find(filter)
      .populate('student', 'nis name class grade parentName parentPhone')
      .populate('sanctions.sanction', 'name')
      .sort({ arrivalTime: 1 });

    if (cls) records = records.filter(r => r.student?.class === cls);

    res.json({ success: true, data: records, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByDate = async (req, res) => {
  try {
    const { date, class: cls, status } = req.query;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const filter = { date: { $gte: d, $lt: next } };
    if (status) filter.status = status;

    let records = await Attendance.find(filter)
      .populate('student', 'nis name class grade parentName parentPhone')
      .populate('sanctions.sanction', 'name')
      .sort({ arrivalTime: 1 });

    if (cls) records = records.filter(r => r.student?.class === cls);

    res.json({ success: true, data: records, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addSanction = async (req, res) => {
  try {
    const { sanctionId } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });

    attendance.sanctions.push({ sanction: sanctionId, assignedBy: req.user._id });
    await attendance.save();
    await attendance.populate('sanctions.sanction', 'name');

    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeSanction = async (req, res) => {
  try {
    const { sanctionId } = req.params;
    await Attendance.findByIdAndUpdate(req.params.id, { $pull: { sanctions: { sanction: sanctionId } } });
    res.json({ success: true, message: 'Sanksi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { from, to, page = 1, limit = 20 } = req.query;
    const filter = { student: studentId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) { const t = new Date(to); t.setDate(t.getDate() + 1); filter.date.$lt = t; }
    }
    const [records, total] = await Promise.all([
      Attendance.find(filter).populate('sanctions.sanction', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Attendance.countDocuments(filter),
    ]);
    res.json({ success: true, data: records, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { arrivalTime: rawTime, notes, status: manualStatus } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });

    if (rawTime) {
      const now = new Date(rawTime);
      attendance.arrivalTime = now;
      const { status, tardinessMinutes } = await calculateStatus(now);
      attendance.status = manualStatus || status;
      attendance.tardinessMinutes = tardinessMinutes;
    } else if (manualStatus) {
      attendance.status = manualStatus;
      if (manualStatus !== 'Late') attendance.tardinessMinutes = 0;
    }
    if (notes !== undefined) attendance.notes = notes;

    await attendance.save();
    await attendance.populate([
      { path: 'student', select: 'nis name class grade parentName parentPhone' },
      { path: 'sanctions.sanction', select: 'name' },
    ]);
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Data absensi tidak ditemukan' });
    res.json({ success: true, message: 'Data absensi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayLate, todayTotal, monthLate] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'Late' }),
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      Attendance.countDocuments({ date: { $gte: monthStart }, status: 'Late' }),
    ]);

    res.json({ success: true, data: { todayLate, todayTotal, monthLate } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSanctionsSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? Number(month) - 1 : new Date().getMonth();
    const y = year ? Number(year) : new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 1);

    const records = await Attendance.find({
      date: { $gte: start, $lt: end },
      'sanctions.0': { $exists: true },
    })
      .populate('student', 'nis name class grade')
      .populate('sanctions.sanction', 'name')
      .sort({ date: -1 });

    const byStudent = {};
    records.forEach(r => {
      if (!r.student) return;
      const key = r.student._id.toString();
      if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0, sanctions: [], lastDate: null };
      byStudent[key].count++;
      if (!byStudent[key].lastDate || r.date > byStudent[key].lastDate) byStudent[key].lastDate = r.date;
      r.sanctions.forEach(s => {
        if (s.sanction?.name && !byStudent[key].sanctions.includes(s.sanction.name))
          byStudent[key].sanctions.push(s.sanction.name);
      });
    });

    const result = Object.values(byStudent).sort((a, b) => b.count - a.count);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTopViolators = async (req, res) => {
  try {
    const { month, year, limit: lim = 10 } = req.query;
    const m = month ? Number(month) - 1 : new Date().getMonth();
    const y = year ? Number(year) : new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 1);

    const records = await Attendance.find({ date: { $gte: start, $lt: end }, status: 'Late' })
      .populate('student', 'nis name class grade')
      .sort({ date: -1 });

    const byStudent = {};
    records.forEach(r => {
      if (!r.student) return;
      const key = r.student._id.toString();
      if (!byStudent[key]) byStudent[key] = { student: r.student, count: 0 };
      byStudent[key].count++;
    });

    const result = Object.values(byStudent).sort((a, b) => b.count - a.count).slice(0, Number(lim));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
