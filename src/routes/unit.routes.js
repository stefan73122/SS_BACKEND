const express = require('express');
const unitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Endpoint público temporal para verificar que funciona
router.get('/public', unitController.getAllUnits);

router.get('/', authMiddleware, unitController.getAllUnits);
router.get('/:id', authMiddleware, unitController.getUnitById);

module.exports = router;
