// Convierte costPrice/salePrice de productos existentes (guardados en Bs) a USD.
// Divide cada precio entre el TC con el que fue registrado (referenceExchangeRate);
// si un producto no tiene TC de referencia, usa el TC más reciente disponible como fallback.
//
// Por seguridad corre en modo "dry run" (solo muestra qué haría) a menos que se
// pase --apply. Ejecutar UNA sola vez: correrlo dos veces volvería a dividir los
// precios ya convertidos.
//
// Uso:
//   node scripts/migrate-product-prices-to-usd.js                  (dry run, no escribe nada)
//   node scripts/migrate-product-prices-to-usd.js --rate=11.90       (dry run, usando 11.90 como fallback)
//   node scripts/migrate-product-prices-to-usd.js --rate=11.90 --apply  (aplica los cambios)

const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function migrate() {
  const apply = process.argv.includes('--apply');
  const rateArg = process.argv.find((a) => a.startsWith('--rate='));
  const cliRate = rateArg ? parseFloat(rateArg.split('=')[1]) : null;

  console.log(apply ? '🚀 Modo APLICAR: se escribirán los cambios en la base de datos.\n' : '🔍 Modo DRY RUN: no se escribirá nada. Usa --apply para confirmar.\n');

  const latestRate = await prisma.exchangeRate.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  const fallbackRate = (cliRate && cliRate > 0) ? cliRate : (latestRate ? parseFloat(latestRate.rate) : null);

  console.log(`TC de fallback a usar si falta referenceExchangeRate: ${fallbackRate ?? 'N/D'} ${cliRate ? '(pasado por --rate)' : latestRate ? '(último TC registrado en BD)' : ''}\n`);

  const products = await prisma.product.findMany({
    where: {
      OR: [{ costPrice: { not: null } }, { salePrice: { not: null } }],
    },
    select: {
      id: true,
      sku: true,
      name: true,
      costPrice: true,
      salePrice: true,
      referenceExchangeRate: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Productos con precio a convertir: ${products.length}\n`);

  let converted = 0;
  let skippedNoRate = 0;

  for (const product of products) {
    const rate = product.referenceExchangeRate != null ? parseFloat(product.referenceExchangeRate) : fallbackRate;

    if (!rate || rate <= 0) {
      console.log(`⚠️  [${product.sku}] ${product.name} — sin TC disponible, se omite`);
      skippedNoRate++;
      continue;
    }

    const oldCost = product.costPrice != null ? parseFloat(product.costPrice) : null;
    const oldSale = product.salePrice != null ? parseFloat(product.salePrice) : null;
    const newCost = oldCost != null ? round2(oldCost / rate) : null;
    const newSale = oldSale != null ? round2(oldSale / rate) : null;

    console.log(
      `[${product.sku}] ${product.name} — TC ${rate} — ` +
      `costo Bs${oldCost ?? '-'} → USD${newCost ?? '-'} — ` +
      `venta Bs${oldSale ?? '-'} → USD${newSale ?? '-'}`
    );

    if (apply) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          costPrice: newCost,
          salePrice: newSale,
          referenceExchangeRate: rate,
        },
      });
    }
    converted++;
  }

  console.log(`\n📊 Resumen: ${converted} convertidos, ${skippedNoRate} omitidos por falta de TC.`);
  if (!apply) {
    console.log('\nNada fue escrito (dry run). Corre con --apply para aplicar los cambios.');
  }
}

migrate()
  .catch((error) => {
    console.error('❌ Error en la migración:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
