const express = require('express');
const exchangeRateController = require('../controllers/exchangeRate.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/current', requirePermission('exchange-rate.view'), exchangeRateController.getCurrentRate);
router.get('/history', requirePermission('exchange-rate.view'), exchangeRateController.getHistory);
router.post('/', requirePermission('exchange-rate.manage'), exchangeRateController.setManualRate);
router.post('/refresh', requirePermission('exchange-rate.manage'), exchangeRateController.refreshAutomaticRate);

module.exports = router;
