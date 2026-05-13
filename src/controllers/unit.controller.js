const unitService = require('../services/unit.service');

async function getAllUnits(req, res) {
  try {
    const units = await unitService.getAllUnits();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUnitById(req, res) {
  try {
    const { id } = req.params;
    const unit = await unitService.getUnitById(id);
    res.json(unit);
  } catch (error) {
    if (error.message === 'Unidad no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createUnit(req, res) {
  try {
    const unit = await unitService.createUnit(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const unit = await unitService.updateUnit(id, req.body);
    res.json(unit);
  } catch (error) {
    const status = error.message === 'Unidad no encontrada' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
}

async function deleteUnit(req, res) {
  try {
    const { id } = req.params;
    const result = await unitService.deleteUnit(id);
    res.json(result);
  } catch (error) {
    const status = error.message === 'Unidad no encontrada' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
}

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
};
