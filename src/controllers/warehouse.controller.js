const warehouseService = require('../services/warehouse.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAllWarehouses(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await warehouseService.getAllWarehouses({ page, limit, search });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getWarehouseById(req, res) {
  try {
    const { id } = req.params;
    const warehouse = await warehouseService.getWarehouseById(id);
    res.json(serializeBigInt(warehouse));
  } catch (error) {
    if (error.message === 'Almacén no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createWarehouse(req, res) {
  try {
    const warehouse = await warehouseService.createWarehouse(req.body);
    res.status(201).json(serializeBigInt(warehouse));
  } catch (error) {
    if (error.message.includes('Ya existe')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function updateWarehouse(req, res) {
  try {
    const { id } = req.params;
    const warehouse = await warehouseService.updateWarehouse(id, req.body);
    res.json(serializeBigInt(warehouse));
  } catch (error) {
    if (error.message === 'Almacén no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Ya existe')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function deleteWarehouse(req, res) {
  try {
    const { id } = req.params;
    const result = await warehouseService.deleteWarehouse(id);
    res.json(result);
  } catch (error) {
    if (error.message === 'Almacén no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('No se puede eliminar')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function getWarehouseStock(req, res) {
  try {
    const { id } = req.params;
    const result = await warehouseService.getWarehouseStock(id);
    res.json(serializeBigInt(result));
  } catch (error) {
    if (error.message === 'Almacén no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock,
};
