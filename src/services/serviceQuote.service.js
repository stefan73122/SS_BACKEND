const prisma = require('../prisma/client');

function normalizeServiceQuote(quote) {
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

async function getAllServiceQuotes({ page = 1, limit = 10, search = '', status = null, clientId = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = {
    quoteType: 'SERVICIOS',
    ...(search && {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(status && { status }),
    ...(clientId && { clientId: BigInt(clientId) }),
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
            fullName: true,
          },
        },
        items: {
          include: {
            product: true,
            details: {
              orderBy: { sortOrder: 'asc' },
            },
            hiddenCosts: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quote.count({ where }),
  ]);

  return {
    quotes: quotes.map(normalizeServiceQuote),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getServiceQuoteById(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          username: true,
          fullName: true,
        },
      },
      items: {
        include: {
          product: true,
          details: {
            orderBy: { sortOrder: 'asc' },
          },
          hiddenCosts: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!quote) {
    throw new Error('Cotización de servicio no encontrada');
  }

  if (quote.quoteType !== 'SERVICIOS') {
    throw new Error('Esta no es una cotización de servicio');
  }

  return normalizeServiceQuote(quote);
}

async function createServiceQuote(data) {
  const { 
    clientId, 
    createdBy, 
    items, 
    paymentType, 
    validUntil, 
    observations, 
    termsConditions,
    version,
    deliveryTime,
    generalDescription,
    responsibleName,
    responsiblePosition,
    responsiblePhone,
    responsibleEmail,
    salesExecutive,
    discountPercent,
  } = data;

  if (!items || items.length === 0) {
    throw new Error('Debe incluir al menos un servicio en la cotización');
  }

  const quoteNumber = await generateServiceQuoteNumber();

  let subtotal = 0;
  const itemsData = [];

  for (const item of items) {
    const itemSubtotal = parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0);
    const itemDiscount = parseFloat(item.discount || 0);
    const itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
    const itemTotal = itemSubtotal - itemDiscountAmount;
    
    subtotal += itemTotal;

    const itemData = {
      itemType: 'SERVICE',
      description: item.description,
      quantity: parseFloat(item.quantity || 1),
      unitPrice: parseFloat(item.unitPrice || 0),
      unitPriceBase: item.unitPriceBase ? parseFloat(item.unitPriceBase) : null,
      discount: itemDiscount,
      lineTotal: itemTotal,
      sortOrder: item.sortOrder || 0,
    };

    if (item.productId) {
      itemData.productId = BigInt(item.productId);
    }

    itemsData.push({
      ...itemData,
      details: item.details && item.details.length > 0 ? {
        create: item.details.map((detail, index) => ({
          description: detail.description || detail,
          sortOrder: detail.sortOrder || index,
        })),
      } : undefined,
      hiddenCosts: item.hiddenCosts && item.hiddenCosts.length > 0 ? {
        create: item.hiddenCosts.map(cost => ({
          costType: cost.costType || 'MANO_DE_OBRA',
          description: cost.description,
          quantity: parseFloat(cost.quantity || 1),
          unitCost: parseFloat(cost.unitCost || 0),
          totalCost: parseFloat(cost.quantity || 1) * parseFloat(cost.unitCost || 0),
        })),
      } : undefined,
    });
  }

  const globalDiscountAmount = discountPercent ? (subtotal * parseFloat(discountPercent)) / 100 : 0;
  const grandTotal = subtotal - globalDiscountAmount;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      version: version || 1,
      clientId: BigInt(clientId),
      createdBy: BigInt(createdBy),
      status: 'PENDIENTE',
      quoteType: 'SERVICIOS',
      paymentType: paymentType || 'CONTADO',
      validUntil: validUntil ? new Date(validUntil) : null,
      observations,
      termsConditions,
      subtotal,
      discountTotal: globalDiscountAmount,
      taxTotal: 0,
      grandTotal,
      items: {
        create: itemsData,
      },
    },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          username: true,
          fullName: true,
        },
      },
      items: {
        include: {
          product: true,
          details: {
            orderBy: { sortOrder: 'asc' },
          },
          hiddenCosts: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return normalizeServiceQuote(quote);
}

async function updateServiceQuote(id, data) {
  const existingQuote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingQuote) {
    throw new Error('Cotización de servicio no encontrada');
  }

  if (existingQuote.quoteType !== 'SERVICIOS') {
    throw new Error('Esta no es una cotización de servicio');
  }

  const { 
    status, 
    paymentType, 
    validUntil, 
    observations, 
    termsConditions, 
    items,
    version,
    discountPercent,
  } = data;

  let updateData = {
    ...(status && { status }),
    ...(paymentType && { paymentType }),
    ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
    ...(observations !== undefined && { observations }),
    ...(termsConditions !== undefined && { termsConditions }),
    ...(version !== undefined && { version }),
  };

  if (items && items.length > 0) {
    await prisma.quoteItem.deleteMany({
      where: { quoteId: BigInt(id) },
    });

    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      const itemSubtotal = parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0);
      const itemDiscount = parseFloat(item.discount || 0);
      const itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
      const itemTotal = itemSubtotal - itemDiscountAmount;
      
      subtotal += itemTotal;

      const itemData = {
        itemType: 'SERVICE',
        description: item.description,
        quantity: parseFloat(item.quantity || 1),
        unitPrice: parseFloat(item.unitPrice || 0),
        unitPriceBase: item.unitPriceBase ? parseFloat(item.unitPriceBase) : null,
        discount: itemDiscount,
        lineTotal: itemTotal,
        sortOrder: item.sortOrder || 0,
      };

      if (item.productId) {
        itemData.productId = BigInt(item.productId);
      }

      itemsData.push({
        ...itemData,
        details: item.details && item.details.length > 0 ? {
          create: item.details.map((detail, index) => ({
            description: detail.description || detail,
            sortOrder: detail.sortOrder || index,
          })),
        } : undefined,
        hiddenCosts: item.hiddenCosts && item.hiddenCosts.length > 0 ? {
          create: item.hiddenCosts.map(cost => ({
            costType: cost.costType || 'MANO_DE_OBRA',
            description: cost.description,
            quantity: parseFloat(cost.quantity || 1),
            unitCost: parseFloat(cost.unitCost || 0),
            totalCost: parseFloat(cost.quantity || 1) * parseFloat(cost.unitCost || 0),
          })),
        } : undefined,
      });
    }

    const globalDiscountAmount = discountPercent ? (subtotal * parseFloat(discountPercent)) / 100 : 0;
    const grandTotal = subtotal - globalDiscountAmount;

    updateData.subtotal = subtotal;
    updateData.discountTotal = globalDiscountAmount;
    updateData.taxTotal = 0;
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
      creator: {
        select: {
          id: true,
          username: true,
          fullName: true,
        },
      },
      items: {
        include: {
          product: true,
          details: {
            orderBy: { sortOrder: 'asc' },
          },
          hiddenCosts: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return normalizeServiceQuote(quote);
}

async function deleteServiceQuote(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
  });

  if (!quote) {
    throw new Error('Cotización de servicio no encontrada');
  }

  if (quote.quoteType !== 'SERVICIOS') {
    throw new Error('Esta no es una cotización de servicio');
  }

  await prisma.quote.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Cotización de servicio eliminada exitosamente' };
}

