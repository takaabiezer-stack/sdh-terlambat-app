const router = require('express').Router();
const ctrl = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);
router.get('/', authorize('student:read'), ctrl.getAll);
router.get('/classes', authorize('student:read'), ctrl.getClasses);
router.get('/export', authorize('student:export'), ctrl.exportExcel);
router.get('/template', authorize('student:import'), ctrl.downloadTemplate);
router.get('/nis/:nis', authorize('student:read'), ctrl.getByNis);
router.get('/:id', authorize('student:read'), ctrl.getById);
router.post('/', authorize('student:create'), ctrl.create);
router.post('/import', authorize('student:import'), upload.single('file'), ctrl.importExcel);
router.put('/:id', authorize('student:update'), ctrl.update);
router.delete('/:id', authorize('student:delete'), ctrl.delete);

module.exports = router;
