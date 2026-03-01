const XLSX = require('xlsx');
const prisma = require('../prisma/client');

async function importProductsFromExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: [],
      errors: [],
      total: data.length,
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        if (!row.name || !row.sku) {
          results.errors.push({
            row: rowNumber,
            error: 'Campos requeridos: name, sku',
            data: row,
          });
          continue;
        }

        const existing = await prisma.product.findUnique({
          where: { sku: row.sku },
        });

        if (existing) {
          results.errors.push({
            row: rowNumber,
            error: `Producto con SKU "${row.sku}" ya existe`,
            data: row,
          });
          continue;
        }

        const productData = {
          name: row.name,
          sku: row.sku,
          description: row.description || null,
          costPrice: row.costPrice ? parseFloat(row.costPrice) : null,
          salePrice: row.salePrice ? parseFloat(row.salePrice) : null,
          minStock: row.minStock ? parseInt(row.minStock) : null,
          ...(row.categoryId && { categoryId: BigInt(row.categoryId) }),
          ...(row.unitId && { unitId: BigInt(row.unitId) }),
        };

        const product = await prisma.product.create({
          data: productData,
        });

        results.success.push({
          row: rowNumber,
          productId: product.id.toString(),
          sku: product.sku,
          name: product.name,
        });
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

async function updateStockFromExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: [],
      errors: [],
      total: data.length,
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        if (!row.sku && !row.productId) {
          results.errors.push({
            row: rowNumber,
            error: 'Se requiere sku o productId',
            data: row,
          });
          continue;
        }

        if (!row.warehouseId) {
          results.errors.push({
            row: rowNumber,
            error: 'Se requiere warehouseId',
            data: row,
          });
          continue;
        }

        if (!row.quantity) {
          results.errors.push({
            row: rowNumber,
            error: 'Se requiere quantity',
            data: row,
          });
          continue;
        }

        let product;
        if (row.sku) {
          product = await prisma.product.findUnique({
            where: { sku: row.sku },
          });
        } else {
          product = await prisma.product.findUnique({
            where: { id: BigInt(row.productId) },
          });
        }

        if (!product) {
          results.errors.push({
            row: rowNumber,
            error: `Producto no encontrado: ${row.sku || row.productId}`,
            data: row,
          });
          continue;
        }

        const warehouse = await prisma.warehouse.findUnique({
          where: { id: BigInt(row.warehouseId) },
        });

        if (!warehouse) {
          results.errors.push({
            row: rowNumber,
            error: `Almacén no encontrado: ${row.warehouseId}`,
            data: row,
          });
          continue;
        }

        const quantity = parseInt(row.quantity);
        const type = row.type || 'AJUSTE';
        const reason = row.reason || 'AJUSTE_MANUAL';

        const existingStock = await prisma.stock.findFirst({
          where: {
            productId: product.id,
            warehouseId: BigInt(row.warehouseId),
          },
        });

        if (existingStock) {
          await prisma.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: quantity,
            },
          });
        } else {
          await prisma.stock.create({
            data: {
              productId: product.id,
              warehouseId: BigInt(row.warehouseId),
              quantity: quantity,
            },
          });
        }

        await prisma.inventoryMovement.create({
          data: {
            productId: product.id,
            warehouseId: BigInt(row.warehouseId),
            type: type,
            reason: reason,
            quantity: Math.abs(quantity),
            notes: row.notes || 'Actualización desde Excel',
            userId: row.userId ? BigInt(row.userId) : null,
          },
        });

        results.success.push({
          row: rowNumber,
          productId: product.id.toString(),
          sku: product.sku,
          name: product.name,
          warehouseId: row.warehouseId,
          quantity: quantity,
        });
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

function generateProductsTemplate() {
  const template = [
    {
      name: 'Cable UTP Cat6',
      sku: 'CAB-UTP-CAT6',
      description: 'Cable de red categoría 6',
      costPrice: 5000,
      salePrice: 8000,
      minStock: 50,
      categoryId: 1,
      unitId: 1,
    },
    {
      name: 'Switch 24 puertos',
      sku: 'SW-24P',
      description: 'Switch Gigabit 24 puertos',
      costPrice: 150000,
      salePrice: 200000,
      minStock: 5,
      categoryId: 1,
      unitId: 2,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  return workbook;
}

function generateStockTemplate() {
  const template = [
    {
      sku: 'CAB-UTP-CAT6',
      productId: '',
      warehouseId: 1,
      quantity: 100,
      type: 'INGRESO',
      reason: 'COMPRA',
      notes: 'Compra inicial',
      userId: '',
    },
    {
      sku: 'SW-24P',
      productId: '',
      warehouseId: 1,
      quantity: 10,
      type: 'INGRESO',
      reason: 'COMPRA',
      notes: 'Compra inicial',
      userId: '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

  return workbook;
}

module.exports = {
  importProductsFromExcel,
  updateStockFromExcel,
  generateProductsTemplate,
  generateStockTemplate,
};
