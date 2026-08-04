const prisma = require('../prisma/client');
const { montoALetras } = require('../utils/numberToWords');
const exchangeRateService = require('./exchangeRate.service');

function normalizeQuote(quote) {
  if (!quote) return quote;
  const discountTotal = parseFloat(quote.discountTotal ?? 0);
  const subtotal = parseFloat(quote.subtotal ?? 0);
  const discountPercent = subtotal > 0 && discountTotal > 0
    ? (discountTotal / subtotal) * 100
    : 0;
  return {
    ...quote,
    total: parseFloat(quote.grandTotal ?? 0),
    grandTotal: parseFloat(quote.grandTotal ?? 0),
    subtotal,
    discount: discountTotal,
    discountPercent,
    exchangeRate: quote.exchangeRate != null ? parseFloat(quote.exchangeRate) : null,
    warehouseId: quote.warehouseId ? Number(quote.warehouseId) : null,
    items: (quote.items || []).map(item => ({
      ...item,
      total: item.lineTotal,
      unitTotal: item.lineTotal,
    })),
  };
}

async function getAllQuotes({ page = 1, limit = 10, search = '', status = null, clientId = null, quoteType = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = {
    ...(search && {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(status && { status }),
    ...(clientId && { clientId: BigInt(clientId) }),
    ...(quoteType && { quoteType }),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        paymentTerms: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quote.count({ where }),
  ]);

  return {
    quotes: quotes.map(normalizeQuote),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getQuoteById(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
        },
      },
      items: {
        include: {
          product: true,
          hiddenCosts: true,
          stockChecks: true,
        },
      },
      paymentTerms: {
        orderBy: { installmentNumber: 'asc' },
      },
      warehouse: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!quote) {
    throw new Error('Cotización no encontrada');
  }

  return normalizeQuote(quote);
}

async function createQuote(data) {
  const { clientId, createdBy, items, quoteType, paymentType, validUntil, notes, discount, discountPercent, paymentTerms } = data;
  const globalDiscountPct = parseFloat(discount ?? discountPercent ?? 0);

  const quoteNumber = await generateQuoteNumber();

  let subtotal = 0;
  const itemsData = [];

  for (const item of items) {
    let itemDiscountPercent = 0;

    if (item.discount && item.discount > 0) {
      if (item.discount > 100) {
        // Monto en Bs absoluto (imposible como porcentaje)
        itemDiscountPercent = (item.discount / item.unitPrice) * 100;
      } else {
        // Porcentaje 0–100
        itemDiscountPercent = item.discount;
      }
    }

    const itemTotal = item.quantity * item.unitPrice * (1 - itemDiscountPercent / 100);
    subtotal += itemTotal;

    itemsData.push({
      productId: item.productId ? BigInt(item.productId) : null,
      itemType: item.itemType || 'PRODUCT',
      serviceCode: item.sku || item.serviceCode || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: itemDiscountPercent,
      lineTotal: itemTotal,
    });
  }

  const discountAmount = globalDiscountPct > 0 ? (subtotal * globalDiscountPct) / 100 : 0;
  const grandTotal = subtotal - discountAmount;

  // Congelar el TC paralelo vigente en la cotización: si el dólar sube mañana,
  // esta cotización ya emitida no debe cambiar de monto.
  const currentRate = await exchangeRateService.getCurrentRateOrNull();
  const exchangeRate = currentRate?.rate ?? null;

  // Calcular términos de pago si se proporcionan (para crédito)
  let paymentTermsData = undefined;
  if (paymentTerms && Array.isArray(paymentTerms) && paymentTerms.length > 0) {
    const issueDate = new Date();
    paymentTermsData = {
      create: paymentTerms.map(term => {
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + (term.daysAfterIssue || 0));
        const amount = grandTotal * ((term.percentage || 100) / 100);
        return {
          installmentNumber: term.installmentNumber || 1,
          percentage: term.percentage || 100,
          amount,
          daysAfterIssue: term.daysAfterIssue || 0,
          dueDate,
          description: term.description || null,
        };
      }),
    };
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      clientId: BigInt(clientId),
      createdBy: BigInt(createdBy),
      status: 'PENDIENTE',
      quoteType: quoteType || 'PRODUCTOS',
      paymentType: paymentType || 'CONTADO',
      validUntil: validUntil ? new Date(validUntil) : null,
      observations: notes,
      discountTotal: discountAmount,
      subtotal,
      grandTotal,
      exchangeRate,
      items: {
        create: itemsData,
      },
      ...(paymentTermsData && { paymentTerms: paymentTermsData }),
    },
    include: {
      client: true,
      items: {
        include: {
          product: true,
        },
      },
      paymentTerms: {
        orderBy: { installmentNumber: 'asc' },
      },
    },
  });

  return normalizeQuote(quote);
}

