const inventoryService = require('../services/inventory.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAllWarehouses(req, res) {
  try {
    const warehouses = await inventoryService.getAllWarehouses();
    res.json(serializeBigInt(warehouses));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getWarehouseById(req, res) {
  try {
    const { id } = req.params;
    const warehouse = await inventoryService.getWarehouseById(id);
    res.json(serializeBigInt(warehouse));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function createMovement(req, res) {
  try {
    const movement = await inventoryService.createMovement(req.body);
    res.status(201).json(serializeBigInt(movement));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getMovements(req, res) {
  try {
    const { page, limit, productId, warehouseId, type } = req.query;
    const result = await inventoryService.getMovements({ page, limit, productId, warehouseId, type });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getInventory(req, res) {
  try {
    const { page, limit, search, categoryId, warehouseId, lowStockOnly } = req.query;
    const result = await inventoryService.getInventory({ 
      page, 
      limit, 
      search, 
      categoryId, 
      warehouseId,
      lowStockOnly: lowStockOnly === 'true'
    });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getInventoryByUserWarehouse(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { page, limit, search, categoryId, lowStockOnly } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener el warehouseId del usuario
    const prisma = require('../prisma/client');
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { warehouseId: true },
    });

    if (!user || !user.warehouseId) {
      return res.status(400).json({ 
        error: 'El usuario no tiene un almacén asignado',
        code: 'NO_WAREHOUSE_ASSIGNED'
      });
    }

    const result = await inventoryService.getInventory({ 
      page, 
      limit, 
      search, 
      categoryId, 
      warehouseId: user.warehouseId.toString(),
      lowStockOnly: lowStockOnly === 'true'
    });

    res.json(serializeBigInt({
      ...result,
      warehouseId: user.warehouseId.toString(),
      message: 'Productos filtrados por el almacén asignado al usuario'
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getLowStock(req, res) {
  try {
    const products = await inventoryService.getLowStockProducts();
    res.json(serializeBigInt(products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function transferStock(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const result = await inventoryService.transferStock({ ...req.body, userId });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  createMovement,
  getMovements,
  getInventory,
  getInventoryByUserWarehouse,
  getLowStock,
  transferStock,
};
