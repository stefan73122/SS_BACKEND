const express = require('express');
const roleController = require('../controllers/role.controller');

const router = express.Router();

router.get('/', roleController.getAll);
router.get('/:id', roleController.getById);
router.post('/', roleController.create);
router.put('/:id', roleController.update);
router.delete('/:id', roleController.remove);

router.post('/:id/permissions', roleController.assignPermissions);
router.delete('/:id/permissions/:permissionId', roleController.removePermission);

router.post('/assign-user', roleController.assignToUser);
router.post('/remove-user', roleController.removeFromUser);

router.get('/user/:userId/roles', roleController.getUserRoles);
router.get('/user/:userId/permissions', roleController.getUserPermissions);

module.exports = router;
