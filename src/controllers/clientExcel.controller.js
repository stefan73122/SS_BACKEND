const clientExcelService = require('../services/clientExcel.service');
const { serializeBigInt } = require('../utils/bigintSerializer');
const fs = require('fs');

async function previewImport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo Excel' });
    }

    const filePath = req.file.path;
    const preview = await clientExcelService.previewImportFromClientExcel(filePath);

    // Eliminar archivo temporal
    fs.unlinkSync(filePath);

    res.json(serializeBigInt(preview));
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
}

async function importProductsFromClient(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo Excel' });
    }

    const { warehouseId, categoryMappings } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ error: 'El almacén de destino es requerido' });
    }

    const filePath = req.file.path;
    const userId = req.user?.id || req.user?.userId;
    
    const parsedCategoryMappings = categoryMappings ? JSON.parse(categoryMappings) : {};
    
    const results = await clientExcelService.importProductsFromClientExcel(
      filePath, 
      userId, 
      warehouseId,
      parsedCategoryMappings
    );

    // Eliminar archivo temporal
    fs.unlinkSync(filePath);

    res.json(serializeBigInt(results));
  } catch (error) {
    // Eliminar archivo temporal en caso de error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  previewImport,
  importProductsFromClient,
};
