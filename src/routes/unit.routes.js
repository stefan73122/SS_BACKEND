const express = require('express');
const unitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.get('/', authMiddleware, requirePermission('units.view'), unitController.getAllUnits);
router.get('/:id', authMiddleware, requirePermission('units.view'), unitController.getUnitById);

module.exports = router;