async function getServiceQuoteReceipt(id) {
  const quote = await prisma.quote.findUnique({
    where: { id: BigInt(id) },
    include: {
      client: true,
      creator: { 
        select: { 
          id: true, 
          username: true, 
          fullName: true,
        } 
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          details: {
            orderBy: { sortOrder: 'asc' },
          },
          hiddenCosts: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!quote) throw new Error('Cotización de servicio no encontrada');
  if (quote.quoteType !== 'SERVICIOS') throw new Error('Esta no es una cotización de servicio');

  const normalized = normalizeServiceQuote(quote);

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
        documentType: quote.client?.documentType,
        documentNum: quote.client?.documentNum,
        phone: quote.client?.phone,
        email: quote.client?.email,
        address: quote.client?.address,
      },
      seller: quote.creator?.fullName || quote.creator?.username || 'Sistema',
      version: quote.version,
      items: normalized.items.map(item => ({
        description: item.description || item.product?.name || '',
        sku: item.product?.sku || '',
        brand: item.product?.brand || '',
        origin: item.product?.origin || '',
        details: item.details || [],
        hiddenCosts: item.hiddenCosts || [],
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        unitPriceBase: item.unitPriceBase ? parseFloat(item.unitPriceBase) : null,
        discount: parseFloat(item.discount || 0),
        lineTotal: parseFloat(item.lineTotal),
      })),
      subtotal: parseFloat(quote.subtotal),
      discountTotal: parseFloat(quote.discountTotal),
      discountPercent: quote.subtotal > 0 ? (parseFloat(quote.discountTotal) / parseFloat(quote.subtotal)) * 100 : 0,
      taxTotal: parseFloat(quote.taxTotal),
      grandTotal: parseFloat(quote.grandTotal),
      observations: quote.observations,
      termsConditions: quote.termsConditions,
    },
  };
}

async function generateServiceQuoteNumber() {
  const year = new Date().getFullYear();
  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNumber: {
        startsWith: `SERV-${year}`,
      },
      quoteType: 'SERVICIOS',
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

  return `SERV-${year}-${number.toString().padStart(4, '0')}`;
}

module.exports = {
  getAllServiceQuotes,
  getServiceQuoteById,
  createServiceQuote,
  updateServiceQuote,
  deleteServiceQuote,
  getServiceQuoteReceipt,
};
