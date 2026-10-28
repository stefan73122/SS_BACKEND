// Crea el permiso products.manage-prices (si no existe) y lo asigna a los roles
// "Administrador" y "JEFE DE VENTAS". Pensado para producción, donde ya no corre
// el seed: sin este permiso PUT /products/:id responde 403 al cambiar precios.
//
// Solo agrega: no borra ni modifica ningún otro permiso, rol ni asignación.
// Es idempotente: si se corre dos veces, lo que ya existe se omite.
// Si un rol no existe, lo avisa y sigue con el siguiente.
//
// Corre en modo dry run (solo muestra qué haría) a menos que se pase --apply.
//
// Uso:
//   node scripts/grant-manage-prices.js            (dry run, no escribe nada)
//   node scripts/grant-manage-prices.js --apply     (aplica los cambios)
//
// Después de aplicarlo, los usuarios afectados deben cerrar sesión y volver a
// entrar: los permisos viajan dentro del JWT y el token viejo no lo incluye.

require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const PERMISSION = {
  code: 'products.manage-prices',
  description: 'Gestionar precios de compra y venta',
  module: 'Productos',
};

const ROLE_NAMES = ['Administrador', 'JEFE DE VENTAS'];

async function run() {
  const apply = process.argv.includes('--apply');

  console.log(apply ? '🚀 Modo APLICAR: se escribirán los cambios en la base de datos.\n' : '🔍 Modo DRY RUN: no se escribirá nada. Usa --apply para confirmar.\n');

  // ── Permiso ──────────────────────────────────────────────────────────────
  let permission = await prisma.permission.findUnique({ where: { code: PERMISSION.code } });

  if (permission) {
    console.log(`✅ El permiso ${PERMISSION.code} ya existía (id ${permission.id}).\n`);
  } else if (apply) {
    permission = await prisma.permission.create({ data: PERMISSION });
    console.log(`🆕 Permiso ${PERMISSION.code} creado (id ${permission.id}).\n`);
  } else {
    console.log(`🆕 Se crearía el permiso ${PERMISSION.code}.\n`);
  }

  // ── Roles ────────────────────────────────────────────────────────────────
  const assigned = [];

  for (const roleName of ROLE_NAMES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });

    if (!role) {
      const similar = await prisma.role.findMany({
        where: { name: { contains: roleName.split(' ')[0], mode: 'insensitive' } },
        select: { name: true },
      });
      console.warn(`⚠️  El rol "${roleName}" no existe. Se omite.`);
      if (similar.length) console.warn(`   Roles parecidos: ${similar.map(r => `"${r.name}"`).join(', ')}`);
      continue;
    }

    const alreadyHas = permission && await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    });

    if (alreadyHas) {
      console.log(`✅ El rol "${roleName}" ya tenía el permiso.`);
    } else if (apply) {
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      console.log(`🆕 Permiso asignado al rol "${roleName}".`);
      assigned.push(roleName);
    } else {
      console.log(`🆕 Se asignaría el permiso al rol "${roleName}".`);
    }
  }

  console.log(apply
    ? `\nListo. Roles a los que se asignó ahora: ${assigned.length ? assigned.join(', ') : 'ninguno'}.`
    : '\nDry run terminado. Ejecuta con --apply para aplicar los cambios.');
}

run()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
