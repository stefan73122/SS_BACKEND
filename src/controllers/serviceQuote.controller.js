const serviceQuoteService = require('../services/serviceQuote.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, status, clientId } = req.query;
    const result = await serviceQuoteService.getAllServiceQuotes({ page, limit, search, status, clientId });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const quote = await serviceQuoteService.getServiceQuoteById(id);
    res.json(serializeBigInt(quote));
  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no es una cotización')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id;
    const quote = await serviceQuoteService.createServiceQuote({ ...req.body, createdBy });
    res.status(201).json(serializeBigInt(quote));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const quote = await serviceQuoteService.updateServiceQuote(id, req.body);
    res.json(serializeBigInt(quote));
  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no es una cotización')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await serviceQuoteService.deleteServiceQuote(id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no es una cotización')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
}

async function getReceipt(req, res) {
  try {
    const { id } = req.params;
    const receipt = await serviceQuoteService.getServiceQuoteReceipt(id);
    res.json(serializeBigInt(receipt));
  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no es una cotización')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getReceipt,
};
