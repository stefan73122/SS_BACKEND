const prisma = require('../prisma/client');

async function getAllCreditPayments({ 
  page = 1, 
  limit = 50, 
  status = 'all', // 'all', 'pending', 'paid', 'overdue'
  clientId = null,
  sortBy = 'dueDate' // 'dueDate', 'amount', 'quoteNumber'
}) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const skip = (pageNum - 1) * limitNum;

  // Construir filtros
  const where = {
    quote: {
      paymentType: 'CREDITO',
      ...(clientId && { clientId: BigInt(clientId) }),
    },
  };

  // Filtrar por estado de pago
  if (status === 'pending') {
    where.isPaid = false;
  } else if (status === 'paid') {
    where.isPaid = true;
  } else if (status === 'overdue') {
    where.isPaid = false;
    where.dueDate = {
      lt: new Date(),
    };
  }

  // Determinar orden
  let orderBy = {};
  switch (sortBy) {
    case 'amount':
      orderBy = { amount: 'desc' };
      break;
    case 'quoteNumber':
      orderBy = { quote: { quoteNumber: 'asc' } };
      break;
    case 'dueDate':
    default:
      orderBy = { dueDate: 'asc' };
      break;
  }

  const [paymentTerms, total] = await Promise.all([
    prisma.quotePaymentTerm.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        quote: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy,
    }),
    prisma.quotePaymentTerm.count({ where }),
  ]);

  // Enriquecer datos con información calculada
  const enrichedPayments = paymentTerms.map(term => {
    const isOverdue = !term.isPaid && term.dueDate && new Date(term.dueDate) < new Date();
    const daysUntilDue = term.dueDate 
      ? Math.ceil((new Date(term.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...term,
      isOverdue,
      daysUntilDue,
      status: term.isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
    };
  });

  return {
    payments: enrichedPayments,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getCreditSummary() {
  // Obtener todos los términos de pago a crédito
  const allPayments = await prisma.quotePaymentTerm.findMany({
    where: {
      quote: {
        paymentType: 'CREDITO',
      },
    },
    include: {
      quote: true,
    },
  });

  const now = new Date();

  // Calcular estadísticas
  const summary = {
    totalPending: 0,
    totalPaid: 0,
    totalOverdue: 0,
    amountPending: 0,
    amountPaid: 0,
    amountOverdue: 0,
    countPending: 0,
    countPaid: 0,
    countOverdue: 0,
  };

  allPayments.forEach(payment => {
    const amount = parseFloat(payment.amount);
    const isOverdue = !payment.isPaid && payment.dueDate && new Date(payment.dueDate) < now;

    if (payment.isPaid) {
      summary.countPaid++;
      summary.amountPaid += amount;
    } else if (isOverdue) {
      summary.countOverdue++;
      summary.amountOverdue += amount;
    } else {
      summary.countPending++;
      summary.amountPending += amount;
    }
  });

  summary.totalPending = summary.countPending;
  summary.totalPaid = summary.countPaid;
  summary.totalOverdue = summary.countOverdue;

  return summary;
}

async function markPaymentAsPaid(paymentTermId) {
  const paymentTerm = await prisma.quotePaymentTerm.update({
    where: { id: BigInt(paymentTermId) },
    data: {
      isPaid: true,
      paidAt: new Date(),
    },
    include: {
      quote: {
        include: {
          client: true,
        },
      },
    },
  });

  return paymentTerm;
}

module.exports = {
  getAllCreditPayments,
  getCreditSummary,
  markPaymentAsPaid,
};
