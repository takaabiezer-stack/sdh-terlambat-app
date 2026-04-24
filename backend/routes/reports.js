const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('report:read'));
router.get('/daily', ctrl.daily);
router.get('/weekly', ctrl.weekly);
router.get('/monthly', ctrl.monthly);
router.get('/by-class', ctrl.byClass);

module.exports = router;
