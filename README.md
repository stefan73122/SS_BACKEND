# SS_BACKEND - Sistema de Gestión

Backend API REST desarrollado con Node.js, Express y Prisma ORM para gestión de inventario, cotizaciones, clientes y usuarios.

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## 🗄️ Configuración de la Base de Datos

### 1. Instalar PostgreSQL

**Windows:**
- Descargar desde [postgresql.org](https://www.postgresql.org/download/windows/)
- Instalar con las opciones por defecto
- Recordar la contraseña del usuario `postgres`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

### 2. Crear la Base de Datos

Acceder a PostgreSQL:

```bash
# Windows (PowerShell o CMD)
psql -U postgres

# Linux/macOS
sudo -u postgres psql
```

Crear la base de datos:

```sql
CREATE DATABASE ss_backend;
\q
```

### 3. Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_NAME=ss_backend
DB_PORT=5432

# URL de conexión completa
DATABASE_URL=postgresql://postgres:tu_password_aqui@localhost:5432/ss_backend

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui

# Servidor
NODE_ENV=development
PORT=3000
```

**⚠️ IMPORTANTE:** Reemplaza `tu_password_aqui` con la contraseña que configuraste para PostgreSQL.

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Generar Cliente de Prisma

```bash
npm run prisma:generate
```

### 3. Ejecutar Migraciones

```bash
npm run prisma:migrate
```

Este comando creará todas las tablas necesarias en la base de datos.

### 4. Inicializar Datos del Sistema (IMPORTANTE)

Ejecutar el seeder para crear usuarios, roles y permisos iniciales:

```bash
node scripts/seed-initial-data.js
```

Este comando creará:
- ✅ **43 permisos** organizados por módulos
- ✅ **3 roles**: Administrador, Vendedor, Bodeguero
- ✅ **3 usuarios** con credenciales de acceso

**Credenciales creadas:**

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| **Administrador** | `admin@sistema.com` | `admin123` | Acceso completo |
| **Vendedor** | `vendedor@sistema.com` | `vendedor123` | Clientes, Cotizaciones, Proyectos |
| **Bodeguero** | `bodeguero@sistema.com` | `bodeguero123` | Productos, Inventario |

⚠️ **IMPORTANTE:** Cambia estas contraseñas después del primer login en producción.

## 🏃 Ejecutar el Servidor

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

### Modo Producción

```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 📡 Verificar la Instalación

Probar el endpoint de salud:

```bash
curl http://localhost:3000/api/auth/register -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test123\"}"
```

Si recibes un token JWT, ¡todo está funcionando correctamente! ✅

## 🗂️ Estructura del Proyecto

```
SS_BACKEND/
├── prisma/
│   └── schema.prisma          # Esquema de la base de datos
├── src/
│   ├── controllers/           # Controladores de rutas
│   ├── services/              # Lógica de negocio
│   ├── routes/                # Definición de rutas
│   ├── middlewares/           # Middlewares (auth, upload, etc.)
│   ├── utils/                 # Utilidades (serializers, etc.)
│   ├── prisma/                # Cliente de Prisma
│   └── app.js                 # Punto de entrada
├── scripts/                   # Scripts de inicialización
├── uploads/                   # Archivos temporales (Excel)
├── .env                       # Variables de entorno (NO subir a Git)
├── package.json
└── README.md
```

## 🔧 Comandos Útiles

### Prisma

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Crear y aplicar migraciones
npm run prisma:migrate

# Abrir Prisma Studio (interfaz visual)
npx prisma studio

# Resetear base de datos (⚠️ ELIMINA TODOS LOS DATOS)
npx prisma migrate reset
```

### Base de Datos

```bash
# Ver tablas en PostgreSQL
psql -U postgres -d ss_backend -c "\dt"

# Hacer backup de la base de datos
pg_dump -U postgres ss_backend > backup.sql

# Restaurar backup
psql -U postgres ss_backend < backup.sql
```

## 📚 Documentación de la API

La documentación completa de todos los endpoints está disponible en:

📄 [API_ENDPOINTS.md](./API_ENDPOINTS.md)

### Endpoints Principales

- **Autenticación:** `/api/auth`
- **Usuarios:** `/api/users`
- **Roles y Permisos:** `/api/roles`, `/api/permissions`
- **Clientes:** `/api/clients`
- **Productos:** `/api/products`
- **Proveedores:** `/api/suppliers`
- **Cotizaciones:** `/api/quotes`
- **Inventario:** `/api/inventory`
- **Importación Excel:** `/api/excel`

## 🔐 Autenticación

Todos los endpoints (excepto `/api/auth/register` y `/api/auth/login`) requieren un token JWT en el header:

```
Authorization: Bearer <tu_token_jwt>
```

## ❌ Solución de Problemas

### Error: "Cannot connect to database"

1. Verificar que PostgreSQL está corriendo:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verificar credenciales en `.env`
3. Verificar que la base de datos existe:
   ```bash
   psql -U postgres -l
   ```

### Error: "Prisma Client not found"

```bash
npm run prisma:generate
```

### Error: "Port 3000 already in use"

Cambiar el puerto en `.env`:
```env
PORT=3001
```

### Error al importar Excel

Verificar que la carpeta `uploads/` existe y tiene permisos de escritura.

## 🤝 Contribuir

1. Crear una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer commit de los cambios: `git commit -m 'Agregar nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crear un Pull Request

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👥 Contacto

Para soporte o consultas, contactar al equipo de desarrollo.

---

**Última actualización:** Febrero 2026
