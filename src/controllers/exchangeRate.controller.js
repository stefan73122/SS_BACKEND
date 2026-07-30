const exchangeRateService = require('../services/exchangeRate.service');

async function getCurrentRate(req, res) {
  try {
    const rate = await exchangeRateService.getCurrentRate();
    res.json(rate);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function getHistory(req, res) {
  try {
    const { page, limit } = req.query;
    const history = await exchangeRateService.getHistory({ page, limit });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function setManualRate(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const rate = await exchangeRateService.setManualRate(req.body, userId);
    res.status(201).json(rate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function refreshAutomaticRate(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const rate = await exchangeRateService.refreshAutomaticRate(userId);
    res.status(201).json(rate);
  } catch (error) {
    res.status(502).json({ error: `No se pudo obtener el tipo de cambio del BCB: ${error.message}` });
  }
}

module.exports = {
  getCurrentRate,
  getHistory,
  setManualRate,
  refreshAutomaticRate,
};
