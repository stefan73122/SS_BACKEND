const categoryService = require('../services/category.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getAllCategories(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await categoryService.getAllCategories({ page, limit, search });
    res.json(serializeBigInt(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    res.json(serializeBigInt(category));
  } catch (error) {
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createCategory(req, res) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(serializeBigInt(category));
  } catch (error) {
    if (error.message.includes('Ya existe') || error.message.includes('requerido')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    res.json(serializeBigInt(category));
  } catch (error) {
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Ya existe')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(id);
    res.json(result);
  } catch (error) {
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('No se puede eliminar')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
