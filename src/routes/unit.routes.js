const express = require('express');
const unitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

// Ruta pública para selects/formularios del frontend
router.get('/public', unitController.getAllUnits);

router.use(authMiddleware);

router.get('/',       requirePermission('units.view'),   unitController.getAllUnits);
router.get('/:id',    requirePermission('units.view'),   unitController.getUnitById);
router.post('/',      requirePermission('units.create'), unitController.createUnit);
router.put('/:id',    requirePermission('units.update'), unitController.updateUnit);
router.delete('/:id', requirePermission('units.delete'), unitController.deleteUnit);

module.exports = router;
