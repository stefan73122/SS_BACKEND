const ExcelJS = require('exceljs');
const prisma = require('../prisma/client');
const exchangeRateService = require('./exchangeRate.service');

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

/**
 * Detecta automáticamente en qué fila están los encabezados del Excel.
 * Busca una fila que contenga al menos NOMBRE o SKU/CODIGO.
 * Retorna el número de fila (1-based) donde están los encabezados.
 */
function detectHeaderRow(worksheet) {
  // 'DESCRIPCIÓN' se incluye porque la UI ahora presenta el campo "nombre" del
  // producto con esa etiqueta; el parser sigue aceptando 'NOMBRE' igual que antes.
  const keyColumns = new Set(['NOMBRE', 'nombre', 'DESCRIPCIÓN', 'descripción', 'SKU', 'sku', 'CODIGO', 'codigo', 'NAME', 'name']);
  for (let rowIndex = 1; rowIndex <= 10; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    let hasKey = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (keyColumns.has(String(getCellValue(cell) || '').trim())) hasKey = true;
    });
    if (hasKey) {
      console.log(`[Excel] Encabezados detectados en fila ${rowIndex}`);
      return rowIndex;
    }
  }
  console.warn('[Excel] No se detectaron encabezados, usando fila 1 por defecto');
  return 1;
}

function worksheetToJson(worksheet, headerRowIndex) {
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

/**
 * Previsualizar importación de productos desde Excel
 * Analiza el archivo y detecta categorías nuevas que se crearán
 */
async function previewImportFromClientExcel(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const headerRange = detectHeaderRow(worksheet);
    const data = worksheetToJson(worksheet, headerRange);

    console.log(`[Preview] Formato detectado: encabezados en fila ${headerRange}, ${data.length} filas de datos`);

    const preview = {
      totalProducts: data.length,
      categories: {
        existing: [],
        new: [],
      },
      products: [],
    };

    // Obtener todas las categorías existentes
    const existingCategories = await prisma.productCategory.findMany({
      select: { id: true, name: true },
    });

    const existingCategoryNames = new Set(
      existingCategories.map(c => c.name.toLowerCase())
    );

    // Analizar productos y categorías
    const categoriesInExcel = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const grupo = row.CATEGORIA || row.categoria || row.GRUPO || row.grupo;
      const nombre = row.NOMBRE || row.nombre || row['DESCRIPCIÓN'] || row['descripción'];
      const codigo = row.SKU || row.sku || row.CODIGO || row.codigo;

      // Debug primera fila
      if (i === 0) {
        console.log('=== PRIMERA FILA PROCESADA ===');
        console.log('grupo:', grupo);
        console.log('nombre:', nombre);
        console.log('codigo:', codigo);
        console.log('==============================');
      }

      if (nombre && codigo) {
        preview.products.push({
          row: i + 7, // +7 porque fila 6 son encabezados, datos desde fila 7
          sku: codigo.toString(),
          name: nombre,
          category: grupo || 'Sin categoría',
        });

        if (grupo) {
          categoriesInExcel.add(grupo);
        }
      }
    }

    // Clasificar categorías
    categoriesInExcel.forEach(categoryName => {
      if (existingCategoryNames.has(categoryName.toLowerCase())) {
        const existing = existingCategories.find(
          c => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        preview.categories.existing.push({
          id: existing.id.toString(),
          name: existing.name,
        });
      } else {
        preview.categories.new.push({
          name: categoryName,
          willBeCreated: true,
        });
      }
    });

    console.log('=== PREVIEW RESPONSE ===');
    console.log('Total products:', preview.products.length);
    console.log('First 3 products:', JSON.stringify(preview.products.slice(0, 3), null, 2));
    console.log('Categories new:', JSON.stringify(preview.categories.new, null, 2));
    console.log('Categories existing:', JSON.stringify(preview.categories.existing, null, 2));
    console.log('=======================');

    return preview;
  } catch (error) {
    throw new Error(`Error al previsualizar archivo Excel: ${error.message}`);
  }
}

