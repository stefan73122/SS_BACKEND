const express = require('express');
const permissionController = require('../controllers/permission.controller');

const router = express.Router();

router.get('/', permissionController.getAll);
router.get('/by-module', permissionController.getByModule);
router.get('/:id', permissionController.getById);
router.post('/', permissionController.create);
router.post('/bulk', permissionController.createBulk);
router.put('/:id', permissionController.update);
router.delete('/:id', permissionController.remove);

module.exports = router;
