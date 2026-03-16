const prisma = require('../prisma/client');

// ─── REPORTE DE VENTAS (COTIZACIONES) ────────────────────────────────────────

async function getSalesReport({ startDate, endDate, userId, status, page = 1, limit = 10 }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(userId && { createdById: BigInt(userId) }),
    ...(status && { status }),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    } : {}),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        client: { select: { id: true, name: true, documentNum: true } },
        creator: { select: { id: true, username: true, fullName: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quote.count({ where }),
  ]);

  // Calcular totales
  const totals = await prisma.quote.aggregate({
    where,
    _sum: { grandTotal: true, discountTotal: true },
    _count: true,
  });

  // Agrupar por estado
  const byStatus = await prisma.quote.groupBy({
    by: ['status'],
    where,
    _count: true,
    _sum: { grandTotal: true },
  });

  return {
    quotes,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    summary: {
      totalQuotes: totals._count,
      totalAmount: totals._sum.grandTotal || 0,
      totalDiscount: totals._sum.discountTotal || 0,
      byStatus,
    },
  };
}

// ─── REPORTE POR EMPLEADO ─────────────────────────────────────────────────────

async function getEmployeeReport({ userId, startDate, endDate }) {
  const dateFilter = startDate || endDate ? {
    createdAt: {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    },
  } : {};

  const userWhere = userId ? { id: BigInt(userId) } : {};

  const users = await prisma.user.findMany({
    where: { ...userWhere, isActive: true },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      userRoles: {
        include: { role: { select: { name: true } } },
      },
    },
  });

  const employeeReports = await Promise.all(users.map(async (user) => {
    const [quotes, movements, serviceOrders] = await Promise.all([
      // Cotizaciones creadas por el empleado
      prisma.quote.findMany({
        where: { createdBy: user.id, ...dateFilter },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          grandTotal: true,
          quoteType: true,
          createdAt: true,
          client: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Movimientos de inventario registrados por el empleado
      prisma.inventoryMovement.findMany({
        where: { createdBy: user.id, ...dateFilter },
        select: {
          id: true,
          type: true,
          reason: true,
          note: true,
          createdAt: true,
          warehouseFrom: { select: { code: true, name: true } },
          warehouseTo: { select: { code: true, name: true } },
          items: { select: { quantity: true, product: { select: { sku: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Órdenes de servicio asignadas
      prisma.serviceOrder.findMany({
        where: { assignedTo: user.id, ...dateFilter },
        select: {
          id: true,
          serviceCode: true,
          status: true,
          createdAt: true,
          client: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calcular totales del empleado
    const totalSales = quotes.reduce((sum, q) => sum + (parseFloat(q.grandTotal) || 0), 0);
    const approvedQuotes = quotes.filter(q => q.status === 'APROBADA').length;
    const pendingQuotes = quotes.filter(q => q.status === 'PENDIENTE' || q.status === 'ENVIADA').length;

    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles: user.userRoles.map(ur => ur.role.name),
      },
      summary: {
        totalQuotes: quotes.length,
        approvedQuotes,
        pendingQuotes,
        totalSalesAmount: totalSales,
        totalMovements: movements.length,
        totalServiceOrders: serviceOrders.length,
      },
      quotes,
      movements,
      serviceOrders,
    };
  }));

  return employeeReports;
}

// ─── REPORTE DE MOVIMIENTOS DE INVENTARIO ────────────────────────────────────

async function getInventoryMovementsReport({ startDate, endDate, warehouseId, type, page = 1, limit = 10 }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(warehouseId && { warehouseId: BigInt(warehouseId) }),
    ...(type && { type }),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    } : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        warehouseFrom: { select: { code: true, name: true } },
        warehouseTo: { select: { code: true, name: true } },
        creator: { select: { id: true, username: true, fullName: true } },
        items: { include: { product: { select: { sku: true, name: true, category: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryMovement.count({ where: { ...where, createdAt: where.createdAt } }),
  ]);

  // Resumen por tipo
  const byType = await prisma.inventoryMovement.groupBy({
    by: ['type'],
    where,
    _count: true,
  });

  // Resumen por razón
  const byReason = await prisma.inventoryMovement.groupBy({
    by: ['reason'],
    where,
    _count: true,
  });

  return {
    movements,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    summary: { byType, byReason },
  };
}

// ─── REPORTE GENERAL (DASHBOARD ADMIN) ───────────────────────────────────────

async function getGeneralReport({ startDate, endDate }) {
  const dateFilter = startDate || endDate ? {
    createdAt: {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    },
  } : {};

  const [
    totalQuotes,
    totalApproved,
    totalMovements,
    totalClients,
    topEmployees,
    topProducts,
    salesByDay,
  ] = await Promise.all([
    prisma.quote.count({ where: dateFilter }),
    prisma.quote.aggregate({
      where: { ...dateFilter, status: 'APROBADA' },
      _count: true,
      _sum: { grandTotal: true },
    }),
    prisma.inventoryMovement.count({ where: dateFilter }),
    prisma.client.count(),
    // Top empleados por ventas
    prisma.quote.groupBy({
      by: ['createdBy'],
      where: { ...dateFilter, status: 'APROBADA' },
      _count: true,
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 5,
    }),
    // Top productos más cotizados
    prisma.quoteItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
      },
      _count: true,
      _sum: { quantity: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    }),
    // Ventas por día
    prisma.quote.groupBy({
      by: ['issueDate'],
      where: { ...dateFilter, status: 'APROBADA' },
      _count: true,
      _sum: { grandTotal: true },
      orderBy: { issueDate: 'desc' },
      take: 30,
    }).catch(() => []),
  ]);

  // Enriquecer top empleados con nombres
  const enrichedTopEmployees = await Promise.all(
    topEmployees.map(async (emp) => {
      if (!emp.createdBy) return null;
      const user = await prisma.user.findUnique({
        where: { id: emp.createdBy },
        select: { username: true, fullName: true },
      });
      return {
        userId: emp.createdBy.toString(),
        username: user?.username,
        fullName: user?.fullName,
        totalQuotes: emp._count,
        totalAmount: emp._sum.grandTotal || 0,
      };
    })
  );

  // Enriquecer top productos con nombres
  const enrichedTopProducts = await Promise.all(
    topProducts.map(async (item) => {
      if (!item.productId) return null;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { sku: true, name: true },
      });
      return {
        productId: item.productId.toString(),
        sku: product?.sku,
        name: product?.name,
        timesCited: item._count,
        totalQuantity: item._sum.quantity || 0,
      };
    })
  );

  return {
    overview: {
      totalQuotes,
      approvedQuotes: totalApproved._count,
      totalApprovedAmount: totalApproved._sum.totalAmount || 0,
      totalMovements,
      totalClients,
    },
    topEmployees: enrichedTopEmployees.filter(Boolean),
    topProducts: enrichedTopProducts.filter(Boolean),
    salesByDay,
  };
}

module.exports = {
  getSalesReport,
  getEmployeeReport,
  getInventoryMovementsReport,
  getGeneralReport,
};
