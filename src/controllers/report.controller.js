const reportService = require('../services/report.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getSalesReport(req, res) {
  try {
    const { startDate, endDate, userId, status, page, limit } = req.query;
    const result = await reportService.getSalesReport({ startDate, endDate, userId, status, page, limit });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getEmployeeReport(req, res) {
  try {
    const { userId, startDate, endDate } = req.query;
    const result = await reportService.getEmployeeReport({ userId, startDate, endDate });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getInventoryMovementsReport(req, res) {
  try {
    const { startDate, endDate, warehouseId, type, page, limit } = req.query;
    const result = await reportService.getInventoryMovementsReport({ startDate, endDate, warehouseId, type, page, limit });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getGeneralReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.getGeneralReport({ startDate, endDate });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSalesReport,
  getEmployeeReport,
  getInventoryMovementsReport,
  getGeneralReport,
};
