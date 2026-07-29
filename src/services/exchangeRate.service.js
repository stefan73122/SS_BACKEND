const prisma = require('../prisma/client');

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

function serializeRate(rate) {
  if (!rate) return null;
  return {
    ...rate,
    id: rate.id.toString(),
    rate: parseFloat(rate.rate),
    officialRate: rate.officialRate != null ? parseFloat(rate.officialRate) : null,
    createdBy: rate.createdBy != null ? rate.createdBy.toString() : null,
  };
}

async function getCurrentRate() {
  const rate = await getCurrentRateOrNull();

  if (!rate) {
    throw new Error('No hay un tipo de cambio registrado. Configure uno manualmente.');
  }

  return rate;
}

async function getCurrentRateOrNull() {
  const rate = await prisma.exchangeRate.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  return serializeRate(rate);
}

// Reajusta un precio fijado en Bs a un TC de referencia, según cuánto se
// movió el paralelo desde entonces. Si falta algún TC, devuelve el precio base.
function applyRate(basePrice, referenceRate, currentRate) {
  if (basePrice == null) return null;
  const base = parseFloat(basePrice);
  if (!referenceRate || !currentRate) return base;
  return Math.round(base * (currentRate / parseFloat(referenceRate)) * 100) / 100;
}

async function getHistory({ page = 1, limit = 20 } = {}) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [rates, total] = await Promise.all([
    prisma.exchangeRate.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        creator: { select: { id: true, username: true, fullName: true } },
      },
    }),
    prisma.exchangeRate.count(),
  ]);

  return {
    rates: rates.map(serializeRate),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function setManualRate({ rate, officialRate, note }, userId) {
  const parsedRate = parseFloat(rate);
  if (!parsedRate || parsedRate <= 0) {
    throw new Error('El tipo de cambio debe ser un número mayor a 0');
  }

  const created = await prisma.exchangeRate.create({
    data: {
      rate: parsedRate,
      officialRate: officialRate != null ? parseFloat(officialRate) : null,
      source: 'MANUAL',
      note: note || null,
      createdBy: userId ? BigInt(userId) : null,
    },
  });

  return serializeRate(created);
}

// Consulta la API pública de Binance P2P (par USDT/BOB) y promedia las
// primeras ofertas de venta (comerciantes vendiendo USDT, que es el precio
// al que la gente compra dólares) para aproximar el paralelo del día.
async function fetchBinanceP2PRate() {
  const body = {
    asset: 'USDT',
    fiat: 'BOB',
    tradeType: 'SELL',
    page: 1,
    rows: 10,
    payTypes: [],
    publisherType: null,
  };

  const response = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Binance P2P respondió con estado ${response.status}`);
  }

  const json = await response.json();
  const offers = (json?.data || [])
    .map((entry) => parseFloat(entry?.adv?.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (offers.length === 0) {
    throw new Error('Binance P2P no devolvió ofertas válidas');
  }

  const average = offers.reduce((sum, price) => sum + price, 0) / offers.length;
  return Math.round(average * 10000) / 10000;
}

async function refreshAutomaticRate(userId) {
  const rate = await fetchBinanceP2PRate();

  const created = await prisma.exchangeRate.create({
    data: {
      rate,
      source: 'BINANCE_P2P',
      note: 'Promedio de ofertas de venta USDT/BOB en Binance P2P',
      createdBy: userId ? BigInt(userId) : null,
    },
  });

  return serializeRate(created);
}

module.exports = {
  getCurrentRate,
  getCurrentRateOrNull,
  getHistory,
  setManualRate,
  refreshAutomaticRate,
  applyRate,
};
