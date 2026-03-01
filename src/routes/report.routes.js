const express = require('express');
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('reports.view'));

router.get('/general', reportController.getGeneralReport);
router.get('/sales', reportController.getSalesReport);
router.get('/employees', reportController.getEmployeeReport);
router.get('/inventory', reportController.getInventoryMovementsReport);

module.exports = router;
