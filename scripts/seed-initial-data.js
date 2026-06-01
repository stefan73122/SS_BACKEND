require('dotenv').config();
const prisma = require('../src/prisma/client');
const bcrypt = require('bcryptjs');

async function seedInitialData() {
  try {
    console.log('🌱 Iniciando seeder de datos iniciales...\n');

    // 1. CREAR UNIDADES
    console.log('📏 Creando unidades de medida...');
    const unitsData = [
      { code: 'PZA', name: 'Pieza' },
      { code: 'MTR', name: 'Metro' },
      { code: 'LTR', name: 'Litro' },
      { code: 'KG', name: 'Kilogramo' },
      { code: 'GR', name: 'Gramo' },
      { code: 'M2', name: 'Metro Cuadrado' },
      { code: 'M3', name: 'Metro Cúbico' },
      { code: 'PAR', name: 'Par' },
      { code: 'SET', name: 'Set' },
      { code: 'CAJA', name: 'Caja' },
      { code: 'PAQUETE', name: 'Paquete' },
      { code: 'ROLLO', name: 'Rollo' },
    ];

    for (const unitData of unitsData) {
      await prisma.unit.upsert({
        where: { code: unitData.code },
        update: {},
        create: unitData,
      });
    }
    console.log(`✅ ${unitsData.length} unidades creadas\n`);

    // 2. CREAR PERMISOS
    console.log('📝 Creando permisos...');
    const permissionsData = [
      // ── Usuarios ──────────────────────────────────────────────────────────
      { code: 'users.view',   description: 'Ver usuarios',           module: 'Usuarios' },
      { code: 'users.create', description: 'Crear usuarios',         module: 'Usuarios' },
      { code: 'users.update', description: 'Actualizar usuarios',    module: 'Usuarios' },
      { code: 'users.delete', description: 'Eliminar usuarios',      module: 'Usuarios' },

      // ── Roles ─────────────────────────────────────────────────────────────
      { code: 'roles.view',   description: 'Ver roles',              module: 'Roles' },
      { code: 'roles.create', description: 'Crear roles',            module: 'Roles' },
      { code: 'roles.update', description: 'Actualizar roles',       module: 'Roles' },
      { code: 'roles.delete', description: 'Eliminar roles',         module: 'Roles' },
      { code: 'roles.assign', description: 'Asignar roles a usuarios', module: 'Roles' },

      // ── Permisos ──────────────────────────────────────────────────────────
      { code: 'permissions.view',   description: 'Ver permisos',        module: 'Permisos' },
      { code: 'permissions.create', description: 'Crear permisos',      module: 'Permisos' },
      { code: 'permissions.update', description: 'Actualizar permisos', module: 'Permisos' },
      { code: 'permissions.delete', description: 'Eliminar permisos',   module: 'Permisos' },

      // ── Clientes ──────────────────────────────────────────────────────────
      { code: 'clients.view',   description: 'Ver clientes',         module: 'Clientes' },
      { code: 'clients.create', description: 'Crear clientes',       module: 'Clientes' },
      { code: 'clients.update', description: 'Actualizar clientes',  module: 'Clientes' },
      { code: 'clients.delete', description: 'Eliminar clientes',    module: 'Clientes' },

      // ── Productos ─────────────────────────────────────────────────────────
      { code: 'products.view',   description: 'Ver productos',        module: 'Productos' },
      { code: 'products.create', description: 'Crear productos',      module: 'Productos' },
      { code: 'products.update', description: 'Actualizar productos', module: 'Productos' },
      { code: 'products.delete', description: 'Eliminar productos',   module: 'Productos' },
      { code: 'products.stock',  description: 'Consultar stock de productos', module: 'Productos' },

      // ── Categorías ────────────────────────────────────────────────────────
      { code: 'categories.view',   description: 'Ver categorías',        module: 'Categorías' },
      { code: 'categories.create', description: 'Crear categorías',      module: 'Categorías' },
      { code: 'categories.update', description: 'Actualizar categorías', module: 'Categorías' },
      { code: 'categories.delete', description: 'Eliminar categorías',   module: 'Categorías' },

      // ── Unidades de medida ────────────────────────────────────────────────
      { code: 'units.view',   description: 'Ver unidades de medida',        module: 'Unidades' },
      { code: 'units.create', description: 'Crear unidades de medida',      module: 'Unidades' },
      { code: 'units.update', description: 'Actualizar unidades de medida', module: 'Unidades' },
      { code: 'units.delete', description: 'Eliminar unidades de medida',   module: 'Unidades' },

      // ── Proveedores ───────────────────────────────────────────────────────
      { code: 'suppliers.view',   description: 'Ver proveedores',        module: 'Proveedores' },
      { code: 'suppliers.create', description: 'Crear proveedores',      module: 'Proveedores' },
      { code: 'suppliers.update', description: 'Actualizar proveedores', module: 'Proveedores' },
      { code: 'suppliers.delete', description: 'Eliminar proveedores',   module: 'Proveedores' },

      // ── Almacenes ─────────────────────────────────────────────────────────
      { code: 'warehouses.view',   description: 'Ver almacenes',        module: 'Almacenes' },
      { code: 'warehouses.create', description: 'Crear almacenes',      module: 'Almacenes' },
      { code: 'warehouses.update', description: 'Actualizar almacenes', module: 'Almacenes' },
      { code: 'warehouses.delete', description: 'Eliminar almacenes',   module: 'Almacenes' },

      // ── Inventario ────────────────────────────────────────────────────────
      { code: 'inventory.view',           description: 'Ver inventario general',              module: 'Inventario' },
      { code: 'inventory.view-movements', description: 'Ver historial de movimientos',        module: 'Inventario' },
      { code: 'inventory.view-low-stock', description: 'Ver productos con stock bajo',        module: 'Inventario' },
      { code: 'inventory.movements',      description: 'Registrar movimientos de inventario', module: 'Inventario' },
      { code: 'inventory.transfer',       description: 'Transferir stock entre almacenes',    module: 'Inventario' },

      // ── Cotizaciones ──────────────────────────────────────────────────────
      { code: 'quotes.view',         description: 'Ver cotizaciones',                module: 'Cotizaciones' },
      { code: 'quotes.create',       description: 'Crear cotizaciones',              module: 'Cotizaciones' },
      { code: 'quotes.update',       description: 'Actualizar cotizaciones',         module: 'Cotizaciones' },
      { code: 'quotes.delete',       description: 'Eliminar cotizaciones',           module: 'Cotizaciones' },
      { code: 'quotes.approve',      description: 'Aprobar cotizaciones',            module: 'Cotizaciones' },
      { code: 'quotes.update-price', description: 'Actualizar precio de ítems',     module: 'Cotizaciones' },

      // ── Servicios ─────────────────────────────────────────────────────────
      { code: 'services.view',   description: 'Ver servicios',        module: 'Servicios' },
      { code: 'services.create', description: 'Crear servicios',      module: 'Servicios' },
      { code: 'services.update', description: 'Actualizar servicios', module: 'Servicios' },
      { code: 'services.delete', description: 'Eliminar servicios',   module: 'Servicios' },

      // ── Cotizaciones de Servicio ──────────────────────────────────────────
      { code: 'service-quotes.view',   description: 'Ver cotizaciones de servicio',        module: 'Cotizaciones de Servicio' },
      { code: 'service-quotes.create', description: 'Crear cotizaciones de servicio',      module: 'Cotizaciones de Servicio' },
      { code: 'service-quotes.update', description: 'Actualizar cotizaciones de servicio', module: 'Cotizaciones de Servicio' },
      { code: 'service-quotes.delete', description: 'Eliminar cotizaciones de servicio',   module: 'Cotizaciones de Servicio' },

      // ── Kits ──────────────────────────────────────────────────────────────
      { code: 'kits.view',   description: 'Ver kits',        module: 'Kits' },
      { code: 'kits.create', description: 'Crear kits',      module: 'Kits' },
      { code: 'kits.update', description: 'Actualizar kits', module: 'Kits' },
      { code: 'kits.delete', description: 'Eliminar kits',   module: 'Kits' },

      // ── Proyectos ─────────────────────────────────────────────────────────
      { code: 'projects.view',   description: 'Ver proyectos',        module: 'Proyectos' },
      { code: 'projects.create', description: 'Crear proyectos',      module: 'Proyectos' },
      { code: 'projects.update', description: 'Actualizar proyectos', module: 'Proyectos' },
      { code: 'projects.delete', description: 'Eliminar proyectos',   module: 'Proyectos' },

      // ── Importación / Exportación Excel ───────────────────────────────────
      { code: 'excel.import', description: 'Importar datos desde Excel', module: 'Excel' },
      { code: 'excel.export', description: 'Exportar datos a Excel',     module: 'Excel' },

      // ── Reportes ──────────────────────────────────────────────────────────
      { code: 'reports.view',       description: 'Ver todos los reportes',                    module: 'Reportes' },
      { code: 'reports.sales',      description: 'Ver reporte de ventas',                     module: 'Reportes' },
      { code: 'reports.employees',  description: 'Ver reporte de empleados',                  module: 'Reportes' },
      { code: 'reports.inventory',  description: 'Ver reporte de movimientos de inventario',  module: 'Reportes' },
      { code: 'reports.products',   description: 'Ver reporte de actividad de productos',     module: 'Reportes' },
      { code: 'reports.warehouses', description: 'Ver reporte de productos por almacén',      module: 'Reportes' },

      // ── Créditos ──────────────────────────────────────────────────────────
      { code: 'credits.view',      description: 'Ver pagos a crédito',         module: 'Créditos' },
      { code: 'credits.manage',    description: 'Gestionar pagos a crédito',   module: 'Créditos' },
      { code: 'credits.mark-paid', description: 'Marcar pagos como pagados',   module: 'Créditos' },

      // ── Punto de Venta ────────────────────────────────────────────────────
      { code: 'pos.access',         description: 'Acceder al punto de venta',  module: 'Punto de Venta' },
      { code: 'pos.create-sale',    description: 'Crear ventas',               module: 'Punto de Venta' },
      { code: 'pos.view-sales',     description: 'Ver historial de ventas',    module: 'Punto de Venta' },
      { code: 'pos.cancel-sale',    description: 'Cancelar ventas',            module: 'Punto de Venta' },
      { code: 'pos.apply-discount', description: 'Aplicar descuentos',         module: 'Punto de Venta' },
      { code: 'pos.refund',         description: 'Realizar devoluciones',      module: 'Punto de Venta' },
      { code: 'pos.close-cash',     description: 'Cerrar caja',                module: 'Punto de Venta' },
      { code: 'pos.view-reports',   description: 'Ver reportes de caja',       module: 'Punto de Venta' },
    ];

    const createdPermissions = [];
    for (const permData of permissionsData) {
      const permission = await prisma.permission.upsert({
        where: { code: permData.code },
        update: { description: permData.description, module: permData.module },
        create: permData,
      });
      createdPermissions.push(permission);
    }
    console.log(`   ✅ ${createdPermissions.length} permisos creados/actualizados\n`);

    // Helper para filtrar permisos por prefijos
    const filterByPrefixes = (prefixes) =>
      createdPermissions.filter(p => prefixes.some(prefix => p.code === prefix || p.code.startsWith(prefix)));

    // ── ROL ADMINISTRADOR ──────────────────────────────────────────────────
    console.log('👑 Creando rol Administrador...');
    let adminRole = await prisma.role.upsert({
      where: { name: 'Administrador' },
      update: { description: 'Acceso completo al sistema' },
      create: { name: 'Administrador', description: 'Acceso completo al sistema' },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    for (const permission of createdPermissions) {
      await prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: permission.id } });
    }
    console.log(`   ✅ ${createdPermissions.length} permisos asignados al Administrador\n`);

    // ── ROL VENDEDOR ───────────────────────────────────────────────────────
    console.log('💼 Creando rol Vendedor...');
    let vendedorRole = await prisma.role.upsert({
      where: { name: 'Vendedor' },
      update: { description: 'Personal de ventas — gestiona cotizaciones, clientes y proyectos' },
      create: { name: 'Vendedor', description: 'Personal de ventas — gestiona cotizaciones, clientes y proyectos' },
    });

    // Permisos del Vendedor — solo lo justo y lógico para su rol
    const vendedorCodes = [
      // Clientes: puede registrar y actualizar, NO eliminar
      'clients.view',
      'clients.create',
      'clients.update',

      // Cotizaciones: crea y gestiona las suyas, NO borra ni cambia precios base
      'quotes.view',
      'quotes.create',
      'quotes.update',
      'quotes.approve',

      // Cotizaciones de servicio: igual que cotizaciones normales
      'service-quotes.view',
      'service-quotes.create',
      'service-quotes.update',

      // Productos: solo consulta — no gestiona inventario
      'products.view',
      'products.stock',

      // Kits: solo ver para armar cotizaciones — no los administra
      'kits.view',

      // Servicios: solo ver para agregar a cotizaciones
      'services.view',

      // Proyectos: puede crear y actualizar proyectos de sus clientes, NO eliminar
      'projects.view',
      'projects.create',
      'projects.update',

      // Inventario: solo ver para saber disponibilidad, NO registrar movimientos
      'inventory.view',

      // Categorías y unidades: solo ver, para navegar y armar cotizaciones
      'categories.view',
      'units.view',

      // Punto de Venta: opera caja pero NO cierra caja, NO hace devoluciones, NO cancela ventas
      'pos.access',
      'pos.create-sale',
      'pos.view-sales',
      'pos.apply-discount',
      'pos.view-reports',

      // Créditos: solo consulta si un cliente tiene crédito pendiente
      'credits.view',

      // Reportes: solo sus propias ventas
      'reports.sales',
    ];
    const vendedorPermissions = createdPermissions.filter(p => vendedorCodes.includes(p.code));

    await prisma.rolePermission.deleteMany({ where: { roleId: vendedorRole.id } });
    for (const permission of vendedorPermissions) {
      await prisma.rolePermission.create({ data: { roleId: vendedorRole.id, permissionId: permission.id } });
    }
    console.log(`   ✅ ${vendedorPermissions.length} permisos asignados al Vendedor\n`);

    // ── ROL BODEGUERO ──────────────────────────────────────────────────────
    console.log('📦 Creando rol Bodeguero...');
    let bodegueroRole = await prisma.role.upsert({
      where: { name: 'Bodeguero' },
      update: { description: 'Personal de bodega — gestiona inventario, almacenes y productos' },
      create: { name: 'Bodeguero', description: 'Personal de bodega — gestiona inventario, almacenes y productos' },
    });

    const bodegueroPrefixes = [
      'products.',
      'categories.view',
      'units.view',
      'suppliers.',
      'warehouses.',
      'inventory.',
      'excel.',
      'reports.inventory',
      'reports.warehouses',
      'reports.products',
    ];
    const bodegueroPermissions = filterByPrefixes(bodegueroPrefixes);

    await prisma.rolePermission.deleteMany({ where: { roleId: bodegueroRole.id } });
    for (const permission of bodegueroPermissions) {
      await prisma.rolePermission.create({ data: { roleId: bodegueroRole.id, permissionId: permission.id } });
    }
    console.log(`   ✅ ${bodegueroPermissions.length} permisos asignados al Bodeguero\n`);

    // ── USUARIOS DE EJEMPLO ────────────────────────────────────────────────
    const usersToCreate = [
      {
        username: 'admin',
        email: 'admin@sistema.com',
        password: 'admin123',
        fullName: 'Administrador del Sistema',
        role: adminRole,
        roleLabel: 'Administrador',
      },
      {
        username: 'vendedor',
        email: 'vendedor@sistema.com',
        password: 'vendedor123',
        fullName: 'Juan Pérez — Vendedor',
        role: vendedorRole,
        roleLabel: 'Vendedor',
      },
      {
        username: 'bodeguero',
        email: 'bodeguero@sistema.com',
        password: 'bodeguero123',
        fullName: 'Carlos López — Bodeguero',
        role: bodegueroRole,
        roleLabel: 'Bodeguero',
      },
    ];

    for (const u of usersToCreate) {
      console.log(`👤 Creando usuario ${u.roleLabel}...`);
      const hash = await bcrypt.hash(u.password, 10);

      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          username: u.username,
          email: u.email,
          passwordHash: hash,
          fullName: u.fullName,
          isActive: true,
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: u.role.id } },
        update: {},
        create: { userId: user.id, roleId: u.role.id },
      });

      console.log(`   ✅ Usuario creado/verificado`);
      console.log(`   📧 Email:    ${u.email}`);
      console.log(`   🔑 Password: ${u.password}\n`);
    }

    // ── RESUMEN ────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEEDER COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n✅ Permisos:  ${createdPermissions.length}`);
    console.log(`✅ Roles:     3 (Administrador, Vendedor, Bodeguero)`);
    console.log(`✅ Usuarios:  3\n`);

    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ ADMINISTRADOR  admin@sistema.com / admin123         │');
    console.log('│ VENDEDOR       vendedor@sistema.com / vendedor123   │');
    console.log('│ BODEGUERO      bodeguero@sistema.com / bodeguero123 │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('\n⚠️  Cambia estas contraseñas en producción!\n');

  } catch (error) {
    console.error('❌ Error en el seeder:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedInitialData()
  .then(() => console.log('✅ Seeder finalizado correctamente'))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exitCode = 1;
  });
