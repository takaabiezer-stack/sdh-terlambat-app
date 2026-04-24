const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('role');
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Akun tidak aktif atau tidak ditemukan' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

const authorize = (...permissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
  const userPerms = req.user.role?.permissions || [];
  const hasAll = permissions.every(p => userPerms.includes(p));
  if (!hasAll) return res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
  next();
};

module.exports = { authenticate, authorize };
