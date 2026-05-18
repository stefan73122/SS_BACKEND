const ExcelJS = require('exceljs');
const prisma = require('../prisma/client');

function getCellValue(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(r => r.text).join('');
    if (v.formula !== undefined) return v.result ?? null;
    if (v instanceof Date) return v;
  }
  return v;
}

function worksheetToJson(worksheet, headerRowIndex = 1) {
  const headers = {};
  const data = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === headerRowIndex) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = getCellValue(cell);
        if (val != null) headers[colNumber] = String(val).trim();
      });
    } else if (rowNumber > headerRowIndex) {
      const obj = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (headers[colNumber]) {
          const val = getCellValue(cell);
          obj[headers[colNumber]] = val;
          if (val != null && val !== '') hasData = true;
        }
      });
      if (hasData) data.push(obj);
    }
  });

  return data;
}

async function importProductsFromExcel(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const data = worksheetToJson(worksheet, 1);

    const results = { success: [], errors: [], total: data.length };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      const normalizedRow = {
        name: row.NOMBRE || row.name,
        sku: row.SKU || row.sku,
        description: row.DESCRIPCION || row.description,
        costPrice: row.PRECIO_COSTO || row.costPrice,
        salePrice: row.PRECIO_VENTA || row.salePrice,
        minStock: row.STOCK_MIN || row['STOCK MIN'] || row.minStock,
        categoryId: row.CATEGORIA || row.categoryId,
        unitName: row.UNIDAD || row.unitName || row.unitId,
        quantity: row.CANTIDAD ?? row.quantity ?? null,
        warehouseRef: row.ALMACEN ?? row.warehouseId ?? null,
      };

      try {
        if (!normalizedRow.name || !normalizedRow.sku) {
          results.errors.push({ row: rowNumber, error: 'Campos requeridos: NOMBRE, SKU', data: row });
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

        let unitId;
        if (isNaN(normalizedRow.unitName)) {
          const unit = await prisma.unit.findFirst({
            where: { name: { equals: String(normalizedRow.unitName), mode: 'insensitive' } },
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
          unitId = BigInt(normalizedRow.unitName);
        }

        const existing = await prisma.product.findUnique({ where: { sku: String(normalizedRow.sku) } });
        if (existing) {
          results.errors.push({ row: rowNumber, error: `Producto con SKU "${normalizedRow.sku}" ya existe`, data: row });
          continue;
        }

        const product = await prisma.product.create({
          data: {
            name: normalizedRow.name,
            sku: String(normalizedRow.sku),
            description: normalizedRow.description || null,
            costPrice: normalizedRow.costPrice ? parseFloat(normalizedRow.costPrice) : null,
            salePrice: normalizedRow.salePrice ? parseFloat(normalizedRow.salePrice) : null,
            minStockGlobal: normalizedRow.minStock ? parseInt(normalizedRow.minStock) : null,
            unitId,
            ...(normalizedRow.categoryId && !isNaN(normalizedRow.categoryId)
              ? { categoryId: BigInt(normalizedRow.categoryId) }
              : {}),
          },
        });

        if (normalizedRow.quantity != null && normalizedRow.warehouseRef != null) {
          let warehouseId;
          if (isNaN(normalizedRow.warehouseRef)) {
            const warehouse = await prisma.warehouse.findFirst({
              where: { name: { equals: String(normalizedRow.warehouseRef), mode: 'insensitive' } },
            });
            if (!warehouse) {
              results.errors.push({
                row: rowNumber,
                error: `Almacén "${normalizedRow.warehouseRef}" no encontrado. El producto fue creado sin stock.`,
                data: row,
              });
            } else {
              warehouseId = warehouse.id;
            }
          } else {
            warehouseId = BigInt(normalizedRow.warehouseRef);
          }

          if (warehouseId) {
            const quantity = parseFloat(normalizedRow.quantity);
            await prisma.$transaction(async (tx) => {
              await tx.warehouseStock.upsert({
                where: { warehouseId_productId: { warehouseId, productId: product.id } },
                create: { productId: product.id, warehouseId, quantity },
                update: { quantity: { increment: quantity } },
              });
              await tx.inventoryMovement.create({
                data: {
                  type: 'INGRESO',
                  reason: 'COMPRA',
                  note: 'Stock inicial desde importación Excel',
                  warehouseToId: warehouseId,
                  createdBy: BigInt(1),
                  items: { create: { productId: product.id, quantity } },
                },
              });
            });
          }
        }

        results.success.push({
          row: rowNumber,
          productId: product.id.toString(),
          sku: product.sku,
          name: product.name,
        });
      } catch (error) {
        results.errors.push({ row: rowNumber, error: error.message, data: row });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

async function updateStockFromExcel(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const data = worksheetToJson(worksheet, 1);

    const results = { success: [], errors: [], total: data.length };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        if (!row.sku && !row.productId) {
          results.errors.push({ row: rowNumber, error: 'Se requiere sku o productId', data: row });
          continue;
        }
        if (!row.warehouseId) {
          results.errors.push({ row: rowNumber, error: 'Se requiere warehouseId', data: row });
          continue;
        }
        if (!row.quantity) {
          results.errors.push({ row: rowNumber, error: 'Se requiere quantity', data: row });
          continue;
        }

        const product = row.sku
          ? await prisma.product.findUnique({ where: { sku: String(row.sku) } })
          : await prisma.product.findUnique({ where: { id: BigInt(row.productId) } });

        if (!product) {
          results.errors.push({ row: rowNumber, error: `Producto no encontrado: ${row.sku || row.productId}`, data: row });
          continue;
        }

        const warehouse = await prisma.warehouse.findUnique({ where: { id: BigInt(row.warehouseId) } });
        if (!warehouse) {
          results.errors.push({ row: rowNumber, error: `Almacén no encontrado: ${row.warehouseId}`, data: row });
          continue;
        }

        const quantity = parseInt(row.quantity);
        const type = row.type || 'AJUSTE';
        const reason = row.reason || 'AJUSTE_MANUAL';

        await prisma.$transaction(async (tx) => {
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId: BigInt(row.warehouseId), productId: product.id } },
            update: { quantity },
            create: { productId: product.id, warehouseId: BigInt(row.warehouseId), quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              type,
              reason,
              note: row.notes || 'Actualización desde Excel',
              ...(type === 'INGRESO'
                ? { warehouseToId: BigInt(row.warehouseId) }
                : { warehouseFromId: BigInt(row.warehouseId) }),
              createdBy: row.userId ? BigInt(row.userId) : BigInt(1),
              items: { create: { productId: product.id, quantity: Math.abs(quantity) } },
            },
          });
        });

        results.success.push({
          row: rowNumber,
          productId: product.id.toString(),
          sku: product.sku,
          name: product.name,
          warehouseId: row.warehouseId,
          quantity,
        });
      } catch (error) {
        results.errors.push({ row: rowNumber, error: error.message, data: row });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

function generateProductsTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Productos');

  const numCols = 12;

  // Fila 1: Título
  worksheet.mergeCells(`A1:L1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LISTA CONSOLIDADA DE PRODUCTOS PARA IMPORTACIÓN';
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // Filas 2-5: Instrucciones
  const instructions = [
    'INSTRUCCIONES: Complete los campos requeridos (NOMBRE, SKU). Los datos deben comenzar en la FILA 7.',
    'NOMBRE y SKU son obligatorios. UNIDAD es obligatoria (use: PZA, CAJA, MTR, etc.)',
    'CANTIDAD + ALMACEN = stock inicial. Puede usar el nombre o ID del almacén. Si se omiten, el producto se crea sin stock.',
    'No modifique los encabezados de la fila 6.',
  ];
  instructions.forEach((text, i) => {
    worksheet.getCell(`A${i + 2}`).value = text;
    worksheet.getRow(i + 2).height = 18;
  });

  // Fila 6: Encabezados
  const headers = ['NOMBRE', 'SKU', 'DESCRIPCION', 'PRECIO_COSTO', 'PRECIO_VENTA', 'STOCK_MIN', 'CANTIDAD', 'ALMACEN', 'CATEGORIA', 'UNIDAD', 'MARCA', 'PROVEEDOR'];
  const headerRow = worksheet.getRow(6);
  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  headerRow.height = 28;

  // Filas 7-9: Datos de ejemplo
  const exampleData = [
    ['Cable UTP Cat6', 'CAB-UTP-CAT6', 'Cable de red categoría 6', 50, 80, 10, 100, 'Almacén Principal', 'REDES', 'PZA', 'AMP', 'Proveedor Ejemplo'],
    ['Switch 24 puertos', 'SW-24P', 'Switch Gigabit 24 puertos', 1500, 2000, 5, 10, 'Almacén Secundario', 'REDES', 'PZA', '', ''],
    ['Router WiFi', 'RTR-WIFI-01', 'Router inalámbrico dual band', 800, 1200, 3, 5, 'Almacén Principal', 'REDES', 'PZA', 'TP-Link', ''],
  ];
  exampleData.forEach((rowData, i) => {
    const row = worksheet.getRow(7 + i);
    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
    });
  });

  // Anchos de columna
  [30, 18, 35, 14, 14, 12, 12, 22, 20, 10, 15, 20].forEach((width, i) => {
    worksheet.getColumn(i + 1).width = width;
  });

  // Autofilter
  worksheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: numCols } };

  return workbook;
}

function generateStockTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock');

  // Encabezados
  const headers = ['sku', 'productId', 'warehouseId', 'quantity', 'type', 'reason', 'notes', 'userId'];
  const headerRow = worksheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Datos de ejemplo
  [
    ['CAB-UTP-CAT6', '', 1, 100, 'INGRESO', 'COMPRA', 'Compra inicial', ''],
    ['SW-24P', '', 1, 10, 'INGRESO', 'COMPRA', 'Compra inicial', ''],
  ].forEach((rowData, i) => {
    const row = worksheet.getRow(i + 2);
    rowData.forEach((val, colIdx) => {
      row.getCell(colIdx + 1).value = val;
    });
  });

  // Instrucciones
  [
    '',
    'INSTRUCCIONES:',
    '- sku: Código del producto (obligatorio si no se usa productId)',
    '- productId: ID del producto (dejar vacío si se usa sku)',
    '- warehouseId: ID del almacén (consultar con /api/warehouses)',
    '- quantity: Cantidad a ingresar/egresar',
    '- type: INGRESO o EGRESO',
    '- reason: COMPRA, VENTA, AJUSTE, DEVOLUCION, TRASLADO, OTRO',
    '- notes: Notas adicionales',
    '- userId: Dejar vacío (se asigna automáticamente)',
  ].forEach((text, i) => {
    worksheet.getCell(`A${4 + i}`).value = text;
  });

  // Anchos de columna
  [20, 12, 15, 12, 12, 15, 40, 12].forEach((width, i) => {
    worksheet.getColumn(i + 1).width = width;
  });

  return workbook;
}

module.exports = {
  importProductsFromExcel,
  updateStockFromExcel,
  generateProductsTemplate,
  generateStockTemplate,
};
