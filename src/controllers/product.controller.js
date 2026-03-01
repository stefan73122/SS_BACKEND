const productService = require('../services/product.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAll(req, res) {
  try {
    const { page, limit, search, categoryId } = req.query;
    const result = await productService.getAllProducts({ page, limit, search, categoryId });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    res.json(serializeBigInt(product));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(serializeBigInt(product));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body);
    res.json(serializeBigInt(product));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await productService.deleteProduct(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getStock(req, res) {
  try {
    const { id } = req.params;
    const stock = await productService.getProductStock(id);
    res.json(serializeBigInt(stock));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getStock,
};
