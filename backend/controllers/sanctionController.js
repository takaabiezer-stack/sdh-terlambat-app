const Sanction = require('../models/Sanction');

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true') filter.isActive = true;
    const sanctions = await Sanction.find(filter).populate('createdBy', 'fullName').sort({ name: 1 });
    res.json({ success: true, data: sanctions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const sanction = await Sanction.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: sanction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const sanction = await Sanction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sanction) return res.status(404).json({ success: false, message: 'Sanksi tidak ditemukan' });
    res.json({ success: true, data: sanction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Sanction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sanksi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
