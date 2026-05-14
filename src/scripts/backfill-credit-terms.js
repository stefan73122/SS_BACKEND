/**
 * Backfill: crea QuotePaymentTerm para cotizaciones CREDITO que no tienen ninguna.
 * Uso: node src/scripts/backfill-credit-terms.js
 */
require('dotenv').config();
const prisma = require('../prisma/client');

async function main() {
  // Cotizaciones CREDITO sin paymentTerms
  const quotes = await prisma.quote.findMany({
    where: {
      paymentType: 'CREDITO',
      paymentTerms: { none: {} },
    },
    select: {
      id: true,
      quoteNumber: true,
      grandTotal: true,
      createdAt: true,
      observations: true,
    },
  });

  console.log(`Cotizaciones CREDITO sin paymentTerms: ${quotes.length}`);

  if (quotes.length === 0) {
    console.log('Nada que migrar.');
    return;
  }

  let created = 0;
  for (const quote of quotes) {
    // Intentar extraer días del texto de observaciones (ej: "Crédito a 30 días: ...")
    let daysAfterIssue = 30;
    if (quote.observations) {
      const match = quote.observations.match(/(\d+)\s*d[ií]as?/i);
      if (match) daysAfterIssue = parseInt(match[1]);
    }

    const grandTotal = parseFloat(quote.grandTotal);
    const dueDate = new Date(quote.createdAt);
    dueDate.setDate(dueDate.getDate() + daysAfterIssue);

    await prisma.quotePaymentTerm.create({
      data: {
        quoteId: quote.id,
        installmentNumber: 1,
        percentage: 100,
        amount: grandTotal,
        daysAfterIssue,
        dueDate,
        description: quote.observations || `Pago a ${daysAfterIssue} días`,
      },
    });

    console.log(`  ✅ ${quote.quoteNumber} — ${daysAfterIssue} días — Bs ${grandTotal.toFixed(2)}`);
    created++;
  }

  console.log(`\nBackfill completado: ${created} registros creados.`);
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
