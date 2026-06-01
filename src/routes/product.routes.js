const express = require('express');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',        requirePermission('products.view'),   productController.getAll);
router.get('/:id',     requirePermission('products.view'),   productController.getById);
router.get('/:id/stock', requirePermission('products.stock'), productController.getStock);
router.post('/',       requirePermission('products.create'), productController.create);
router.put('/:id',     requirePermission('products.update'), productController.update);
router.delete('/:id',  requirePermission('products.delete'), productController.remove);

module.exports = router;
