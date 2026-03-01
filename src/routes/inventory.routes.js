const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const warehouseController = require('../controllers/warehouse.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Rutas de Almacenes (Warehouses)
router.get('/warehouses', warehouseController.getAllWarehouses);
router.get('/warehouses/:id', warehouseController.getWarehouseById);
router.get('/warehouses/:id/stock', warehouseController.getWarehouseStock);
router.post('/warehouses', warehouseController.createWarehouse);
router.put('/warehouses/:id', warehouseController.updateWarehouse);
router.delete('/warehouses/:id', warehouseController.deleteWarehouse);

// Rutas de Inventario
router.get('/', inventoryController.getInventory);
router.get('/movements', inventoryController.getMovements);
router.get('/low-stock', inventoryController.getLowStock);
router.post('/movements', requirePermission('inventory.movements'), inventoryController.createMovement);
router.post('/transfer', requirePermission('inventory.transfer'), inventoryController.transferStock);

module.exports = router;
