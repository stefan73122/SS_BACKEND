const XLSX = require('xlsx');
const prisma = require('../prisma/client');

/**
 * Importar productos desde Excel del cliente
 * Mapeo de columnas:
 * - CODIGO SS → código interno del sistema
 * - CODIGO FABRICANTE → manufacturerCode
 * - CODIGO → sku
 * - NOMBRE → name
 * - PRECIO DE COMPRA → costPrice
 * - PRECIO DE VENTA → salePrice
 * - CANTIDAD → stock inicial
 * - MARCA → brand (campo de texto)
 * - PROVEEDOR → supplier (buscar o crear)
 * - GRUPO → category (buscar o crear)
 * - ALMACEN → warehouse (asignar stock)
 * - UND → unit (unidad de medida)
 * - OBSERVACIONES → description
 */
async function importProductsFromClientExcel(filePath, userId) {
  // Si no viene userId, buscar un admin como fallback
  if (!userId) {
    const adminUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: { contains: 'admin', mode: 'insensitive' } } } } },
      select: { id: true },
    });
    if (adminUser) userId = adminUser.id;
  }
  console.log(`[Excel Import] userId resuelto: ${userId}`);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer desde la fila 4 (índice 3) saltando: título, fila vacía/subtítulo y encabezados
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 3 });

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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      try {
        // Mapear directamente por índices __EMPTY según la estructura del Excel
        // Basado en el debug: __EMPTY_2 = CODIGO, __EMPTY_3 = NOMBRE, etc.
        const codigoSS = row.__EMPTY;
        const codigoFabricante = row.__EMPTY_1;
        const codigo = row.__EMPTY_2;
        const nombre = row.__EMPTY_3;
        const proveedor = row.__EMPTY_4;
        const grupo = row.__EMPTY_5;
        const marca = row.__EMPTY_6;
        const procedencia = row.__EMPTY_7;
        const und = row.__EMPTY_8;
        const almacen = row.__EMPTY_9;
        const observaciones = row.__EMPTY_10;
        const precioCompra = row.__EMPTY_11;
        const cantidad = row.__EMPTY_12;
        const precioVenta = row.__EMPTY_13;

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
          console.log('========================');
        }

        // Validar campos requeridos
        if (!nombre || !codigo) {
          results.errors.push({
            row: rowNumber,
            error: `Campos requeridos faltantes: ${!nombre ? 'NOMBRE' : ''} ${!codigo ? 'CODIGO' : ''}`,
            data: { codigo, nombre, proveedor, grupo },
          });
          continue;
        }

        // Buscar o crear categoría (GRUPO)
        let categoryId = null;
        if (grupo) {
          let category = await prisma.productCategory.findFirst({
            where: { name: { equals: grupo, mode: 'insensitive' } },
          });

          if (!category) {
            category = await prisma.productCategory.create({
              data: { name: grupo },
            });
          }
          categoryId = category.id;
        }

        // Buscar o crear unidad (UND)
        let unitId = null;
        if (und) {
          let unit = await prisma.unit.findFirst({
            where: { code: { equals: und, mode: 'insensitive' } },
          });

          if (!unit) {
            unit = await prisma.unit.create({
              data: {
                code: und,
                name: und,
              },
            });
          }
          unitId = unit.id;
        }

        // Buscar o crear proveedor (PROVEEDOR)
        let supplierId = null;
        if (proveedor) {
          let supplier = await prisma.supplier.findFirst({
            where: { name: { equals: proveedor, mode: 'insensitive' } },
          });

          if (!supplier) {
            supplier = await prisma.supplier.create({
              data: {
                name: proveedor,
                isActive: true,
              },
            });
          }
          supplierId = supplier.id;
        }

        // Preparar datos del producto
        const productData = {
          sku: codigo.toString(),
          name: nombre,
          description: observaciones || null,
          costPrice: precioCompra ? parseFloat(precioCompra) : null,
          salePrice: precioVenta ? parseFloat(precioVenta) : null,
          brand: marca || null,
          origin: procedencia || null,
          manufacturerCode: codigoFabricante || null,
          ...(categoryId && { categoryId }),
          ...(unitId && { unitId }),
          ...(supplierId && { supplierId }),
        };

        // Verificar si el producto ya existe
        const existingProduct = await prisma.product.findUnique({
          where: { sku: productData.sku },
        });

        let product;
        let action = '';

        if (existingProduct) {
          // Actualizar producto existente
          product = await prisma.product.update({
            where: { sku: productData.sku },
            data: productData,
          });
          action = 'updated';
          results.updated++;
        } else {
          // Crear nuevo producto
          product = await prisma.product.create({
            data: productData,
          });
          action = 'created';
          results.created++;
        }

        // Asignar stock al almacén si se especifica
        if (cantidad && almacen) {
          // Parsear cantidad y validar
          const quantityValue = parseFloat(cantidad);
          
          if (!isNaN(quantityValue) && quantityValue > 0) {
            // Buscar o crear almacén
            let warehouse = await prisma.warehouse.findFirst({
              where: { code: { equals: almacen.toString(), mode: 'insensitive' } },
            });

            if (!warehouse) {
              warehouse = await prisma.warehouse.create({
                data: {
                  code: almacen.toString(),
                  name: almacen.toString(),
                  type: 'PRINCIPAL',
                  isActive: true,
                },
              });
            }

            // Verificar si ya existe stock para este producto en este almacén
            const existingStock = await prisma.warehouseStock.findFirst({
              where: {
                productId: product.id,
                warehouseId: warehouse.id,
              },
            });

            const finalQty = Math.floor(quantityValue);
            let previousQty = 0;

            if (existingStock) {
              previousQty = existingStock.quantity;
              // Actualizar stock existente
              await prisma.warehouseStock.update({
                where: { id: existingStock.id },
                data: { quantity: finalQty },
              });
            } else {
              // Crear nuevo registro de stock
              await prisma.warehouseStock.create({
                data: {
                  productId: product.id,
                  warehouseId: warehouse.id,
                  quantity: finalQty,
                },
              });
            }

            // Registrar movimiento de inventario si hay userId y hay cantidad
            if (userId && finalQty > 0) {
              const isNew = action === 'created';
              const movType = isNew ? 'INGRESO' : 'AJUSTE';
              const movReason = isNew ? 'COMPRA' : 'AJUSTE_MANUAL';
              console.log(`[Excel Import] Creando movimiento ${movType}/${movReason} para producto ${product.sku}, qty=${finalQty}`);
              try {
                await prisma.inventoryMovement.create({
                  data: {
                    type: movType,
                    reason: movReason,
                    note: `Importación Excel - ${isNew ? 'Producto nuevo' : `Actualización de stock (anterior: ${previousQty})`}`,
                    createdBy: BigInt(userId),
                    warehouseToId: warehouse.id,
                    items: {
                      create: {
                        productId: product.id,
                        quantity: finalQty,
                      },
                    },
                  },
                });
                console.log(`[Excel Import] ✅ Movimiento creado para ${product.sku}`);
              } catch (movError) {
                console.error(`[Excel Import] ❌ Error creando movimiento para ${product.sku}:`, movError.message);
              }
            } else {
              console.log(`[Excel Import] ⚠️ Sin movimiento: userId=${userId}, finalQty=${finalQty}`);
            }
          }
        }

        results.success.push({
          row: rowNumber,
          action,
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

module.exports = {
  importProductsFromClientExcel,
};
