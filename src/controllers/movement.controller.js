const movementService = require('../services/movement.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getMovements(req, res) {
  try {
    const { page, limit, search, productId, warehouseId, type, reason, startDate, endDate } = req.query;
    const result = await movementService.getMovements({ page, limit, search, productId, warehouseId, type, reason, startDate, endDate });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMovementById(req, res) {
  try {
    const { id } = req.params;
    const movement = await movementService.getMovementById(id);
    res.json(serializeBigInt(movement));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function createMovement(req, res) {
  try {
    const movement = await movementService.createMovement(req.body);
    res.status(201).json(serializeBigInt(movement));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getMovementsSummary(req, res) {
  try {
    const { startDate, endDate, warehouseId } = req.query;
    const result = await movementService.getMovementsSummary({ startDate, endDate, warehouseId });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getMovements,
  getMovementById,
  createMovement,
  getMovementsSummary,
};
