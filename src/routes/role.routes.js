const express = require('express');
const roleController = require('../controllers/role.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',    requirePermission('roles.view'),   roleController.getAll);
router.get('/:id', requirePermission('roles.view'),   roleController.getById);
router.post('/',   requirePermission('roles.create'), roleController.create);
router.put('/:id', requirePermission('roles.update'), roleController.update);
router.delete('/:id', requirePermission('roles.delete'), roleController.remove);

router.post('/:id/permissions',                  requirePermission('roles.assign'), roleController.assignPermissions);
router.delete('/:id/permissions/:permissionId',  requirePermission('roles.assign'), roleController.removePermission);

router.post('/assign-user',  requirePermission('roles.assign'), roleController.assignToUser);
router.post('/remove-user',  requirePermission('roles.assign'), roleController.removeFromUser);

router.get('/user/:userId/roles',       requirePermission('roles.view'), roleController.getUserRoles);
router.get('/user/:userId/permissions', requirePermission('roles.view'), roleController.getUserPermissions);

module.exports = router;
