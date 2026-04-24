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
    const userId = req.user?.userId || req.user?.id;
    const movement = await inventoryService.createMovement({
      ...req.body,
      createdBy: userId,
    });
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
    const userRoles = req.user?.roles || [];
    const { page, limit, search, categoryId, lowStockOnly, warehouseId: queryWarehouseId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const isAdmin = userRoles.some(
      r => typeof r === 'string' && r.trim().toLowerCase() === 'administrador'
    );

    // Obtener el warehouseId del usuario
    const prisma = require('../prisma/client');
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { warehouseId: true },
    });

    // Determinar el almacén efectivo:
    //  - Admin: puede ver todos (null) o filtrar por queryWarehouseId
    //  - Usuario normal: debe tener almacén asignado
    let effectiveWarehouseId = null;
    if (isAdmin) {
      effectiveWarehouseId = queryWarehouseId || null; // null = todos los almacenes
    } else if (user && user.warehouseId) {
      effectiveWarehouseId = user.warehouseId.toString();
    } else {
      return res.status(400).json({
        error: 'El usuario no tiene un almacén asignado',
        code: 'NO_WAREHOUSE_ASSIGNED',
      });
    }

    const result = await inventoryService.getInventory({
      page,
      limit,
      search,
      categoryId,
      warehouseId: effectiveWarehouseId,
      lowStockOnly: lowStockOnly === 'true',
    });

    res.json(serializeBigInt({
      ...result,
      warehouseId: effectiveWarehouseId,
      isAdminView: isAdmin && !queryWarehouseId,
      message: isAdmin && !queryWarehouseId
        ? 'Vista de administrador: inventario de todos los almacenes'
        : 'Productos filtrados por almacén',
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