/**
 * Importar productos desde Excel del cliente
 * Mapeo de columnas:
 * - CODIGO SS → código interno del sistema
 * - CODIGO FABRICANTE → manufacturerCode
 * - CODIGO → sku
 * - NOMBRE → name
 * - PRECIO DE COMPRA → costPrice (en USD)
 * - PRECIO DE VENTA → salePrice (en USD)
 * - CANTIDAD → stock inicial
 * - MARCA → brand (campo de texto)
 * - PROVEEDOR → supplier (buscar o crear)
 * - GRUPO → category (buscar o crear)
 * - ALMACEN → warehouse (asignar stock)
 * - UND → unit (unidad de medida)
 * - OBSERVACIONES → description
 * 
 * @param {string} filePath - Ruta del archivo Excel
 * @param {string} userId - ID del usuario que realiza la importación
 * @param {string} warehouseId - ID del almacén de destino (obligatorio)
 * @param {object} categoryMappings - Mapeo de categorías del Excel a categorías del sistema
 *                                    Formato: { "categoriaExcel": "categoriaIdSistema" }
 */
async function importProductsFromClientExcel(filePath, userId, warehouseId, categoryMappings = {}) {
  // Verificar conexión a la base de datos antes de empezar
  try {
    await prisma.$connect();
    console.log('[Excel Import] Conexión a base de datos establecida');
  } catch (error) {
    console.error('[Excel Import] Error conectando a base de datos:', error);
    throw new Error('No se pudo conectar a la base de datos. Intenta de nuevo.');
  }

  // Si no viene userId, buscar un admin como fallback
  if (!userId) {
    const adminUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: { contains: 'admin', mode: 'insensitive' } } } } },
      select: { id: true },
    });
    if (adminUser) userId = adminUser.id;
  }
  console.log(`[Excel Import] userId resuelto: ${userId}`);
  console.log(`[Excel Import] warehouseId recibido: ${warehouseId}`);
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const headerRange = detectHeaderRow(worksheet);
    const data = worksheetToJson(worksheet, headerRange);
    console.log(`[Import] Formato detectado: encabezados en fila ${headerRange}, ${data.length} filas de datos`);

    const results = {
      success: [],
      errors: [],
      total: data.length,
      created: 0,
      updated: 0,
    };

    // Debug: ver nombres de columnas del primer registro
    if (data.length > 0) {
      console.log('=== DEBUG IMPORTACIÓN ===');
      console.log('Total de filas:', data.length);
      console.log('Columnas detectadas:', Object.keys(data[0]));
      console.log('Primer registro completo:', JSON.stringify(data[0], null, 2));
      console.log('========================');
    }

    // ── FASE 1: normalizar y validar TODAS las filas antes de tocar la base de datos.
    // Nada se inserta todavía: acá solo se detectan filas incompletas y SKUs
    // repetidos dentro del propio archivo.
    const parsedRows = [];
    const skuFirstSeenAt = new Map(); // sku -> fila donde apareció por primera vez en el archivo

    for (let i = 0; i < data.length; i++) {
      // Normalizar claves del row: recortar espacios y convertir a mayúsculas
      const rawRow = data[i];
      const row = {};
      Object.keys(rawRow).forEach(key => {
        row[key.trim().toUpperCase()] = rawRow[key];
      });
      const rowNumber = i + headerRange + 2; // encabezados en fila (headerRange+1), datos desde fila siguiente

      // Mapear usando nombres de columnas del Excel (ya normalizadas a mayúsculas)
      const codigoSS = row['CODIGO SS'] || row['CODIGO_SS'];
      const codigoFabricante = row['CODIGO FABRICANTE'] || row['CODIGO_FABRICANTE'] || row.CODIGO_FABRICANTE;
      const codigo = row.SKU || row.sku || row.CODIGO || row.codigo;
      // 'DESCRIPCIÓN' (con tilde) se acepta como sinónimo de NOMBRE porque la UI
      // ahora llama "Descripción" al nombre del producto; no colisiona con la
      // columna 'DESCRIPCION' (sin tilde) de más abajo, que sigue siendo el detalle.
      const nombre = row.NOMBRE || row.nombre || row['DESCRIPCIÓN'] || row['descripción'];
      const proveedor = row.PROVEEDOR || row.proveedor;
      const grupo = row.CATEGORIA || row.categoria || row.GRUPO || row.grupo;
      const marca = row.MARCA || row.marca;
      const procedencia = row.PROCEDENCIA || row.procedencia;
      const und = row.UNIDAD || row.unidad || row.UND || row.und;
      const almacen = row.ALMACEN || row.almacen;
      const observaciones = row.DESCRIPCION || row.descripcion || row.OBSERVACIONES || row.observaciones || row.DETALLE || row.detalle;
      const precioCompra = row.PRECIO_COSTO || row['\tPRECIO_COSTO'] || row['PRECIO DE COMPRA'] || row['PRECIO_DE_COMPRA'] || row.PRECIO_DE_COMPRA;
      const cantidad = row.CANTIDAD || row.cantidad
        || row.STOCK || row.stock
        || row['STOCK INICIAL'] || row['STOCK_INICIAL']
        || row['STOCK TOTAL'] || row['STOCK_TOTAL']
        || row['CANTIDAD INICIAL'] || row['CANTIDAD_INICIAL']
        || row.QTY || row.qty;
      const precioVenta = row.PRECIO_VENTA || row['\tPRECIO_VENTA'] || row['PRECIO DE VENTA'] || row['PRECIO_DE_VENTA'] || row.PRECIO_DE_VENTA;
      const stockMinimo =
        row.STOCK_MIN ?? row.stock_min ??
        row.STOCK_MINIMO ?? row.stock_minimo ??
        row['STOCK MIN'] ?? row['STOCK MINIMO'] ??
        row['STOCK MÍNIMO'] ?? row['STOCK_MÍNIMO'] ??
        row.MIN_STOCK ?? row.min_stock ?? null;

      // Debug de la primera fila
      if (i === 0) {
        console.log('=== DATOS PRIMERA FILA ===');
        console.log('codigo:', codigo);
        console.log('nombre:', nombre);
        console.log('proveedor:', proveedor);
        console.log('grupo:', grupo);
        console.log('marca:', marca);
        console.log('procedencia:', procedencia);
        console.log('und:', und);
        console.log('almacen:', almacen);
        console.log('precioCompra:', precioCompra);
        console.log('precioVenta:', precioVenta);
        console.log('cantidad:', cantidad);
        console.log('codigoFabricante:', codigoFabricante);
        console.log('codigoSS:', codigoSS);
        console.log('========================');
      }

      // Validar campos requeridos
      if (!nombre || !codigo) {
        results.errors.push({
          row: rowNumber,
          error: `Campos requeridos faltantes: ${!nombre ? 'NOMBRE' : ''} ${!codigo ? 'CODIGO' : ''}`.trim(),
          data: { codigo, nombre, proveedor, grupo },
        });
        continue;
      }

      const sku = codigo.toString().trim();

      // SKU duplicado dentro de la misma planilla: se omite la repetición, se conserva la primera aparición
      if (skuFirstSeenAt.has(sku)) {
        results.errors.push({
          row: rowNumber,
          error: `SKU "${sku}" duplicado en la planilla (ya aparece en la fila ${skuFirstSeenAt.get(sku)}). No se importó.`,
          data: { sku, nombre },
        });
        continue;
      }
      skuFirstSeenAt.set(sku, rowNumber);

      parsedRows.push({
        rowNumber, sku, nombre, proveedor, grupo, marca, procedencia, und, almacen,
        observaciones, precioCompra, cantidad, precioVenta, stockMinimo, codigoFabricante,
      });
    }

    // ── FASE 2: rechazar filas cuyo SKU ya existe en la base de datos, igual que el
    // alta manual de productos: no se inserta ni se modifica el producto existente.
    let rowsToImport = parsedRows;
    if (parsedRows.length > 0) {
      const existingProducts = await prisma.product.findMany({
        where: { sku: { in: parsedRows.map(r => r.sku) } },
        select: { sku: true },
      });
      const existingSkuSet = new Set(existingProducts.map(p => p.sku));

      rowsToImport = [];
      for (const r of parsedRows) {
        if (existingSkuSet.has(r.sku)) {
          results.errors.push({
            row: r.rowNumber,
            error: `Ya existe un producto con el SKU "${r.sku}". No se importó ni se modificó el registro existente.`,
            data: { sku: r.sku, nombre: r.nombre },
          });
          continue;
        }
        rowsToImport.push(r);
      }
    }

    if (rowsToImport.length === 0) {
      return results;
    }

    // TC vigente al momento de la importación: se guarda como referencia
    // histórica en cada producto (los precios de compra/venta se ingresan en USD).
    const currentRate = await exchangeRateService.getCurrentRateOrNull();
    const referenceExchangeRate = currentRate?.rate ?? null;

    // ── FASE 3: insertar todas las filas ya validadas dentro de una única transacción,
    // para que un error a mitad de camino no deje productos importados a medias.
    await prisma.$transaction(async (tx) => {
      for (const r of rowsToImport) {
        const {
          rowNumber, sku, nombre, proveedor, grupo, marca, procedencia, und, almacen,
          observaciones, precioCompra, cantidad, precioVenta, stockMinimo, codigoFabricante,
        } = r;

        try {
          // Buscar o crear categoría (GRUPO)
          let categoryId = null;
          if (grupo) {
            // Verificar si hay un mapeo personalizado para esta categoría
            if (categoryMappings[grupo]) {
              // Validar que la categoría del mapping realmente exista
              const mappedCategory = await tx.productCategory.findUnique({
                where: { id: BigInt(categoryMappings[grupo]) },
              });
              if (mappedCategory) {
                categoryId = mappedCategory.id;
              } else {
                console.warn(`[Excel Import] Categoría mapeada ID ${categoryMappings[grupo]} no existe, buscando por nombre`);
              }
            }
            if (!categoryId) {
              // Buscar categoría existente
              let category = await tx.productCategory.findFirst({
                where: { name: { equals: grupo, mode: 'insensitive' } },
              });

              // Solo crear si no existe
              if (!category) {
                console.log(`[Excel Import] Creando categoría: ${grupo}`);
                category = await tx.productCategory.create({ data: { name: grupo } });
                console.log(`[Excel Import] Categoría creada: ${grupo} (ID: ${category.id})`);
              }
              categoryId = category.id;
            }
          }

          // Buscar o crear unidad (UND)
          let unitId = null;
          if (und) {
            let unit = await tx.unit.findFirst({
              where: { code: { equals: und, mode: 'insensitive' } },
            });

            if (!unit) {
              unit = await tx.unit.create({ data: { code: und, name: und } });
            }
            unitId = unit.id;
          }

          // Buscar o crear proveedor (PROVEEDOR)
          let supplierId = null;
          if (proveedor) {
            let supplier = await tx.supplier.findFirst({
              where: { name: { equals: proveedor, mode: 'insensitive' } },
            });

            if (!supplier) {
              supplier = await tx.supplier.create({ data: { name: proveedor, isActive: true } });
            }
            supplierId = supplier.id;
          }

          // Preparar datos del producto
          const productData = {
            sku,
            name: nombre,
            description: observaciones || null,
            costPrice: precioCompra ? parseFloat(precioCompra) : null,
            salePrice: precioVenta ? parseFloat(precioVenta) : null,
            ...((precioCompra || precioVenta) && referenceExchangeRate != null ? { referenceExchangeRate } : {}),
            brand: marca || null,
            origin: procedencia || null,
            manufacturerCode: codigoFabricante || null,
            minStockGlobal: (stockMinimo !== null && stockMinimo !== undefined && !isNaN(parseFloat(stockMinimo)))
              ? parseFloat(stockMinimo)
              : 20,
            ...(categoryId && { categoryId }),
            ...(unitId && { unitId }),
            ...(supplierId && { supplierId }),
            ...(userId ? { createdBy: BigInt(userId) } : {}),
          };

          // El SKU ya fue validado en la FASE 2: siempre es una creación, nunca un upsert.
          const product = await tx.product.create({ data: productData });
          results.created++;

          // Resolver almacén: usar parámetro warehouseId (validando que exista) o buscar por nombre en columna ALMACEN
          let resolvedWarehouseId = null;
          let resolvedWarehouseName = null;

          if (warehouseId) {
            const warehouseCheck = await tx.warehouse.findUnique({ where: { id: BigInt(warehouseId) } });
            if (warehouseCheck) {
              resolvedWarehouseId = warehouseId;
              resolvedWarehouseName = warehouseCheck.name;
            } else {
              console.warn(`[Excel Import] warehouseId ${warehouseId} no existe en BD, buscando por columna ALMACEN`);
            }
          }

          let warehouseResolveError = null;
          if (!resolvedWarehouseId && almacen) {
            let warehouseByName = await tx.warehouse.findFirst({
              where: { name: { equals: almacen.trim(), mode: 'insensitive' } },
            });
            if (!warehouseByName) {
              // Generar código único a partir del nombre (ej: "LA PAZ" → "LA_PAZ")
              const generatedCode = almacen.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 20);
              const codeExists = await tx.warehouse.findUnique({ where: { code: generatedCode } });
              if (codeExists) {
                console.warn(`[Excel Import] Código "${generatedCode}" ya existe con otro nombre`);
                warehouseResolveError = `Almacén "${almacen}" no encontrado y el código "${generatedCode}" ya está en uso. Crea el almacén manualmente.`;
              } else {
                console.log(`[Excel Import] Almacén "${almacen}" no existe, creándolo automáticamente`);
                warehouseByName = await tx.warehouse.create({
                  data: { name: almacen.trim(), code: generatedCode },
                });
              }
            }
            if (warehouseByName) {
              resolvedWarehouseId = warehouseByName.id.toString();
              resolvedWarehouseName = warehouseByName.name;
              console.log(`[Excel Import] Almacén "${almacen}": ID ${resolvedWarehouseId}`);
            }
          }

          let stockSaved = false;
          let stockQty = 0;
          let stockWarning = null;

          if (resolvedWarehouseId) {
            const quantityValue = cantidad ? parseFloat(cantidad) : 0;

            if (!isNaN(quantityValue) && quantityValue >= 0) {
              const warehouseBigIntId = BigInt(resolvedWarehouseId);
              const finalQty = Math.floor(quantityValue);

              // Producto recién creado: nunca puede haber stock previo para este productId+warehouseId
              await tx.warehouseStock.create({
                data: { productId: product.id, warehouseId: warehouseBigIntId, quantity: finalQty },
              });

              stockSaved = true;
              stockQty = finalQty;

              if (finalQty > 0) {
                try {
                  await tx.inventoryMovement.create({
                    data: {
                      type: 'INGRESO',
                      reason: 'COMPRA',
                      note: 'Importación Excel - Producto nuevo',
                      createdBy: BigInt(userId),
                      warehouseToId: warehouseBigIntId,
                      items: { create: { productId: product.id, quantity: finalQty } },
                    },
                  });
                } catch (movError) {
                  console.error(`[Excel Import] Error movimiento ${product.sku}:`, movError.message);
                }
              }
            } else {
              stockWarning = `Cantidad inválida: "${cantidad}"`;
            }
          } else {
            stockWarning = warehouseResolveError
              || (almacen ? `Almacén "${almacen}" no encontrado` : 'No se especificó almacén');
          }

          results.success.push({
            row: rowNumber,
            action: 'created',
            productId: product.id.toString(),
            sku: product.sku,
            name: product.name,
            stockSaved,
            stockQty,
            warehouse: resolvedWarehouseName || almacen || null,
            ...(stockWarning && { stockWarning }),
          });
        } catch (error) {
          // Un error real de base de datos en cualquier fila revierte TODA la importación:
          // no queremos dejar algunos productos importados y otros no por un fallo a mitad de camino.
          throw new Error(`Fila ${rowNumber} (SKU "${sku}"): ${error.message}`);
        }
      }
    }, { timeout: 300000, maxWait: 15000 });

    return results;
  } catch (error) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

module.exports = {
  previewImportFromClientExcel,
  importProductsFromClientExcel,
};
