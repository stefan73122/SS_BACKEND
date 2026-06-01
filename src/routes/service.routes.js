const express = require('express');
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',       requirePermission('services.view'),   serviceController.getAll);
router.get('/:id',    requirePermission('services.view'),   serviceController.getById);
router.post('/',      requirePermission('services.create'), serviceController.create);
router.put('/:id',    requirePermission('services.update'), serviceController.update);
router.delete('/:id', requirePermission('services.delete'), serviceController.remove);

module.exports = router;
