const ExcelJS = require('exceljs');
const prisma = require('../prisma/client');

function endOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

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

// ─── ESTILOS COMPARTIDOS ──────────────────────────────────────────────────────

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  },
};

function applyHeaderStyle(cell) {
  cell.font = HEADER_STYLE.font;
  cell.fill = HEADER_STYLE.fill;
  cell.alignment = HEADER_STYLE.alignment;
  cell.border = HEADER_STYLE.border;
}

function addTitleRow(worksheet, title, colCount) {
  const endCol = String.fromCharCode(64 + colCount);
  worksheet.mergeCells(`A1:${endCol}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;
}

function addInfoRow(worksheet, label, value, row) {
  worksheet.getCell(`A${row}`).value = label;
  worksheet.getCell(`A${row}`).font = { bold: true };
  worksheet.getCell(`B${row}`).value = value;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
}

function fmtNum(n) {
  return n != null ? parseFloat(n) : 0;
}

// ─── EXPORTAR PRODUCTOS POR ALMACÉN ──────────────────────────────────────────

async function exportProductsByWarehouse({ warehouseId, startDate, endDate }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SS_BACKEND';
  workbook.created = new Date();

  const where = {
    ...(warehouseId ? { id: BigInt(warehouseId) } : {}),
    isActive: true,
  };

  const warehouses = await prisma.warehouse.findMany({
    where,
    include: {
      warehouseStocks: {
        where: {
          product: {
            isActive: true,
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: endOfDay(endDate) }),
              },
            } : {}),
          },
        },
        include: {
          product: {
            include: {
              category: { select: { name: true } },
              unit: { select: { name: true, code: true } },
              creator: { select: { username: true, fullName: true } },
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const warehouse of warehouses) {
    const sheetName = warehouse.name.substring(0, 31).replace(/[\\/?*[\]:]/g, '_');
    const ws = workbook.addWorksheet(sheetName);

    const headers = ['SKU', 'Nombre', 'Categoría', 'Unidad', 'Marca', 'Precio Costo', 'Precio Venta', 'Stock Actual', 'Stock Mínimo', 'Publicado por', 'Fecha Creación'];
    addTitleRow(ws, `Inventario - ${warehouse.name}`, headers.length);

    ws.getCell('A2').value = 'Almacén:'; ws.getCell('A2').font = { bold: true };
    ws.getCell('B2').value = `${warehouse.code} - ${warehouse.name}`;
    ws.getCell('D2').value = 'Tipo:'; ws.getCell('D2').font = { bold: true };
    ws.getCell('E2').value = warehouse.type;
    ws.getCell('G2').value = 'Generado:'; ws.getCell('G2').font = { bold: true };
    ws.getCell('H2').value = fmtDate(new Date());
    ws.getRow(2).height = 18;

    const headerRow = ws.getRow(4);
    headerRow.height = 24;
    headers.forEach((h, i) => applyHeaderStyle(headerRow.getCell(i + 1)));
    headerRow.values = headers;

    warehouse.warehouseStocks.forEach((stock, idx) => {
      const p = stock.product;
      const row = ws.getRow(5 + idx);
      row.values = [
        p.sku, p.name,
        p.category?.name || '',
        p.unit?.code || '',
        p.brand || '',
        fmtNum(p.costPrice),
        fmtNum(p.salePrice),
        fmtNum(stock.quantity),
        fmtNum(stock.minStock),
        p.creator?.fullName || p.creator?.username || '',
        fmtDate(p.createdAt),
      ];
      if (idx % 2 === 0) {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9FF' } };
        });
      }
    });

    if (warehouse.warehouseStocks.length === 0) {
      ws.getCell('A5').value = 'Sin productos en este almacén';
      ws.getCell('A5').font = { italic: true, color: { argb: 'FF888888' } };
    }

    [12, 35, 18, 8, 12, 14, 14, 14, 14, 22, 20].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };
    ws.views = [{ state: 'frozen', ySplit: 4 }];
  }

  // Hoja resumen
  const summary = workbook.addWorksheet('RESUMEN');
  addTitleRow(summary, 'Resumen de Inventario por Almacén', 5);
  const sHeaders = ['Almacén', 'Tipo', 'Ubicación', 'Total Productos', 'Total Stock'];
  const sHeaderRow = summary.getRow(3);
  sHeaders.forEach((h, i) => applyHeaderStyle(sHeaderRow.getCell(i + 1)));
  sHeaderRow.values = sHeaders;
  sHeaderRow.height = 22;

  warehouses.forEach((w, i) => {
    const totalStock = w.warehouseStocks.reduce((s, ws) => s + fmtNum(ws.quantity), 0);
    summary.getRow(4 + i).values = [w.name, w.type, w.location || '', w.warehouseStocks.length, totalStock];
  });
  [30, 15, 25, 16, 16].forEach((w, i) => { summary.getColumn(i + 1).width = w; });

  return workbook;
}

// ─── EXPORTAR PRODUCTOS POR VENDEDOR/USUARIO ─────────────────────────────────

async function exportProductsBySeller({ userId, startDate, endDate }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SS_BACKEND';
  workbook.created = new Date();

  const userWhere = userId ? { id: BigInt(userId), isActive: true } : { isActive: true };
  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true, username: true, fullName: true,
      warehouse: { select: { name: true } },
      productsCreated: {
        where: {
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: endOfDay(endDate) }),
            },
          } : {}),
        },
        include: {
          category: { select: { name: true } },
          unit: { select: { name: true, code: true } },
          warehouseStocks: { include: { warehouse: { select: { name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  // Hoja resumen general
  const summary = workbook.addWorksheet('RESUMEN');
  addTitleRow(summary, 'Resumen de Productos Publicados por Usuario', 5);
  addInfoRow(summary, 'Período:', `${startDate || 'Inicio'} — ${endDate || 'Hoy'}`, 2);
  const sHeaders = ['Usuario', 'Nombre Completo', 'Almacén', 'Productos Publicados'];
  const sHeaderRow = summary.getRow(4);
  sHeaders.forEach((h, i) => applyHeaderStyle(sHeaderRow.getCell(i + 1)));
  sHeaderRow.values = sHeaders;
  sHeaderRow.height = 22;
  let summaryRow = 5;

  for (const user of users) {
    if (user.productsCreated.length === 0) continue;

    summary.getRow(summaryRow).values = [
      user.username, user.fullName || '', user.warehouse?.name || '', user.productsCreated.length,
    ];
    summaryRow++;

    const sheetName = (user.fullName || user.username).substring(0, 31).replace(/[\\/?*[\]:]/g, '_');
    const ws = workbook.addWorksheet(sheetName);
    addTitleRow(ws, `Productos publicados por: ${user.fullName || user.username}`, 10);
    addInfoRow(ws, 'Usuario:', user.username, 2);
    addInfoRow(ws, 'Almacén:', user.warehouse?.name || 'Sin almacén', 3);

    const headers = ['SKU', 'Nombre', 'Categoría', 'Unidad', 'Marca', 'Precio Costo', 'Precio Venta', 'Stock Global', 'Almacenes con Stock', 'Fecha Publicación'];
    const headerRow = ws.getRow(5);
    headerRow.height = 24;
    headerRow.values = headers;
    headers.forEach((_, i) => applyHeaderStyle(headerRow.getCell(i + 1)));

    user.productsCreated.forEach((p, idx) => {
      const totalStock = p.warehouseStocks.reduce((s, ws) => s + fmtNum(ws.quantity), 0);
      const warehouseNames = p.warehouseStocks.map(ws => ws.warehouse.name).join(', ');
      const row = ws.getRow(6 + idx);
      row.values = [
        p.sku, p.name, p.category?.name || '', p.unit?.code || '', p.brand || '',
        fmtNum(p.costPrice), fmtNum(p.salePrice), totalStock, warehouseNames, fmtDate(p.createdAt),
      ];
      if (idx % 2 === 0) {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2FFF2' } };
        });
      }
    });

    [12, 35, 18, 8, 12, 14, 14, 12, 35, 20].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: headers.length } };
    ws.views = [{ state: 'frozen', ySplit: 5 }];
  }

  [20, 30, 25, 18].forEach((w, i) => { summary.getColumn(i + 1).width = w; });
  return workbook;
}

// ─── EXPORTAR ACTIVIDAD DE PRODUCTOS (ALTAS Y BAJAS) ─────────────────────────

async function exportProductActivity({ startDate, endDate, warehouseId, userId }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SS_BACKEND';
  workbook.created = new Date();

  const dateGte = startDate ? new Date(startDate) : undefined;
  const dateLte = endDate ? endOfDay(endDate) : undefined;

  const baseWhere = {
    ...(warehouseId ? { warehouseStocks: { some: { warehouseId: BigInt(warehouseId) } } } : {}),
  };

  const productSelect = {
    id: true, sku: true, name: true, brand: true, isActive: true,
    createdAt: true, deletedAt: true,
    category: { select: { name: true } },
    unit: { select: { name: true, code: true } },
    creator: { select: { id: true, username: true, fullName: true } },
    deleter: { select: { id: true, username: true, fullName: true } },
    warehouseStocks: { include: { warehouse: { select: { name: true, code: true } } } },
  };

  const createdProducts = await prisma.product.findMany({
    where: {
      ...baseWhere,
      ...(userId && { createdBy: BigInt(userId) }),
      ...(dateGte || dateLte ? { createdAt: { ...(dateGte && { gte: dateGte }), ...(dateLte && { lte: dateLte }) } } : {}),
    },
    select: productSelect,
    orderBy: { createdAt: 'desc' },
  });

  const deletedProducts = await prisma.product.findMany({
    where: {
      ...baseWhere,
      isActive: false,
      deletedAt: { not: null },
      ...(userId && { deletedBy: BigInt(userId) }),
      ...(dateGte || dateLte ? { deletedAt: { ...(dateGte && { gte: dateGte }), ...(dateLte && { lte: dateLte }) } } : {}),
    },
    select: productSelect,
    orderBy: { deletedAt: 'desc' },
  });

  // Hoja: Productos Publicados
  const wsCreated = workbook.addWorksheet('Productos Publicados');
  addTitleRow(wsCreated, 'Productos Publicados (Altas)', 8);
  addInfoRow(wsCreated, 'Período:', `${startDate || 'Inicio'} — ${endDate || 'Hoy'}`, 2);
  addInfoRow(wsCreated, 'Generado:', fmtDate(new Date()), 3);

  const createdHeaders = ['SKU', 'Nombre', 'Categoría', 'Marca', 'Publicado por', 'Almacenes', 'Fecha Publicación', 'Estado'];
  const createdHeaderRow = wsCreated.getRow(5);
  createdHeaderRow.height = 24;
  createdHeaderRow.values = createdHeaders;
  createdHeaders.forEach((_, i) => applyHeaderStyle(createdHeaderRow.getCell(i + 1)));

  createdProducts.forEach((p, idx) => {
    const warehouseNames = p.warehouseStocks.map(ws => ws.warehouse.name).join(', ');
    const row = wsCreated.getRow(6 + idx);
    row.values = [
      p.sku, p.name, p.category?.name || '', p.brand || '',
      p.creator?.fullName || p.creator?.username || 'N/D',
      warehouseNames || 'Sin stock asignado',
      fmtDate(p.createdAt),
      p.isActive ? 'Activo' : 'Eliminado',
    ];
    if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2FFF2' } };
      });
    }
  });

  if (createdProducts.length === 0) {
    wsCreated.getCell('A6').value = 'Sin registros en el período seleccionado';
    wsCreated.getCell('A6').font = { italic: true, color: { argb: 'FF888888' } };
  }

  [12, 35, 18, 14, 22, 40, 20, 10].forEach((w, i) => { wsCreated.getColumn(i + 1).width = w; });
  wsCreated.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: createdHeaders.length } };
  wsCreated.views = [{ state: 'frozen', ySplit: 5 }];

  // Hoja: Productos Eliminados
  const wsDeleted = workbook.addWorksheet('Productos Eliminados');
  addTitleRow(wsDeleted, 'Productos Eliminados (Bajas)', 8);
  addInfoRow(wsDeleted, 'Período:', `${startDate || 'Inicio'} — ${endDate || 'Hoy'}`, 2);
  addInfoRow(wsDeleted, 'Generado:', fmtDate(new Date()), 3);

  const deletedHeaders = ['SKU', 'Nombre', 'Categoría', 'Marca', 'Publicado por', 'Eliminado por', 'Fecha Publicación', 'Fecha Eliminación'];
  const deletedHeaderRow = wsDeleted.getRow(5);
  deletedHeaderRow.height = 24;
  deletedHeaderRow.values = deletedHeaders;
  deletedHeaders.forEach((_, i) => applyHeaderStyle(deletedHeaderRow.getCell(i + 1)));

  deletedProducts.forEach((p, idx) => {
    const row = wsDeleted.getRow(6 + idx);
    row.values = [
      p.sku, p.name, p.category?.name || '', p.brand || '',
      p.creator?.fullName || p.creator?.username || 'N/D',
      p.deleter?.fullName || p.deleter?.username || 'N/D',
      fmtDate(p.createdAt),
      fmtDate(p.deletedAt),
    ];
    if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2F2' } };
      });
    }
  });

  if (deletedProducts.length === 0) {
    wsDeleted.getCell('A6').value = 'Sin registros en el período seleccionado';
    wsDeleted.getCell('A6').font = { italic: true, color: { argb: 'FF888888' } };
  }

  [12, 35, 18, 14, 22, 22, 20, 20].forEach((w, i) => { wsDeleted.getColumn(i + 1).width = w; });
  wsDeleted.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: deletedHeaders.length } };
  wsDeleted.views = [{ state: 'frozen', ySplit: 5 }];

  // Hoja resumen
  const wsSummary = workbook.addWorksheet('RESUMEN');
  addTitleRow(wsSummary, 'Resumen de Actividad de Productos', 2);
  wsSummary.getRow(3).values = ['Métrica', 'Valor'];
  applyHeaderStyle(wsSummary.getCell('A3'));
  applyHeaderStyle(wsSummary.getCell('B3'));
  [
    ['Total productos publicados', createdProducts.length],
    ['Total productos eliminados', deletedProducts.length],
    ['Período desde', startDate || 'Sin filtro'],
    ['Período hasta', endDate || 'Sin filtro'],
    ['Generado el', fmtDate(new Date())],
  ].forEach(([label, value], i) => {
    wsSummary.getRow(4 + i).values = [label, value];
  });
  [35, 30].forEach((w, i) => { wsSummary.getColumn(i + 1).width = w; });

  return workbook;
}

// ─── EXPORTAR PRODUCTOS GENERAL ───────────────────────────────────────────────

async function exportProductsGeneral({ startDate, endDate, includeInactive = false }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SS_BACKEND';
  workbook.created = new Date();

  const where = {
    ...(!includeInactive ? { isActive: true } : {}),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: endOfDay(endDate) }),
      },
    } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true } },
      unit: { select: { name: true, code: true } },
      creator: { select: { username: true, fullName: true } },
      deleter: { select: { username: true, fullName: true } },
      warehouseStocks: {
        include: { warehouse: { select: { name: true, code: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const ws = workbook.addWorksheet('Todos los Productos');
  const headers = [
    'SKU', 'Nombre', 'Descripción', 'Categoría', 'Unidad', 'Marca', 'Origen',
    'Precio Costo', 'Precio Venta', 'Stock Total', 'Stock Mínimo Global',
    'Almacenes', 'Estado', 'Publicado por', 'Eliminado por',
    'Fecha Publicación', 'Fecha Eliminación',
  ];

  addTitleRow(ws, 'Reporte General de Productos', headers.length);
  addInfoRow(ws, 'Período:', `${startDate || 'Inicio'} — ${endDate || 'Hoy'}`, 2);
  addInfoRow(ws, 'Generado:', fmtDate(new Date()), 3);

  const headerRow = ws.getRow(5);
  headerRow.height = 24;
  headerRow.values = headers;
  headers.forEach((_, i) => applyHeaderStyle(headerRow.getCell(i + 1)));

  products.forEach((p, idx) => {
    const totalStock = p.warehouseStocks.reduce((s, ws) => s + fmtNum(ws.quantity), 0);
    const warehouseNames = p.warehouseStocks.map(ws => `${ws.warehouse.code}: ${fmtNum(ws.quantity)}`).join(' | ');
    const row = ws.getRow(6 + idx);
    row.values = [
      p.sku, p.name, p.description || '', p.category?.name || '',
      p.unit?.code || '', p.brand || '', p.origin || '',
      fmtNum(p.costPrice), fmtNum(p.salePrice),
      totalStock, fmtNum(p.minStockGlobal),
      warehouseNames || 'Sin stock',
      p.isActive ? 'Activo' : 'Eliminado',
      p.creator?.fullName || p.creator?.username || '',
      p.deleter?.fullName || p.deleter?.username || '',
      fmtDate(p.createdAt), p.deletedAt ? fmtDate(p.deletedAt) : '',
    ];
    if (!p.isActive) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = { color: { argb: 'FF999999' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    } else if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9FF' } };
      });
    }
  });

  [12, 35, 30, 18, 8, 12, 12, 14, 14, 12, 14, 45, 10, 22, 22, 20, 20].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: headers.length } };
  ws.views = [{ state: 'frozen', ySplit: 5 }];

  return workbook;
}

module.exports = {
  importProductsFromExcel,
  updateStockFromExcel,
  generateProductsTemplate,
  generateStockTemplate,
  exportProductsByWarehouse,
  exportProductsBySeller,
  exportProductActivity,
  exportProductsGeneral,
};
