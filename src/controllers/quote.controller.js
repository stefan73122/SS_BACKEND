const quoteService = require('../services/quote.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, status, clientId } = req.query;
    const result = await quoteService.getAllQuotes({ page, limit, search, status, clientId });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const quote = await quoteService.getQuoteById(id);
    res.json(serializeBigInt(quote));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id;
    const quote = await quoteService.createQuote({ ...req.body, createdBy });
    res.status(201).json(serializeBigInt(quote));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const quote = await quoteService.updateQuote(id, req.body);
    res.json(serializeBigInt(quote));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await quoteService.deleteQuote(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function checkStock(req, res) {
  try {
    const { id } = req.params;
    const result = await quoteService.checkQuoteStock(id);
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getReceipt(req, res) {
  try {
    const { id } = req.params;
    const receipt = await quoteService.getQuoteReceipt(id);
    res.json(serializeBigInt(receipt));
  } catch (error) {
    if (error.message === 'Cotización no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function updateItemPrice(req, res) {
  try {
    const { itemId } = req.params;
    const { unitPrice, discount, quantity } = req.body;
    const quote = await quoteService.updateItemPrice(itemId, { unitPrice, discount, quantity });
    res.json(serializeBigInt(quote));
  } catch (error) {
    if (error.message === 'Ítem no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  checkStock,
  getReceipt,
  updateItemPrice,
};
