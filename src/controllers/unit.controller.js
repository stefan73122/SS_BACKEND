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

module.exports = {
  getAllUnits,
  getUnitById,
};
