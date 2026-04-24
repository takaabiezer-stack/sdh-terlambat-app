const Setting = require('../models/Setting');

const DEFAULTS = {
  schoolName: 'SDH KUPANG',
  schoolAddress: 'Jl. Timor Raya, Kupang, NTT',
  schoolPhone: '0380-123456',
  schoolEmail: 'sdh@kupang.sch.id',
  onTimeCutoff: '07:30',
  gracePeriodMinutes: 0,
  parentCallThreshold: [{ count: 5, period: 1, level: 'warning' }, { count: 10, period: 1, level: 'call' }],
  timezone: 'Asia/Makassar',
  dateFormat: 'DD/MM/YYYY',
  primaryColor: '#1e40af',
  secondaryColor: '#3b82f6',
  accentColor: '#f59e0b',
  fontFamily: 'sans-serif',
  logoUrl: null,
  academicYear: '2024/2025',
  semester: '1',
};

exports.getAll = async (req, res) => {
  try {
    const settings = await Setting.find({});
    const result = { ...DEFAULTS };
    settings.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updates = req.body;
    const ops = Object.entries(updates).map(([key, value]) =>
      Setting.findOneAndUpdate({ key }, { value, updatedBy: req.user._id }, { upsert: true, new: true })
    );
    await Promise.all(ops);
    res.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSettingValue = async (key) => {
  const s = await Setting.findOne({ key });
  return s ? s.value : DEFAULTS[key];
};
