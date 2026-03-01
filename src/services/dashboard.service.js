const prisma = require('../prisma/client');

async function getDashboardStats(userId, roles) {
  const isAdmin = roles.includes('Administrador');
  const isVendor = roles.includes('Vendedor');
  const isWarehouseman = roles.includes('Bodeguero');

  // Filtros según el rol
  const quoteFilter = isVendor ? { createdBy: BigInt(userId) } : {};
  
  // Estadísticas básicas
  const [
    totalClients,
    totalProducts,
    totalQuotes,
    approvedQuotes,
  ] = await Promise.all([
    prisma.client.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.quote.count({ where: quoteFilter }),
    prisma.quote.count({ 
      where: { 
        ...quoteFilter,
        status: 'APROBADA' 
      } 
    }),
  ]);

  // Cotizaciones recientes
  const recentQuotes = await prisma.quote.findMany({
    where: quoteFilter,
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      client: {
        select: {
          name: true,
        },
      },
      creator: {
        select: {
          fullName: true,
        },
      },
    },
  });

  // Clientes recientes
  const recentClients = await prisma.client.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      clientType: true,
      createdAt: true,
    },
  });

  // Calcular ingresos aprobados
  const approvedQuotesWithTotal = await prisma.quote.findMany({
    where: {
      ...quoteFilter,
      status: 'APROBADA',
    },
    select: {
      grandTotal: true,
    },
  });

  const totalRevenue = approvedQuotesWithTotal.reduce(
    (sum, quote) => sum + Number(quote.grandTotal),
    0
  );

  return {
    stats: {
      totalClients,
      totalProducts,
      totalQuotes,
      approvedQuotes,
      totalRevenue,
    },
    recentQuotes,
    recentClients,
    userRole: roles[0] || 'Sin rol',
  };
}

module.exports = {
  getDashboardStats,
};
