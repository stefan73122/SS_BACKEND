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

      // Normalizar nombres de columnas (soportar mayúsculas y minúsculas)
      const normalizedRow = {
        name: row.NOMBRE || row.name,
        sku: row.SKU || row.sku,
        description: row.DESCRIPCION || row.description,
        costPrice: row.PRECIO_COSTO || row.costPrice,
        salePrice: row.PRECIO_VENTA || row.salePrice,
        minStock: row.STOCK_MIN || row.minStock,
        categoryId: row.CATEGORIA || row.categoryId,
        unitId: row.UNIDAD || row.unitId,
        unitName: row.UNIDAD || row.unitName || row.unitId, // Puede ser nombre o ID
      };

      try {
        if (!normalizedRow.name || !normalizedRow.sku) {
          results.errors.push({
            row: rowNumber,
            error: 'Campos requeridos: NOMBRE, SKU',
            data: row,
          });
          continue;
        }

        if (!normalizedRow.unitName) {
          results.errors.push({
            row: rowNumber,
            error: 'El campo UNIDAD es obligatorio. Debe especificar la unidad del producto (Pieza, Caja, Metro, Litro, etc.)',
            data: row,
          });
          continue;
        }

        // Buscar unidad por nombre o ID
        let unitId;
        if (isNaN(normalizedRow.unitName)) {
          // Es un nombre de unidad, buscar por nombre
          const unit = await prisma.unit.findFirst({
            where: {
              name: {
                equals: normalizedRow.unitName,
                mode: 'insensitive',
              },
            },
          });

          if (!unit) {
            results.errors.push({
              row: rowNumber,
              error: `Unidad "${normalizedRow.unitName}" no encontrada. Unidades válidas: Pieza, Caja, Metro, Litro, Kilogramo, etc.`,
              data: row,
            });
            continue;
          }
          unitId = unit.id;
        } else {
          // Es un ID numérico
          unitId = BigInt(normalizedRow.unitName);
        }

        const existing = await prisma.product.findUnique({
          where: { sku: normalizedRow.sku },
        });

        if (existing) {
          results.errors.push({
            row: rowNumber,
            error: `Producto con SKU "${normalizedRow.sku}" ya existe`,
            data: row,
          });
          continue;
        }

        const productData = {
          name: normalizedRow.name,
          sku: normalizedRow.sku,
          description: normalizedRow.description || null,
          costPrice: normalizedRow.costPrice ? parseFloat(normalizedRow.costPrice) : null,
          salePrice: normalizedRow.salePrice ? parseFloat(normalizedRow.salePrice) : null,
          minStock: normalizedRow.minStock ? parseInt(normalizedRow.minStock) : null,
          unitId: unitId,
          ...(normalizedRow.categoryId && { categoryId: BigInt(normalizedRow.categoryId) }),
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
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  const numCols = 11;

  // Fila 1: Título principal
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['LISTA CONSOLIDADA DE PRODUCTOS PARA IMPORTACIÓN']
  ], { origin: 'A1' });

  // Merge del título
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }];

  // Filas 2-5: instrucciones breves
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['INSTRUCCIONES: Complete los campos requeridos (NOMBRE, SKU). Los datos deben comenzar en la FILA 7.'],
    ['NOMBRE y SKU son obligatorios. UNIDAD es obligatoria (use: PZA, CAJA, MTR, etc.)'],
    ['CANTIDAD = stock inicial que se asignará al almacén seleccionado al importar.'],
    ['No modifique los encabezados de la fila 6.'],
  ], { origin: 'A2' });

  // Fila 6: ENCABEZADOS (range:5 en sheet_to_json empieza desde aquí)
  const headers = ['NOMBRE', 'SKU', 'DESCRIPCION', 'PRECIO_COSTO', 'PRECIO_VENTA', 'STOCK_MIN', 'CANTIDAD', 'CATEGORIA', 'UNIDAD', 'MARCA', 'PROVEEDOR'];
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A6' });

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  };

  ['A6','B6','C6','D6','E6','F6','G6','H6','I6','J6','K6'].forEach(cell => {
    if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
    worksheet[cell].s = headerStyle;
  });

  // Fila 7+: Datos de ejemplo
  const exampleData = [
    ['Cable UTP Cat6', 'CAB-UTP-CAT6', 'Cable de red categoría 6', 50, 80, 10, 100, 'REDES', 'PZA', 'AMP', 'Proveedor Ejemplo'],
    ['Switch 24 puertos', 'SW-24P', 'Switch Gigabit 24 puertos', 1500, 2000, 5, 10, 'REDES', 'PZA', '', ''],
    ['Router WiFi', 'RTR-WIFI-01', 'Router inalámbrico dual band', 800, 1200, 3, 5, 'REDES', 'PZA', 'TP-Link', ''],
  ];

  XLSX.utils.sheet_add_aoa(worksheet, exampleData, { origin: 'A7' });

  const dataStyle = {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D3D3D3' } },
      bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
      left: { style: 'thin', color: { rgb: 'D3D3D3' } },
      right: { style: 'thin', color: { rgb: 'D3D3D3' } }
    }
  };

  for (let row = 7; row <= 9; row++) {
    ['A','B','C','D','E','F','G','H','I','J','K'].forEach(col => {
      const cell = col + row;
      if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
      worksheet[cell].s = dataStyle;
    });
  }

  worksheet['!cols'] = [
    { wch: 30 }, // NOMBRE
    { wch: 18 }, // SKU
    { wch: 35 }, // DESCRIPCION
    { wch: 14 }, // PRECIO_COSTO
    { wch: 14 }, // PRECIO_VENTA
    { wch: 12 }, // STOCK_MIN
    { wch: 12 }, // CANTIDAD
    { wch: 20 }, // CATEGORIA
    { wch: 10 }, // UNIDAD
    { wch: 15 }, // MARCA
    { wch: 20 }, // PROVEEDOR
  ];

  worksheet['!rows'] = [
    { hpt: 28 }, // Fila 1 título
    { hpt: 18 }, // Fila 2
    { hpt: 18 }, // Fila 3
    { hpt: 18 }, // Fila 4
    { hpt: 18 }, // Fila 5
    { hpt: 28 }, // Fila 6 encabezados
  ];

  worksheet['!autofilter'] = { ref: 'A6:K6' };

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
  
  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 20 }, // sku
    { wch: 12 }, // productId
    { wch: 15 }, // warehouseId
    { wch: 12 }, // quantity
    { wch: 12 }, // type
    { wch: 15 }, // reason
    { wch: 40 }, // notes
    { wch: 12 }, // userId
  ];

  // Estilo para encabezados
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '70AD47' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Aplicar estilo a encabezados (fila 1)
  const headers = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'];
  headers.forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = headerStyle;
    }
  });

  // Agregar nota explicativa
  XLSX.utils.sheet_add_aoa(worksheet, [
    [''],
    ['INSTRUCCIONES:'],
    ['- sku: Código del producto (obligatorio si no se usa productId)'],
    ['- productId: ID del producto (dejar vacío si se usa sku)'],
    ['- warehouseId: ID del almacén (consultar con /api/warehouses)'],
    ['- quantity: Cantidad a ingresar/egresar'],
    ['- type: INGRESO o EGRESO'],
    ['- reason: COMPRA, VENTA, AJUSTE, DEVOLUCION, TRASLADO, OTRO'],
    ['- notes: Notas adicionales'],
    ['- userId: Dejar vacío (se asigna automáticamente)'],
  ], { origin: 'A' + (template.length + 3) });

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