async function updateQuote(id, data) {
  const { status, quoteType, paymentType, validUntil, notes, observations, discount, discountPercent, items, userId, warehouseId } = data;
  const globalDiscountPct = parseFloat(discount ?? discountPercent ?? 0);

  // Obtener cotización actual para verificar cambio de estado
  const currentQuote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!currentQuote) {
    throw new Error('Cotización no encontrada');
  }

  if (currentQuote.versionStatus === 'REEMPLAZADA') {
    throw new Error('No se puede modificar una versión reemplazada; edite la versión vigente.');
  }

  // Observations: acepta tanto 'observations' directo como 'notes' (alias)
  const observationsValue = observations !== undefined ? observations : (notes !== undefined ? notes : undefined);

  let updateData = {
    ...(status && { status }),
    ...(quoteType && { quoteType }),
    ...(paymentType && { paymentType }),
    ...(validUntil && { validUntil: new Date(validUntil) }),
    ...(observationsValue !== undefined && { observations: observationsValue }),
    ...(warehouseId && { warehouseId: BigInt(warehouseId) }),
  };

  if (items && items.length > 0) {
    await prisma.quoteItem.deleteMany({
      where: { quoteId: BigInt(id) },
    });

    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      let itemDiscountPercent = 0;
      
      if (item.discount && item.discount > 0) {
        if (item.discount > 100) {
          // Monto en Bs absoluto (imposible como porcentaje)
          itemDiscountPercent = (item.discount / item.unitPrice) * 100;
        } else {
          // Porcentaje 0–100
          itemDiscountPercent = item.discount;
        }
      }
      
      const itemTotal = item.quantity * item.unitPrice * (1 - itemDiscountPercent / 100);
      subtotal += itemTotal;

      itemsData.push({
        productId: item.productId ? BigInt(item.productId) : null,
        itemType: item.itemType || 'PRODUCT',
        serviceCode: item.sku || item.serviceCode || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscountPercent,
        lineTotal: itemTotal,
      });
    }

    const discountAmount = globalDiscountPct > 0 ? (subtotal * globalDiscountPct) / 100 : 0;
    const grandTotal = subtotal - discountAmount;

    updateData.subtotal = subtotal;
    updateData.discountTotal = discountAmount;
    updateData.grandTotal = grandTotal;
    updateData.items = {
      create: itemsData,
    };
  }

  const quote = await prisma.quote.update({
    where: { id: BigInt(id) },
    data: updateData,
    include: {
      client: true,
      items: {
        include: {
          product: true,
          hiddenCosts: true,
        },
      },
      warehouse: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  // Si la cotización cambia a APROBADA, reducir inventario
  if (status === 'APROBADA' && currentQuote.status !== 'APROBADA') {
    console.log(`[Quote Service] Cotización ${currentQuote.quoteNumber} aprobada - reduciendo inventario`);
    
    if (!userId) {
      throw new Error('Se requiere un usuario para registrar el movimiento de inventario');
    }

    // Obtener el almacén: prioridad → param → usuario → admin requiere selección
    let userWarehouseId = warehouseId;
    
    if (!userWarehouseId) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: {
          warehouseId: true,
          userRoles: { include: { role: true } },
        },
      });

      const isAdmin = user?.userRoles?.some(
        ur => ur.role.name.trim().toLowerCase() === 'administrador'
      );
      
      if (user && user.warehouseId) {
        userWarehouseId = user.warehouseId.toString();
        console.log(`[Quote Service] Usando almacén asignado al usuario: ${userWarehouseId}`);
      } else if (isAdmin) {
        throw new Error('Como administrador, debes seleccionar el almacén desde el cual se descontará el inventario (envía warehouseId en la petición).');
      } else {
        throw new Error('El usuario no tiene un almacén asignado. Contacte al administrador.');
      }
    }

    // Crear movimiento de inventario por cada producto
    for (const item of currentQuote.items) {
      if (item.productId && item.itemType === 'PRODUCT') {
        try {
          // Verificar stock disponible
          const stock = await prisma.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: BigInt(userWarehouseId),
                productId: item.productId,
              },
            },
          });

          const availableStock = stock ? parseFloat(stock.quantity) : 0;
          if (!stock || availableStock < item.quantity) {
            console.warn(`[Quote Service] Stock insuficiente para producto ${item.product?.sku}: disponible=${availableStock}, requerido=${item.quantity}`);
            throw new Error(`Stock insuficiente para ${item.product?.name || 'producto'}. Disponible: ${availableStock}, Requerido: ${item.quantity}`);
          }

          // Crear movimiento de egreso
          await prisma.inventoryMovement.create({
            data: {
              type: 'EGRESO',
              reason: 'VENTA',
              note: `Venta por cotización ${currentQuote.quoteNumber}`,
              createdBy: BigInt(userId),
              warehouseFromId: BigInt(userWarehouseId),
              items: {
                create: {
                  productId: item.productId,
                  quantity: item.quantity,
                },
              },
            },
          });

          // Reducir stock
          await prisma.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: BigInt(userWarehouseId),
                productId: item.productId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          console.log(`[Quote Service] ✅ Stock reducido para ${item.product?.sku}: -${item.quantity}`);
        } catch (error) {
          console.error(`[Quote Service] ❌ Error reduciendo stock para producto ${item.product?.sku}:`, error.message);
          throw error;
        }
      }
    }

    console.log(`[Quote Service] ✅ Inventario reducido exitosamente para cotización ${currentQuote.quoteNumber}`);
  }

  // Si se aprobó la cotización, obtener los movimientos de inventario creados
  if (status === 'APROBADA' && currentQuote.status !== 'APROBADA') {
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        createdBy: BigInt(userId),
        type: 'EGRESO',
        reason: 'VENTA',
        note: {
          contains: currentQuote.quoteNumber,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        warehouseFrom: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = normalizeQuote(quote);
    result.inventoryMovements = inventoryMovements;
    return result;
  }

  return normalizeQuote(quote);
}

