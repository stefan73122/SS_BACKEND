const express = require('express');
const unitController = require('../controllers/unit.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/public', unitController.getAllUnits);

router.use(authMiddleware);

router.get('/', unitController.getAllUnits);
router.get('/:id', unitController.getUnitById);
router.post('/', unitController.createUnit);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
