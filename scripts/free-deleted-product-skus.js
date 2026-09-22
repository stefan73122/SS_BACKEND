// Libera el SKU de productos que YA estaban eliminados (deletedAt IS NOT NULL)
// antes del fix en product.service.js. Sin esto, esos SKUs siguen "ocupados"
// y bloquean tanto el alta manual como la reimportación por Excel con el error
// "Ya existe un producto con el SKU ...".
//
// Corre en modo dry run (solo muestra qué haría) a menos que se pase --apply.
// Es idempotente: si se corre dos veces, los productos ya liberados se omiten.
//
// Uso:
//   node scripts/free-deleted-product-skus.js            (dry run, no escribe nada)
//   node scripts/free-deleted-product-skus.js --apply     (aplica los cambios)

const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

function freeSku(sku, id) {
  return `${sku}__del${id}`.slice(0, 50);
}

async function run() {
  const apply = process.argv.includes('--apply');

  console.log(apply ? '🚀 Modo APLICAR: se escribirán los cambios en la base de datos.\n' : '🔍 Modo DRY RUN: no se escribirá nada. Usa --apply para confirmar.\n');

  const deletedProducts = await prisma.product.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, sku: true, name: true },
    orderBy: { id: 'asc' },
  });

  const toFree = deletedProducts.filter(p => !p.sku.includes(`__del${p.id}`));

  console.log(`Productos eliminados: ${deletedProducts.length}. Con SKU aún sin liberar: ${toFree.length}.\n`);

  for (const product of toFree) {
    const newSku = freeSku(product.sku, product.id);
    console.log(`[id ${product.id}] "${product.sku}" → "${newSku}" — ${product.name}`);

    if (apply) {
      await prisma.product.update({
        where: { id: product.id },
        data: { sku: newSku },
      });
    }
  }

  console.log(`\n📊 Resumen: ${toFree.length} SKU(s) liberado(s).`);
  if (!apply) {
    console.log('\nNada fue escrito (dry run). Corre con --apply para aplicar los cambios.');
  }
}

run()
  .catch((error) => {
    console.error('❌ Error liberando SKUs:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
