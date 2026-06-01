const express = require('express');
const permissionController = require('../controllers/permission.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',          requirePermission('permissions.view'),   permissionController.getAll);
router.get('/by-module', requirePermission('permissions.view'),   permissionController.getByModule);
router.get('/:id',       requirePermission('permissions.view'),   permissionController.getById);
router.post('/',         requirePermission('permissions.create'), permissionController.create);
router.post('/bulk',     requirePermission('permissions.create'), permissionController.createBulk);
router.put('/:id',       requirePermission('permissions.update'), permissionController.update);
router.delete('/:id',    requirePermission('permissions.delete'), permissionController.remove);

module.exports = router;
