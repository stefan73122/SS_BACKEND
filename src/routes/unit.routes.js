const express = require('express');
const unitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, unitController.getAllUnits);
router.get('/:id', authMiddleware, unitController.getUnitById);

module.exports = router;
