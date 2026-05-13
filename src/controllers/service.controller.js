const serviceService = require('../services/service.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, isActive } = req.query;
    const result = await serviceService.getAllServices({ page, limit, search, isActive });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const service = await serviceService.getServiceById(id);
    res.json(serializeBigInt(service));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json(serializeBigInt(service));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const service = await serviceService.updateService(id, req.body);
    res.json(serializeBigInt(service));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await serviceService.deleteService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
