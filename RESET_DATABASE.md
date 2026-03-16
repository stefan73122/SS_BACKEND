# Reset de Base de Datos

## Problema

Los IDs de las tablas no empiezan desde 1 porque hubo datos anteriores que se eliminaron, pero PostgreSQL mantiene las secuencias de autoincrement.

## Solución

Hemos creado scripts para resetear completamente la base de datos y empezar desde cero.

## Comandos Disponibles

### 1. Resetear solo la base de datos
```bash
npm run reset
```
Esto elimina todos los datos y resetea las secuencias de IDs a 1.

### 2. Resetear y ejecutar seeders
```bash
npm run reset:seed
```
Esto elimina todos los datos, resetea las secuencias y luego ejecuta el seeder para crear los datos iniciales.

### 3. Solo ejecutar seeders (sin resetear)
```bash
npm run seed
```
Ejecuta el seeder sin eliminar datos existentes (idempotente).

## Proceso de Reset Completo

### En desarrollo local:

1. **Resetear y sembrar datos**:
   ```bash
   npm run reset:seed
   ```

2. Los IDs ahora empezarán desde 1:
   - Usuarios: ID 1, 2, 3
   - Roles: ID 1, 2, 3
   - Permisos: ID 1, 2, 3...

### En producción (Render):

⚠️ **CUIDADO**: Esto eliminará TODOS los datos de producción.

1. Accede a la consola de Render o usa una conexión directa a la base de datos
2. Ejecuta manualmente:
   ```bash
   npm run reset:seed
   ```

O puedes hacerlo desde tu máquina local conectándote a la base de datos de producción:
```bash
DATABASE_URL="[URL_DE_PRODUCCION]" npm run reset:seed
```

## ⚠️ Advertencias

- **`npm run reset`** elimina TODOS los datos de la base de datos
- **No hay forma de deshacer** esta operación
- Asegúrate de hacer backup si tienes datos importantes
- En producción, coordina con el equipo antes de ejecutar

## Datos que se crean con el seeder

Después de ejecutar `npm run reset:seed`, tendrás:

### Usuarios (IDs 1-3):
- **ID 1**: admin@sistema.com / admin123 (Administrador)
- **ID 2**: vendedor@sistema.com / vendedor123 (Vendedor)
- **ID 3**: bodeguero@sistema.com / bodeguero123 (Bodeguero)

### Roles (IDs 1-3):
- **ID 1**: Administrador (41 permisos)
- **ID 2**: Vendedor (17 permisos)
- **ID 3**: Bodeguero (11 permisos)

### Permisos (IDs 1-41):
- Todos los permisos del sistema organizados por módulo
