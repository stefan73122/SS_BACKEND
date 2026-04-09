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

  // Título principal (fila 1)
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['LISTA CONSOLIDADA DE PRODUCTOS PARA IMPORTACIÓN']
  ], { origin: 'A1' });

  // Merge del título
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  // Estilo del título
  worksheet['A1'].s = {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'E7E6E6' } },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  };

  // Encabezados (fila 3)
  const headers = ['NOMBRE', 'SKU', 'DESCRIPCION', 'PRECIO_COSTO', 'PRECIO_VENTA', 'STOCK_MIN', 'CATEGORIA', 'UNIDAD'];
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A3' });

  // Estilo para encabezados con bordes
  const headerStyle = {
    font: { bold: true, color: { rgb: '0000FF' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  };

  // Aplicar estilo a encabezados
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3'].forEach(cell => {
    if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
    worksheet[cell].s = headerStyle;
  });

  // Datos de ejemplo con bordes
  const exampleData = [
    ['Cable UTP Cat6', 'CAB-UTP-CAT6', 'Cable de red categoría 6', 5000, 8000, 50, 1, 'Pieza'],
    ['Switch 24 puertos', 'SW-24P', 'Switch Gigabit 24 puertos', 150000, 200000, 5, 1, 'Caja'],
    ['Router WiFi', 'RTR-WIFI-01', 'Router inalámbrico dual band', 80000, 120000, 10, 1, 'Pieza']
  ];

  XLSX.utils.sheet_add_aoa(worksheet, exampleData, { origin: 'A4' });

  // Estilo para celdas de datos con bordes
  const dataStyle = {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D3D3D3' } },
      bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
      left: { style: 'thin', color: { rgb: 'D3D3D3' } },
      right: { style: 'thin', color: { rgb: 'D3D3D3' } }
    }
  };

  // Aplicar bordes a las celdas de datos
  for (let row = 4; row <= 6; row++) {
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = col + row;
      if (!worksheet[cell]) worksheet[cell] = { t: 's', v: '' };
      worksheet[cell].s = dataStyle;
    });
  }

  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 25 }, // NOMBRE
    { wch: 18 }, // SKU
    { wch: 35 }, // DESCRIPCION
    { wch: 15 }, // PRECIO_COSTO
    { wch: 15 }, // PRECIO_VENTA
    { wch: 12 }, // STOCK_MIN
    { wch: 12 }, // CATEGORIA
    { wch: 12 }, // UNIDAD
  ];

  // Configurar altura de filas
  worksheet['!rows'] = [
    { hpt: 25 }, // Título
    { hpt: 15 }, // Espacio
    { hpt: 30 }, // Encabezados
  ];

  // Habilitar autofiltro en los encabezados
  worksheet['!autofilter'] = { ref: 'A3:H3' };

  // Agregar instrucciones en una hoja separada
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['INSTRUCCIONES PARA IMPORTAR PRODUCTOS'],
    [''],
    ['CAMPOS OBLIGATORIOS:'],
    ['• NOMBRE: Nombre del producto'],
    ['• SKU: Código único del producto (no puede repetirse)'],
    [''],
    ['CAMPOS OPCIONALES:'],
    ['• DESCRIPCION: Descripción detallada del producto'],
    ['• PRECIO_COSTO: Precio de costo en BOB (sin decimales)'],
    ['• PRECIO_VENTA: Precio de venta en BOB (sin decimales)'],
    ['• STOCK_MIN: Stock mínimo para alertas (número entero)'],
    ['• CATEGORIA: ID de la categoría (consultar con /api/categories)'],
    ['• UNIDAD: Nombre de la unidad (Pieza, Caja, Metro, Litro, Kilogramo, etc.)'],
    [''],
    ['NOTAS IMPORTANTES:'],
    ['• No modifique los nombres de los encabezados'],
    ['• Puede agregar tantas filas como productos necesite'],
    ['• Los campos vacíos se llenarán con valores por defecto'],
    ['• Guarde el archivo en formato .xlsx antes de importar'],
  ]);

  instructionsSheet['!cols'] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

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
