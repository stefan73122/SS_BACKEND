const supplierService = require('../services/supplier.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await supplierService.getAllSuppliers({ page, limit, search });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const supplier = await supplierService.getSupplierById(id);
    res.json(serializeBigInt(supplier));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    res.status(201).json(serializeBigInt(supplier));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const supplier = await supplierService.updateSupplier(id, req.body);
    res.json(serializeBigInt(supplier));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await supplierService.deleteSupplier(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
