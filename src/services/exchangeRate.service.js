const prisma = require('../prisma/client');

const BCB_OFICIAL_URL = 'https://apibcb.cucu.bo/api/v1/tc/oficial';

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

// Consulta la API pública del Banco Central de Bolivia (vía apibcb.cucu.bo)
// para obtener el tipo de cambio oficial vigente publicado por el BCB.
async function fetchOfficialRate() {
  const response = await fetch(BCB_OFICIAL_URL, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`API del BCB respondió con estado ${response.status}`);
  }

  const json = await response.json();
  const tcOficial = json?.tc_oficial;
  const rate = parseFloat(tcOficial?.valor ?? tcOficial?.base);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('La API del BCB no devolvió un tipo de cambio válido');
  }

  return { rate, fecha: tcOficial?.fecha || null };
}

async function refreshAutomaticRate(userId) {
  const { rate, fecha } = await fetchOfficialRate();

  const created = await prisma.exchangeRate.create({
    data: {
      rate,
      officialRate: rate,
      source: 'BCB_OFICIAL',
      note: fecha ? `Tipo de cambio oficial BCB del ${fecha}` : 'Tipo de cambio oficial del Banco Central de Bolivia',
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
