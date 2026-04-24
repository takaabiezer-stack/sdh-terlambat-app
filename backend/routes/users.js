const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('user:read'), ctrl.getAll);
router.post('/', authorize('user:create'), ctrl.create);
router.put('/:id', authorize('user:update'), ctrl.update);
router.delete('/:id', authorize('user:delete'), ctrl.delete);
router.post('/:id/reset-password', authorize('user:update'), ctrl.resetPassword);
router.get('/roles', authorize('role:read'), ctrl.getRoles);
router.post('/roles', authorize('role:create'), ctrl.createRole);
router.put('/roles/:id', authorize('role:update'), ctrl.updateRole);

module.exports = router;
