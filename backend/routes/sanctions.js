const router = require('express').Router();
const ctrl = require('../controllers/sanctionController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('sanction:read'), ctrl.getAll);
router.post('/', authorize('sanction:create'), ctrl.create);
router.put('/:id', authorize('sanction:update'), ctrl.update);
router.delete('/:id', authorize('sanction:delete'), ctrl.delete);

module.exports = router;
