const express = require('express');
const excelController = require('../controllers/excel.controller');
const clientExcelController = require('../controllers/clientExcel.controller');
const upload = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

// ── Importación ────────────────────────────────────────────────────────────
router.post('/import-products',
  authMiddleware, requirePermission('excel.import'),
  upload.single('file'), excelController.importProducts);

router.post('/import-products-client/preview',
  authMiddleware, requirePermission('excel.import'),
  upload.single('file'), clientExcelController.previewImport);

router.post('/import-products-client',
  authMiddleware, requirePermission('excel.import'),
  upload.single('file'), clientExcelController.importProductsFromClient);

router.post('/update-stock',
  authMiddleware, requirePermission('excel.import'),
  upload.single('file'), excelController.updateStock);

// ── Plantillas (públicas — solo descarga de archivos vacíos) ───────────────
router.get('/templates/products', excelController.downloadProductsTemplate);
router.get('/templates/stock',    excelController.downloadStockTemplate);

// ── Exportación ────────────────────────────────────────────────────────────
router.get('/export/products-by-warehouse',
  authMiddleware, requirePermission('excel.export'),
  excelController.exportProductsByWarehouse);

router.get('/export/products-by-seller',
  authMiddleware, requirePermission('excel.export'),
  excelController.exportProductsBySeller);

router.get('/export/product-activity',
  authMiddleware, requirePermission('excel.export'),
  excelController.exportProductActivity);

router.get('/export/products-general',
  authMiddleware, requirePermission('excel.export'),
  excelController.exportProductsGeneral);

module.exports = router;
