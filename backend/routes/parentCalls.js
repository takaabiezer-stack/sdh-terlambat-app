const router = require('express').Router();
const ctrl = require('../controllers/parentCallController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('parent-call:read'), ctrl.getAll);
router.get('/eligible', authorize('parent-call:read'), ctrl.checkEligible);
router.post('/', authorize('parent-call:create'), ctrl.create);
router.get('/:id/letter', authorize('parent-call:generate'), ctrl.generateLetter);
router.put('/:id/sent', authorize('parent-call:create'), ctrl.markSent);

module.exports = router;
