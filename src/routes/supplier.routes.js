const express = require('express');
const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',       requirePermission('suppliers.view'),   supplierController.getAll);
router.get('/:id',    requirePermission('suppliers.view'),   supplierController.getById);
router.post('/',      requirePermission('suppliers.create'), supplierController.create);
router.put('/:id',    requirePermission('suppliers.update'), supplierController.update);
router.delete('/:id', requirePermission('suppliers.delete'), supplierController.remove);

module.exports = router;
