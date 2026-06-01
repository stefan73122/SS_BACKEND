const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

router.use(authMiddleware);

router.get('/',    requirePermission('users.view'),   userController.getAllUsers);
router.get('/:id', requirePermission('users.view'),   userController.getUserById);
router.post('/',   requirePermission('users.create'), userController.createUser);
router.put('/:id', requirePermission('users.update'), userController.updateUser);
router.delete('/:id', requirePermission('users.delete'), userController.deleteUser);

router.post('/:id/roles',           requirePermission('roles.assign'), userController.assignRole);
router.delete('/:id/roles/:roleId', requirePermission('roles.assign'), userController.removeRole);

module.exports = router;
