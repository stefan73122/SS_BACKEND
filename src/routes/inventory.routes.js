const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const warehouseController = require('../controllers/warehouse.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

// ── Almacenes ──────────────────────────────────────────────────────────────
router.get('/warehouses',          requirePermission('warehouses.view'),   warehouseController.getAllWarehouses);
router.get('/warehouses/:id',      requirePermission('warehouses.view'),   warehouseController.getWarehouseById);
router.get('/warehouses/:id/stock', requirePermission('warehouses.view'),  warehouseController.getWarehouseStock);
router.post('/warehouses',         requirePermission('warehouses.create'), warehouseController.createWarehouse);
router.put('/warehouses/:id',      requirePermission('warehouses.update'), warehouseController.updateWarehouse);
router.delete('/warehouses/:id',   requirePermission('warehouses.delete'), warehouseController.deleteWarehouse);

// ── Inventario ─────────────────────────────────────────────────────────────
router.get('/',            requirePermission('inventory.view'),           inventoryController.getInventory);
router.get('/my-warehouse', requirePermission('inventory.view'),          inventoryController.getInventoryByUserWarehouse);
router.get('/movements',   requirePermission('inventory.view-movements'), inventoryController.getMovements);
router.get('/low-stock',   requirePermission('inventory.view-low-stock'), inventoryController.getLowStock);
router.post('/movements',  requirePermission('inventory.movements'),      inventoryController.createMovement);
router.post('/transfer',   requirePermission('inventory.transfer'),       inventoryController.transferStock);

module.exports = router;
