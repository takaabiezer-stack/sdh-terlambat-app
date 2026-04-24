const router = require('express').Router();
const ctrl = require('../controllers/settingController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', ctrl.getAll);
router.use(authenticate);
router.put('/', authorize('setting:update'), ctrl.update);
router.post('/logo', authorize('setting:branding'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File logo tidak ditemukan' });
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const Setting = require('../models/Setting');
    await Setting.findOneAndUpdate({ key: 'logoUrl' }, { value: logoUrl, updatedBy: req.user._id }, { upsert: true });
    res.json({ success: true, data: { logoUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
