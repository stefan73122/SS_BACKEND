require('dotenv').config();
const prisma = require('../src/prisma/client');
const bcrypt = require('bcrypt');

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
      // Usuarios
      { code: 'users.view', description: 'Ver usuarios', module: 'Usuarios' },
      { code: 'users.create', description: 'Crear usuarios', module: 'Usuarios' },
      { code: 'users.update', description: 'Actualizar usuarios', module: 'Usuarios' },
      { code: 'users.delete', description: 'Eliminar usuarios', module: 'Usuarios' },
      
      // Roles y Permisos
      { code: 'roles.view', description: 'Ver roles', module: 'Roles' },
      { code: 'roles.create', description: 'Crear roles', module: 'Roles' },
      { code: 'roles.update', description: 'Actualizar roles', module: 'Roles' },
      { code: 'roles.delete', description: 'Eliminar roles', module: 'Roles' },
      { code: 'roles.assign', description: 'Asignar roles a usuarios', module: 'Roles' },
      { code: 'permissions.view', description: 'Ver permisos', module: 'Permisos' },
      { code: 'permissions.create', description: 'Crear permisos', module: 'Permisos' },
      
      // Clientes
      { code: 'clients.view', description: 'Ver clientes', module: 'Clientes' },
      { code: 'clients.create', description: 'Crear clientes', module: 'Clientes' },
      { code: 'clients.update', description: 'Actualizar clientes', module: 'Clientes' },
      { code: 'clients.delete', description: 'Eliminar clientes', module: 'Clientes' },
      
      // Productos
      { code: 'products.view', description: 'Ver productos', module: 'Productos' },
      { code: 'products.create', description: 'Crear productos', module: 'Productos' },
      { code: 'products.update', description: 'Actualizar productos', module: 'Productos' },
      { code: 'products.delete', description: 'Eliminar productos', module: 'Productos' },
      { code: 'products.stock', description: 'Consultar stock', module: 'Productos' },
      
      // Proveedores
      { code: 'suppliers.view', description: 'Ver proveedores', module: 'Proveedores' },
      { code: 'suppliers.create', description: 'Crear proveedores', module: 'Proveedores' },
      { code: 'suppliers.update', description: 'Actualizar proveedores', module: 'Proveedores' },
      { code: 'suppliers.delete', description: 'Eliminar proveedores', module: 'Proveedores' },
      
      // Cotizaciones
      { code: 'quotes.view', description: 'Ver cotizaciones', module: 'Cotizaciones' },
      { code: 'quotes.create', description: 'Crear cotizaciones', module: 'Cotizaciones' },
      { code: 'quotes.update', description: 'Actualizar cotizaciones', module: 'Cotizaciones' },
      { code: 'quotes.delete', description: 'Eliminar cotizaciones', module: 'Cotizaciones' },
      { code: 'quotes.approve', description: 'Aprobar cotizaciones', module: 'Cotizaciones' },
      
      // Inventario
      { code: 'inventory.view', description: 'Ver inventario', module: 'Inventario' },
      { code: 'inventory.movements', description: 'Registrar movimientos', module: 'Inventario' },
      { code: 'inventory.transfer', description: 'Transferir stock', module: 'Inventario' },
      
      // Kits
      { code: 'kits.view', description: 'Ver kits', module: 'Kits' },
      { code: 'kits.create', description: 'Crear kits', module: 'Kits' },
      { code: 'kits.update', description: 'Actualizar kits', module: 'Kits' },
      
      // Proyectos
      { code: 'projects.view', description: 'Ver proyectos', module: 'Proyectos' },
      { code: 'projects.create', description: 'Crear proyectos', module: 'Proyectos' },
      { code: 'projects.update', description: 'Actualizar proyectos', module: 'Proyectos' },
      
      // Excel
      { code: 'excel.import', description: 'Importar desde Excel', module: 'Excel' },
      { code: 'excel.export', description: 'Exportar a Excel', module: 'Excel' },

      // Reportes
      { code: 'reports.view', description: 'Ver reportes completos', module: 'Reportes' },

      // Unidades
      { code: 'units.view', description: 'Ver unidades de medida', module: 'Unidades' },
      { code: 'units.create', description: 'Crear unidades de medida', module: 'Unidades' },
      { code: 'units.update', description: 'Actualizar unidades de medida', module: 'Unidades' },
      { code: 'units.delete', description: 'Eliminar unidades de medida', module: 'Unidades' },

      // Créditos
      { code: 'credits.view', description: 'Ver pagos a crédito', module: 'Créditos' },
      { code: 'credits.manage', description: 'Gestionar pagos a crédito', module: 'Créditos' },
      { code: 'credits.mark-paid', description: 'Marcar pagos como pagados', module: 'Créditos' },
    ];

    const createdPermissions = [];
    for (const permData of permissionsData) {
      const existing = await prisma.permission.findUnique({
        where: { code: permData.code },
      });

      if (existing) {
        createdPermissions.push(existing);
      } else {
        const permission = await prisma.permission.create({ data: permData });
        createdPermissions.push(permission);
      }
    }
    console.log(`   ✅ ${createdPermissions.length} permisos creados/verificados\n`);

    // 2. CREAR ROL ADMINISTRADOR
    console.log('👑 Creando rol Administrador...');
    let adminRole = await prisma.role.findUnique({
      where: { name: 'Administrador' },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'Administrador',
          description: 'Acceso completo al sistema',
        },
      });
      console.log('   ✅ Rol Administrador creado');
    } else {
      console.log('   ⚠️  Rol Administrador ya existe');
    }

    // Asignar TODOS los permisos al administrador
    await prisma.rolePermission.deleteMany({
      where: { roleId: adminRole.id },
    });

    for (const permission of createdPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`   ✅ ${createdPermissions.length} permisos asignados al Administrador\n`);

    // 3. CREAR ROL VENDEDOR
    console.log('💼 Creando rol Vendedor...');
    let vendedorRole = await prisma.role.findUnique({
      where: { name: 'Vendedor' },
    });

    if (!vendedorRole) {
      vendedorRole = await prisma.role.create({
        data: {
          name: 'Vendedor',
          description: 'Personal de ventas - gestiona cotizaciones, clientes y proyectos',
        },
      });
      console.log('   ✅ Rol Vendedor creado');
    } else {
      console.log('   ⚠️  Rol Vendedor ya existe');
    }

    // Asignar permisos específicos al vendedor
    const vendedorPermissions = createdPermissions.filter(p =>
      ['clients.', 'quotes.', 'products.view', 'products.stock', 'kits.', 'projects.'].some(prefix => p.code.startsWith(prefix))
    );

    await prisma.rolePermission.deleteMany({
      where: { roleId: vendedorRole.id },
    });

    for (const permission of vendedorPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: vendedorRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`   ✅ ${vendedorPermissions.length} permisos asignados al Vendedor\n`);

    // 4. CREAR ROL BODEGUERO
    console.log('📦 Creando rol Bodeguero...');
    let bodegueroRole = await prisma.role.findUnique({
      where: { name: 'Bodeguero' },
    });

    if (!bodegueroRole) {
      bodegueroRole = await prisma.role.create({
        data: {
          name: 'Bodeguero',
          description: 'Personal de bodega - gestiona inventario y productos',
        },
      });
      console.log('   ✅ Rol Bodeguero creado');
    } else {
      console.log('   ⚠️  Rol Bodeguero ya existe');
    }

    // Asignar permisos específicos al bodeguero
    const bodegueroPermissions = createdPermissions.filter(p =>
      ['products.', 'inventory.', 'suppliers.view', 'excel.'].some(prefix => p.code.startsWith(prefix))
    );

    await prisma.rolePermission.deleteMany({
      where: { roleId: bodegueroRole.id },
    });

    for (const permission of bodegueroPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: bodegueroRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`   ✅ ${bodegueroPermissions.length} permisos asignados al Bodeguero\n`);

    // 5. CREAR USUARIO ADMINISTRADOR
    console.log('👤 Creando usuario Administrador...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@sistema.com' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@sistema.com',
          passwordHash: adminPassword,
          fullName: 'Administrador del Sistema',
          isActive: true,
        },
      });
      console.log('   ✅ Usuario Administrador creado');
      console.log('   📧 Email: admin@sistema.com');
      console.log('   🔑 Password: admin123');
    } else {
      console.log('   ⚠️  Usuario Administrador ya existe');
    }

    // Asignar rol de administrador
    const adminUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
    });

    if (!adminUserRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
      console.log('   ✅ Rol Administrador asignado al usuario\n');
    }

    // 6. CREAR USUARIO VENDEDOR DE EJEMPLO
    console.log('👤 Creando usuario Vendedor de ejemplo...');
    const vendedorPassword = await bcrypt.hash('vendedor123', 10);
    
    let vendedorUser = await prisma.user.findUnique({
      where: { email: 'vendedor@sistema.com' },
    });

    if (!vendedorUser) {
      vendedorUser = await prisma.user.create({
        data: {
          username: 'vendedor',
          email: 'vendedor@sistema.com',
          passwordHash: vendedorPassword,
          fullName: 'Juan Pérez - Vendedor',
          isActive: true,
        },
      });
      console.log('   ✅ Usuario Vendedor creado');
      console.log('   📧 Email: vendedor@sistema.com');
      console.log('   🔑 Password: vendedor123');
    } else {
      console.log('   ⚠️  Usuario Vendedor ya existe');
    }

    // Asignar rol de vendedor
    const vendedorUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: vendedorUser.id,
          roleId: vendedorRole.id,
        },
      },
    });

    if (!vendedorUserRole) {
      await prisma.userRole.create({
        data: {
          userId: vendedorUser.id,
          roleId: vendedorRole.id,
        },
      });
      console.log('   ✅ Rol Vendedor asignado al usuario\n');
    }

    // 7. CREAR USUARIO BODEGUERO DE EJEMPLO
    console.log('👤 Creando usuario Bodeguero de ejemplo...');
    const bodegueroPassword = await bcrypt.hash('bodeguero123', 10);
    
    let bodegueroUser = await prisma.user.findUnique({
      where: { email: 'bodeguero@sistema.com' },
    });

    if (!bodegueroUser) {
      bodegueroUser = await prisma.user.create({
        data: {
          username: 'bodeguero',
          email: 'bodeguero@sistema.com',
          passwordHash: bodegueroPassword,
          fullName: 'Carlos López - Bodeguero',
          isActive: true,
        },
      });
      console.log('   ✅ Usuario Bodeguero creado');
      console.log('   📧 Email: bodeguero@sistema.com');
      console.log('   🔑 Password: bodeguero123');
    } else {
      console.log('   ⚠️  Usuario Bodeguero ya existe');
    }

    // Asignar rol de bodeguero
    const bodegueroUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: bodegueroUser.id,
          roleId: bodegueroRole.id,
        },
      },
    });

    if (!bodegueroUserRole) {
      await prisma.userRole.create({
        data: {
          userId: bodegueroUser.id,
          roleId: bodegueroRole.id,
        },
      });
      console.log('   ✅ Rol Bodeguero asignado al usuario\n');
    }

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEEDER COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMEN DE DATOS CREADOS:\n');
    console.log(`✅ Permisos: ${createdPermissions.length}`);
    console.log(`✅ Roles: 3 (Administrador, Vendedor, Bodeguero)`);
    console.log(`✅ Usuarios: 3\n`);
    
    console.log('👥 CREDENCIALES DE ACCESO:\n');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ ADMINISTRADOR                                       │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ Email:    admin@sistema.com                         │');
    console.log('│ Password: admin123                                  │');
    console.log('│ Permisos: TODOS                                     │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ VENDEDOR                                            │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ Email:    vendedor@sistema.com                      │');
    console.log('│ Password: vendedor123                               │');
    console.log('│ Permisos: Clientes, Cotizaciones, Proyectos, Kits  │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ BODEGUERO                                           │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ Email:    bodeguero@sistema.com                     │');
    console.log('│ Password: bodeguero123                              │');
    console.log('│ Permisos: Productos, Inventario, Excel             │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('⚠️  IMPORTANTE: Cambia estas contraseñas en producción!\n');

  } catch (error) {
    console.error('❌ Error en el seeder:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedInitialData()
  .then(() => {
    console.log('✅ Seeder finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
