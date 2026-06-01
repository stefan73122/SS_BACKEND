const express = require('express');
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/general',               requirePermission('reports.view'),       reportController.getGeneralReport);
router.get('/sales',                 requirePermission('reports.sales'),       reportController.getSalesReport);
router.get('/employees',             requirePermission('reports.employees'),   reportController.getEmployeeReport);
router.get('/inventory',             requirePermission('reports.inventory'),   reportController.getInventoryMovementsReport);
router.get('/product-activity',      requirePermission('reports.products'),    reportController.getProductActivityReport);
router.get('/products-by-warehouse', requirePermission('reports.warehouses'),  reportController.getProductsByWarehouseReport);

module.exports = router;
