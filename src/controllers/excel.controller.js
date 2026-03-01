const excelService = require('../services/excel.service');
const clientExcelService = require('../services/clientExcel.service');
const { serializeBigInt } = require('../utils/bigintSerializer');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

async function importProducts(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Usar el servicio con mapeo del cliente
    const userId = req.user?.id || req.user?.userId;
    const results = await clientExcelService.importProductsFromClientExcel(req.file.path, userId);

    fs.unlinkSync(req.file.path);

    res.json(serializeBigInt({
      message: 'Importación completada',
      results: {
        total: results.total,
        success: results.success.length,
        errors: results.errors.length,
        created: results.created,
        updated: results.updated,
        successDetails: results.success,
        errorDetails: results.errors,
      },
    }));
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
}

async function updateStock(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const results = await excelService.updateStockFromExcel(req.file.path);

    fs.unlinkSync(req.file.path);

    res.json(serializeBigInt({
      message: 'Actualización de stock completada',
      results: {
        total: results.total,
        success: results.success.length,
        errors: results.errors.length,
        successDetails: results.success,
        errorDetails: results.errors,
      },
    }));
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
}

async function downloadProductsTemplate(req, res) {
  try {
    const workbook = excelService.generateProductsTemplate();
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function downloadStockTemplate(req, res) {
  try {
    const workbook = excelService.generateStockTemplate();
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_stock.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  importProducts,
  updateStock,
  downloadProductsTemplate,
  downloadStockTemplate,
};
