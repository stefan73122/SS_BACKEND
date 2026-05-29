const excelService = require('../services/excel.service');
const clientExcelService = require('../services/clientExcel.service');
const { serializeBigInt } = require('../utils/bigintSerializer');
const fs = require('fs');

async function importProducts(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Usar el servicio con mapeo del cliente
    const userId = req.user?.id || req.user?.userId;
    const { warehouseId, categoryMappings } = req.body;
    const parsedCategoryMappings = categoryMappings ? JSON.parse(categoryMappings) : {};
    const results = await clientExcelService.importProductsFromClientExcel(req.file.path, userId, warehouseId, parsedCategoryMappings);

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
    const buffer = await workbook.xlsx.writeBuffer();
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
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_stock.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function exportProductsByWarehouse(req, res) {
  try {
    const { warehouseId, startDate, endDate } = req.query;
    const workbook = await excelService.exportProductsByWarehouse({ warehouseId, startDate, endDate });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `productos_por_almacen_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function exportProductsBySeller(req, res) {
  try {
    const { userId, startDate, endDate } = req.query;
    const workbook = await excelService.exportProductsBySeller({ userId, startDate, endDate });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `productos_por_vendedor_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function exportProductActivity(req, res) {
  try {
    const { startDate, endDate, warehouseId, userId } = req.query;
    const workbook = await excelService.exportProductActivity({ startDate, endDate, warehouseId, userId });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `actividad_productos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function exportProductsGeneral(req, res) {
  try {
    const { startDate, endDate, includeInactive } = req.query;
    const workbook = await excelService.exportProductsGeneral({
      startDate,
      endDate,
      includeInactive: includeInactive === 'true',
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `productos_general_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
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
  exportProductsByWarehouse,
  exportProductsBySeller,
  exportProductActivity,
  exportProductsGeneral,
};