async function deleteQuote(id) {
  await prisma.quote.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Cotización eliminada exitosamente' };
}

async function checkQuoteStock(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      items: {
        include: {
          product: {
            include: {
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!quote) {
    throw new Error('Cotización no encontrada');
  }

  const stockStatus = [];
  let overallStatus = 'DISPONIBLE';

  for (const item of quote.items) {
    if (item.product) {
      const totalStock = item.product.stock.reduce((sum, s) => sum + s.quantity, 0);
      const available = totalStock >= item.quantity;

      stockStatus.push({
        productId: item.productId,
        productName: item.product.name,
        required: item.quantity,
        available: totalStock,
        status: available ? 'DISPONIBLE' : totalStock > 0 ? 'PARCIAL' : 'SIN_STOCK',
      });

      if (!available) {
        overallStatus = totalStock > 0 ? 'PARCIAL' : 'SIN_STOCK';
      }
    }
  }

  await prisma.stockCheck.upsert({
    where: { quoteId: BigInt(id) },
    update: {
      status: overallStatus,
      checkedAt: new Date(),
    },
    create: {
      quoteId: BigInt(id),
      status: overallStatus,
    },
  });

  return {
    quoteId: id,
    overallStatus,
    items: stockStatus,
  };
}

async function getQuoteReceipt(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      client: true,
      creator: { select: { id: true, username: true, firstName: true, lastName: true } },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!quote) throw new Error('Cotización no encontrada');

  const normalized = normalizeQuote(quote);
  
  // Calcular días de validez (contando desde el día siguiente de la creación)
  let validityDays = null;
  if (quote.validUntil && quote.createdAt) {
    const createdAtPlusOneDay = new Date(quote.createdAt);
    createdAtPlusOneDay.setDate(createdAtPlusOneDay.getDate() + 1);
    const diffTime = new Date(quote.validUntil) - createdAtPlusOneDay;
    validityDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Convertir total a letras
  const grandTotal = parseFloat(quote.grandTotal);
  const totalInWords = montoALetras(grandTotal, 'BOLIVIANOS');

  return {
    ...normalized,
    receiptData: {
      quoteNumber: quote.quoteNumber,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      validityDays: validityDays,
      paymentType: quote.paymentType,
      status: quote.status,
      client: {
        name: quote.client?.name,
        nit: quote.client?.nit,
        phone: quote.client?.phone,
        email: quote.client?.email,
        address: quote.client?.address,
      },
      seller: quote.creator
        ? `${quote.creator.firstName || ''} ${quote.creator.lastName || ''}`.trim() || quote.creator.username
        : 'Sistema',
      items: normalized.items.map(item => ({
        description: item.description || item.product?.name || '',
        sku: item.product?.sku || item.serviceCode || '',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discount: parseFloat(item.discount || 0),
        lineTotal: parseFloat(item.lineTotal),
      })),
      subtotal: parseFloat(quote.subtotal),
      discountTotal: parseFloat(quote.discountTotal),
      hasGlobalDiscount: parseFloat(quote.discountTotal) > 0,
      taxTotal: parseFloat(quote.taxTotal),
      grandTotal: grandTotal,
      totalInWords: totalInWords,
      observations: quote.observations,
      currency: 'BS',
    },
  };
}

async function updateItemPrice(itemId, { unitPrice, discount, quantity }) {
  const item = await prisma.quoteItem.findUnique({
    where: { id: BigInt(itemId) },
  });

  if (!item) throw new Error('Ítem no encontrado');

  const parentQuote = await prisma.quote.findUnique({
    where: { id: item.quoteId },
    select: { versionStatus: true },
  });

  if (parentQuote?.versionStatus === 'REEMPLAZADA') {
    throw new Error('No se puede modificar una versión reemplazada; edite la versión vigente.');
  }

  const newUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(item.unitPrice);
  const newDiscount  = discount  !== undefined ? parseFloat(discount)  : parseFloat(item.discount);
  const newQuantity  = quantity  !== undefined ? parseFloat(quantity)  : parseFloat(item.quantity);

  const lineTotal = newQuantity * newUnitPrice * (1 - newDiscount / 100);

  await prisma.quoteItem.update({
    where: { id: BigInt(itemId) },
    data: {
      unitPrice: newUnitPrice,
      discount:  newDiscount,
      quantity:  newQuantity,
      lineTotal,
    },
  });

  // Recalcular subtotal y total de la cotización
  const allItems = await prisma.quoteItem.findMany({
    where: { quoteId: item.quoteId },
  });

  const subtotal = allItems.reduce((sum, i) => sum + parseFloat(i.lineTotal), 0);

  const quote = await prisma.quote.findUnique({ where: { id: item.quoteId }, select: { discountTotal: true } });
  const discountAmount = parseFloat(quote.discountTotal) || 0;
  const grandTotal = subtotal - discountAmount;

  const updatedQuote = await prisma.quote.update({
    where: { id: item.quoteId },
    data: { subtotal, grandTotal },
    include: {
      client: true,
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });

  return normalizeQuote(updatedQuote);
}

async function createQuoteVersion(quoteId, userId) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(quoteId) },
    include: {
      items: {
        include: { details: true, hiddenCosts: true },
        orderBy: { sortOrder: 'asc' },
      },
      paymentTerms: { orderBy: { installmentNumber: 'asc' } },
    },
  });

  if (!quote) {
    throw new Error('Cotización no encontrada');
  }

  if (quote.versionStatus !== 'VIGENTE') {
    throw new Error('Solo se puede editar la versión vigente de esta cotización');
  }

  if (quote.status === 'APROBADA') {
    throw new Error('No se puede editar una cotización ya aprobada (el inventario ya fue descontado)');
  }

  const rootId = quote.rootQuoteId ?? quote.id;

  // Congelar el TC vigente al momento de crear esta nueva versión.
  const currentRate = await exchangeRateService.getCurrentRateOrNull();
  const exchangeRate = currentRate?.rate ?? null;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  const newVersion = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({
      data: {
        quoteNumber: quote.quoteNumber,
        version: quote.version + 1,
        versionStatus: 'VIGENTE',
        rootQuoteId: rootId,
        previousVersionId: quote.id,
        clientId: quote.clientId,
        createdBy: BigInt(userId),
        status: 'PENDIENTE',
        quoteType: quote.quoteType,
        paymentType: quote.paymentType,
        cashPaymentPercentage: quote.cashPaymentPercentage,
        validUntil,
        issueDate: new Date(),
        currency: quote.currency,
        exchangeRate,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        discountTotal: quote.discountTotal,
        grandTotal: quote.grandTotal,
        termsConditions: quote.termsConditions,
        observations: quote.observations,
        warehouseId: quote.warehouseId,
        items: {
          create: quote.items.map(item => ({
            itemType: item.itemType,
            productId: item.productId,
            kitId: item.kitId,
            serviceCode: item.serviceCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitPriceBase: item.unitPriceBase,
            discount: item.discount,
            taxPercent: item.taxPercent,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
            isKit: item.isKit,
            details: item.details.length > 0 ? {
              create: item.details.map(d => ({ description: d.description, sortOrder: d.sortOrder })),
            } : undefined,
            hiddenCosts: item.hiddenCosts.length > 0 ? {
              create: item.hiddenCosts.map(c => ({
                costType: c.costType,
                description: c.description,
                quantity: c.quantity,
                unitCost: c.unitCost,
                totalCost: c.totalCost,
              })),
            } : undefined,
          })),
        },
        ...(quote.paymentTerms.length > 0 && {
          paymentTerms: {
            create: quote.paymentTerms.map(pt => ({
              installmentNumber: pt.installmentNumber,
              percentage: pt.percentage,
              amount: pt.amount,
              daysAfterIssue: pt.daysAfterIssue,
              dueDate: pt.dueDate,
              description: pt.description,
            })),
          },
        }),
      },
      include: {
        client: true,
        items: {
          include: { product: true, hiddenCosts: true, details: true },
        },
        paymentTerms: { orderBy: { installmentNumber: 'asc' } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { versionStatus: 'REEMPLAZADA' },
    });

    return created;
  });

  return normalizeQuote(newVersion);
}

async function getQuoteVersions(quoteId) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(quoteId) },
    select: { id: true, rootQuoteId: true },
  });

  if (!quote) {
    throw new Error('Cotización no encontrada');
  }

  const rootId = quote.rootQuoteId ?? quote.id;

  const versions = await prisma.quote.findMany({
    where: {
      OR: [{ id: rootId }, { rootQuoteId: rootId }],
    },
    include: {
      client: true,
      items: { include: { product: true } },
    },
    orderBy: { version: 'asc' },
  });

  return versions.map(normalizeQuote);
}

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNumber: {
        startsWith: `COT-${year}`,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let number = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[2]);
    number = lastNumber + 1;
  }

  return `COT-${year}-${number.toString().padStart(4, '0')}`;
}

module.exports = {
  getAllQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  checkQuoteStock,
  getQuoteReceipt,
  updateItemPrice,
  createQuoteVersion,
  getQuoteVersions,
};
