const prisma = require('../prisma/client');

function normalizeQuote(quote) {
  if (!quote) return quote;
  return {
    ...quote,
    total: quote.grandTotal,
    discount: quote.discountTotal,
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
            firstName: true,
            lastName: true,
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
          firstName: true,
          lastName: true,
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
      hiddenCosts: true,
      stockCheck: true,
    },
  });

  if (!quote) {
    throw new Error('Cotización no encontrada');
  }

  return normalizeQuote(quote);
}

async function createQuote(data) {
  const { clientId, createdBy, items, quoteType, paymentType, validUntil, notes, discount } = data;

  const quoteNumber = await generateQuoteNumber();

  let subtotal = 0;
  const itemsData = [];

  for (const item of items) {
    const itemTotal = item.quantity * item.unitPrice;
    subtotal += itemTotal;

    itemsData.push({
      productId: item.productId ? BigInt(item.productId) : null,
      itemType: item.itemType || 'PRODUCT',
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: itemTotal,
    });
  }

  const discountAmount = discount ? (subtotal * discount) / 100 : 0;
  const grandTotal = subtotal - discountAmount;

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
      items: {
        create: itemsData,
      },
    },
    include: {
      client: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return normalizeQuote(quote);
}

async function updateQuote(id, data) {
  const { status, quoteType, paymentType, validUntil, notes, discount, items, userId, warehouseId } = data;

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

  let updateData = {
    ...(status && { status }),
    ...(quoteType && { quoteType }),
    ...(paymentType && { paymentType }),
    ...(validUntil && { validUntil: new Date(validUntil) }),
    ...(notes !== undefined && { observations: notes }),
  };

  if (items && items.length > 0) {
    await prisma.quoteItem.deleteMany({
      where: { quoteId: BigInt(id) },
    });

    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      itemsData.push({
        productId: item.productId ? BigInt(item.productId) : null,
        itemType: item.itemType || 'PRODUCT',
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: itemTotal,
      });
    }

    const discountAmount = (discount || 0) ? (subtotal * (discount || 0)) / 100 : 0;
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
        },
      },
    },
  });

  // Si la cotización cambia a APROBADA, reducir inventario
  if (status === 'APROBADA' && currentQuote.status !== 'APROBADA') {
    console.log(`[Quote Service] Cotización ${currentQuote.quoteNumber} aprobada - reduciendo inventario`);
    
    if (!userId) {
      throw new Error('Se requiere un usuario para registrar el movimiento de inventario');
    }

    // Obtener el almacén asignado al usuario
    let userWarehouseId = warehouseId;
    
    if (!userWarehouseId) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { warehouseId: true },
      });
      
      if (user && user.warehouseId) {
        userWarehouseId = user.warehouseId.toString();
        console.log(`[Quote Service] Usando almacén asignado al usuario: ${userWarehouseId}`);
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

  return {
    ...normalized,
    receiptData: {
      quoteNumber: quote.quoteNumber,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
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
        sku: item.product?.sku || '',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        lineTotal: parseFloat(item.lineTotal),
      })),
      subtotal: parseFloat(quote.subtotal),
      discountTotal: parseFloat(quote.discountTotal),
      taxTotal: parseFloat(quote.taxTotal),
      grandTotal: parseFloat(quote.grandTotal),
      observations: quote.observations,
    },
  };
}

async function updateItemPrice(itemId, { unitPrice, discount, quantity }) {
  const item = await prisma.quoteItem.findUnique({
    where: { id: BigInt(itemId) },
  });

  if (!item) throw new Error('Ítem no encontrado');

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
};
