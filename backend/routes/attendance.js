const router = require('express').Router();
const ctrl = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/today', authorize('attendance:read'), ctrl.getToday);
router.get('/stats', authorize('attendance:read'), ctrl.getDashboardStats);
router.get('/sanctions-summary', authorize('attendance:read'), ctrl.getSanctionsSummary);
router.get('/top-violators', authorize('attendance:read'), ctrl.getTopViolators);
router.get('/by-date', authorize('attendance:read'), ctrl.getByDate);
router.get('/student/:studentId', authorize('attendance:read'), ctrl.getStudentHistory);
router.post('/', authorize('attendance:create'), ctrl.create);
router.put('/:id', authorize('attendance:update'), ctrl.update);
router.delete('/:id', authorize('attendance:delete'), ctrl.remove);
router.post('/:id/sanctions', authorize('attendance:update'), ctrl.addSanction);
router.delete('/:id/sanctions/:sanctionId', authorize('attendance:update'), ctrl.removeSanction);

module.exports = router;
