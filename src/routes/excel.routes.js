const express = require('express');
const excelController = require('../controllers/excel.controller');
const clientExcelController = require('../controllers/clientExcel.controller');
const upload = require('../middlewares/uploadMiddleware');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'defaultSecret';

// Middleware de auth opcional: si hay token lo decodifica, si no continúa igual
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {}
  }
  next();
}

const router = express.Router();

router.post('/import-products', optionalAuth, upload.single('file'), excelController.importProducts);
router.post('/import-products-client/preview', optionalAuth, upload.single('file'), clientExcelController.previewImport);
router.post('/import-products-client', optionalAuth, upload.single('file'), clientExcelController.importProductsFromClient);
router.post('/update-stock', optionalAuth, upload.single('file'), excelController.updateStock);
router.get('/templates/products', excelController.downloadProductsTemplate);
router.get('/templates/stock', excelController.downloadStockTemplate);

module.exports = router;
