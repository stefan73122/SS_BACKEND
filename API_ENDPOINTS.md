# API Endpoints Documentation

Base URL: `http://localhost:3000/api`

Todos los endpoints (excepto `/auth`) requieren autenticación mediante JWT en el header:
```
Authorization: Bearer <token>
```

---

## 🔐 Autenticación

### Registrar Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Respuesta exitosa (201):**
```json
{
  "user": {
    "id": "1",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Iniciar Sesión
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": "1",
    "email": "admin@sistema.com",
    "username": "admin",
    "fullName": "Administrador del Sistema",
    "roles": ["Administrador"],
    "permissions": ["users:create", "users:read", "users:update", "users:delete", "roles:manage", "permissions:manage"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Nota:** El token ahora incluye roles y permisos del usuario, con duración de 7 días.

### Ver Perfil
```http
GET /api/profile
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "message": "Perfil del usuario",
  "userId": "1"
}
```

---

## 👥 Clientes

### Listar Clientes
```http
GET /api/clients?page=1&limit=10&search=nombre&clientType=REGULAR
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 10)
- `search` (opcional): Buscar por nombre, número de documento o email
- `clientType` (opcional): Filtrar por tipo (REGULAR, PREFERENCIAL, CORPORATIVO)

### Obtener Cliente por ID
```http
GET /api/clients/:id
```

### Crear Cliente
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Empresa ABC S.A.",
  "documentType": "RUT",
  "documentNum": "76123456-7",
  "email": "contacto@empresaabc.com",
  "phone": "+56912345678",
  "address": "Av. Providencia 1234, Oficina 501",
  "city": "Santiago",
  "country": "Chile",
  "clientType": "CORPORATIVO",
  "discountPercent": 10.00,
  "creditEnabled": true,
  "creditDays": 30,
  "creditMarkupPercent": 15.00,
  "isActive": true
}
```

**Campos:**
- `name` (requerido): Nombre del cliente
- `documentType` (opcional): Tipo de documento (RUT, DNI, PASAPORTE, etc.)
- `documentNum` (opcional): Número de documento
- `email` (opcional): Email de contacto
- `phone` (opcional): Teléfono
- `address` (opcional): Dirección
- `city` (opcional): Ciudad
- `country` (opcional): País
- `clientType` (opcional): Tipo de cliente (REGULAR, PREFERENCIAL, CORPORATIVO) - default: REGULAR
- `discountPercent` (opcional): Porcentaje de descuento - default: 0
- `creditEnabled` (opcional): Habilitar crédito - default: false
- `creditDays` (opcional): Días de crédito - default: 60
- `creditMarkupPercent` (opcional): Recargo por crédito - default: 15.00
- `isActive` (opcional): Estado activo - default: true

### Actualizar Cliente
```http
PUT /api/clients/:id
Content-Type: application/json

{
  "name": "Empresa ABC S.A. - Actualizada",
  "phone": "+56987654321",
  "discountPercent": 15.00,
  "creditEnabled": true
}
```

### Eliminar Cliente
```http
DELETE /api/clients/:id
```

---

## � Categorías de Productos

### Listar Categorías
```http
GET /api/categories?page=1&limit=10&search=electr
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 10)
- `search` (opcional): Buscar por nombre o descripción

**Respuesta exitosa (200):**
```json
{
  "categories": [
    {
      "id": "1",
      "name": "Electrónica",
      "description": "Productos electrónicos y componentes",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "_count": {
        "products": 45
      }
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Obtener Categoría por ID
```http
GET /api/categories/:id
```

**Respuesta exitosa (200):**
```json
{
  "id": "1",
  "name": "Electrónica",
  "description": "Productos electrónicos y componentes",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "products": [
    {
      "id": "1",
      "name": "Cable UTP Cat6",
      "sku": "CAB-001"
    }
  ],
  "_count": {
    "products": 45
  }
}
```

### Crear Categoría
```http
POST /api/categories
Content-Type: application/json

{
  "name": "Herramientas",
  "description": "Herramientas manuales y eléctricas"
}
```

**Campos:**
- `name` (requerido): Nombre único de la categoría
- `description` (opcional): Descripción de la categoría

**Respuesta exitosa (201):**
```json
{
  "id": "2",
  "name": "Herramientas",
  "description": "Herramientas manuales y eléctricas",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### Actualizar Categoría
```http
PUT /api/categories/:id
Content-Type: application/json

{
  "name": "Herramientas Profesionales",
  "description": "Herramientas manuales y eléctricas de grado profesional"
}
```

### Eliminar Categoría
```http
DELETE /api/categories/:id
```

**Nota:** No se puede eliminar una categoría que tiene productos asociados.

**Respuesta exitosa (200):**
```json
{
  "message": "Categoría eliminada exitosamente"
}
```

**Error (400):**
```json
{
  "error": "No se puede eliminar la categoría porque tiene 15 producto(s) asociado(s)"
}
```

---

## �📦 Productos

### Listar Productos
```http
GET /api/products?page=1&limit=10&search=cable&categoryId=1
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por nombre, SKU o descripción
- `categoryId` (opcional): Filtrar por categoría

### Obtener Producto por ID
```http
GET /api/products/:id
```

### Obtener Stock de Producto
```http
GET /api/products/:id/stock
```

### Crear Producto
```http
POST /api/products
Content-Type: application/json

{
  "name": "Cable UTP Cat6",
  "sku": "CAB-UTP-CAT6",
  "description": "Cable de red categoría 6",
  "categoryId": 1,
  "unitId": 1,
  "costPrice": 5000,
  "salePrice": 8000,
  "minStock": 50
}
```

### Actualizar Producto
```http
PUT /api/products/:id
Content-Type: application/json

{
  "salePrice": 8500,
  "minStock": 100
}
```

### Eliminar Producto
```http
DELETE /api/products/:id
```

---

## 🏢 Proveedores

### Listar Proveedores
```http
GET /api/suppliers?page=1&limit=10&search=proveedor
```

### Obtener Proveedor por ID
```http
GET /api/suppliers/:id
```

### Crear Proveedor
```http
POST /api/suppliers
Content-Type: application/json

{
  "name": "Proveedor XYZ",
  "rut": "98765432-1",
  "email": "ventas@proveedor.com",
  "phone": "+56912345678",
  "address": "Av. Principal 456",
  "contactPerson": "María González"
}
```

### Actualizar Proveedor
```http
PUT /api/suppliers/:id
Content-Type: application/json

{
  "phone": "+56987654321"
}
```

### Eliminar Proveedor
```http
DELETE /api/suppliers/:id
```

---

## 💰 Cotizaciones

### Listar Cotizaciones
```http
GET /api/quotes?page=1&limit=10&search=COT&status=ENVIADA&clientId=1&quoteType=PRODUCTOS
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por número de cotización o nombre de cliente
- `status` (opcional): Filtrar por estado (PENDIENTE, ENVIADA, APROBADA, RECHAZADA, VENCIDA)
- `clientId` (opcional): Filtrar por cliente
- `quoteType` (opcional): Filtrar por tipo (PRODUCTOS, SERVICIOS)

### Obtener Cotización por ID
```http
GET /api/quotes/:id
```

### Verificar Stock de Cotización
```http
GET /api/quotes/:id/check-stock
```

### Crear Cotización de Productos/Herramientas
```http
POST /api/quotes
Content-Type: application/json
Authorization: Bearer <token>

{
  "clientId": "1",
  "quoteType": "PRODUCTOS",
  "paymentType": "CONTADO",
  "validUntil": "2026-03-01",
  "notes": "Cotización para proyecto X",
  "discount": 10,
  "items": [
    {
      "productId": "123",
      "itemType": "PRODUCT",
      "description": "Cable UTP Cat6",
      "quantity": 100,
      "unitPrice": 2.50
    },
    {
      "productId": "456",
      "itemType": "PRODUCT",
      "description": "Conectores RJ45",
      "quantity": 200,
      "unitPrice": 0.50
    }
  ]
}
```

### Crear Cotización de Servicios
```http
POST /api/quotes
Content-Type: application/json
Authorization: Bearer <token>

{
  "clientId": "1",
  "quoteType": "SERVICIOS",
  "paymentType": "CREDITO",
  "validUntil": "2026-03-01",
  "notes": "Cotización de servicios técnicos",
  "discount": 5,
  "items": [
    {
      "itemType": "SERVICE",
      "description": "Instalación de sistema eléctrico",
      "quantity": 1,
      "unitPrice": 500.00
    },
    {
      "itemType": "SERVICE",
      "description": "Mantenimiento preventivo anual",
      "quantity": 1,
      "unitPrice": 300.00
    }
  ]
}
```

**Campos:**
- `clientId` (requerido): ID del cliente
- `quoteType` (opcional): Tipo de cotización - PRODUCTOS (default) o SERVICIOS
- `paymentType` (opcional): Tipo de pago - CONTADO (default) o CREDITO
- `validUntil` (opcional): Fecha de validez
- `notes` (opcional): Observaciones
- `discount` (opcional): Porcentaje de descuento
- `items` (requerido): Array de items

**Tipos de Items:**
- `PRODUCT` - Producto físico (requiere productId)
- `SERVICE` - Servicio (no requiere productId)
- `KIT` - Kit de productos

**Tipos de Cotización:**
- `PRODUCTOS` - Cotización de productos/herramientas (default)
- `SERVICIOS` - Cotización de servicios

### Actualizar Cotización
```http
PUT /api/quotes/:id
Content-Type: application/json

{
  "status": "ENVIADA",
  "quoteType": "SERVICIOS",
  "discount": 15,
  "items": [...]
}
```

### Eliminar Cotización
```http
DELETE /api/quotes/:id
```

---

## � Movimientos de Inventario

### Listar Movimientos
```http
GET /api/movements?page=1&limit=10&search=cable&type=INGRESO&reason=COMPRA&warehouseId=1&productId=1&startDate=2024-01-01&endDate=2024-12-31
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por producto, almacén o notas
- `type` (opcional): `INGRESO`, `EGRESO`, `AJUSTE`
- `reason` (opcional): `COMPRA`, `VENTA`, `TRANSFERENCIA`, `AJUSTE_MANUAL`, `PROYECTO`, `DEVOLUCION`
- `productId` (opcional): Filtrar por producto
- `warehouseId` (opcional): Filtrar por almacén
- `startDate` (opcional): Fecha inicio (ISO 8601)
- `endDate` (opcional): Fecha fin (ISO 8601)

**Respuesta exitosa (200):**
```json
{
  "movements": [
    {
      "id": "1",
      "type": "INGRESO",
      "reason": "COMPRA",
      "quantity": 100,
      "notes": "Compra a proveedor XYZ",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "product": {
        "id": "1",
        "sku": "P001",
        "name": "Cable UTP Cat6",
        "category": { "id": "1", "name": "Cables" },
        "unit": { "id": "1", "code": "MT", "name": "Metro" }
      },
      "warehouse": {
        "id": "1",
        "code": "SLEN",
        "name": "Almacén Principal"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Obtener Movimiento por ID
```http
GET /api/movements/:id
```

### Resumen de Movimientos
```http
GET /api/movements/summary?startDate=2024-01-01&endDate=2024-12-31&warehouseId=1
```

**Respuesta exitosa (200):**
```json
{
  "summary": {
    "ingresos": { "count": 25, "totalQuantity": 1500 },
    "egresos": { "count": 10, "totalQuantity": 300 },
    "transferencias": { "count": 5 },
    "ajustes": { "count": 2 }
  },
  "recentMovements": [...]
}
```

### Crear Movimiento
```http
POST /api/movements
Content-Type: application/json
Authorization: Bearer <token>

{
  "productId": 1,
  "warehouseId": 1,
  "type": "INGRESO",
  "reason": "COMPRA",
  "quantity": 100,
  "notes": "Compra a proveedor XYZ"
}
```

**Permiso Requerido:** `inventory.movements`

**Tipos de Movimiento:**
- `INGRESO`: Entrada de stock
- `EGRESO`: Salida de stock
- `AJUSTE`: Ajuste manual de inventario

**Razones:**
- `COMPRA`: Compra a proveedor
- `VENTA`: Venta directa
- `TRANSFERENCIA`: Transferencia entre almacenes (generado automáticamente)
- `PROYECTO`: Uso en proyecto
- `KIT`: Armado de kit
- `DEVOLUCION`: Devolución
- `AJUSTE_MANUAL`: Ajuste manual
- `SERVICIO`: Uso en servicio

---

## � Inventario

### Obtener Inventario Completo
```http
GET /api/inventory?page=1&limit=10&search=cable&categoryId=1&warehouseId=2&lowStockOnly=false
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 10)
- `search` (opcional): Buscar por SKU o nombre de producto
- `categoryId` (opcional): Filtrar por categoría
- `warehouseId` (opcional): Filtrar por almacén específico
- `lowStockOnly` (opcional): Solo productos con stock bajo (true/false)

**Respuesta exitosa (200):**
```json
{
  "inventory": [
    {
      "id": "1",
      "sku": "P001",
      "name": "Cable UTP Cat6",
      "description": "Cable de red categoría 6",
      "costPrice": 25.50,
      "salePrice": 35.00,
      "brand": "Nexxt",
      "origin": "China",
      "manufacturerCode": "CAT6-305M",
      "minStockGlobal": 50,
      "totalStock": 150,
      "isLowStock": false,
      "category": {
        "id": "1",
        "name": "Cables"
      },
      "supplier": {
        "id": "1",
        "name": "Distribuidora Tech"
      },
      "unit": {
        "id": "1",
        "code": "MT",
        "name": "Metro"
      },
      "stockByWarehouse": [
        {
          "warehouseId": "1",
          "warehouseCode": "SLEN",
          "warehouseName": "Almacén Principal",
          "quantity": 100
        },
        {
          "warehouseId": "2",
          "warehouseCode": "BODEGA2",
          "warehouseName": "Bodega Secundaria",
          "quantity": 50
        }
      ]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Características:**
- ✅ Muestra stock total por producto
- ✅ Detalla stock por cada almacén
- ✅ Incluye precios de costo y venta
- ✅ Indica si el producto tiene stock bajo
- ✅ Incluye información de categoría, proveedor y unidad
- ✅ Permite filtrar por almacén específico
- ✅ Búsqueda por SKU o nombre

### Listar Almacenes
```http
GET /api/inventory/warehouses
```

### Obtener Almacén por ID
```http
GET /api/inventory/warehouses/:id
```

### Listar Movimientos
```http
GET /api/inventory/movements?page=1&limit=10&productId=1&warehouseId=1&type=INGRESO
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `productId` (opcional): Filtrar por producto
- `warehouseId` (opcional): Filtrar por almacén
- `type` (opcional): Filtrar por tipo (INGRESO, EGRESO, TRANSFERENCIA, AJUSTE)

### Obtener Productos con Stock Bajo
```http
GET /api/inventory/low-stock
```

### Crear Movimiento de Inventario
```http
POST /api/inventory/movements
Content-Type: application/json

{
  "productId": 1,
  "warehouseId": 1,
  "type": "INGRESO",
  "reason": "COMPRA",
  "quantity": 100,
  "notes": "Compra a proveedor XYZ",
  "referenceId": null
}
```

**Tipos de Movimiento:**
- `INGRESO`: Entrada de stock
- `EGRESO`: Salida de stock
- `TRANSFERENCIA`: Transferencia entre almacenes
- `AJUSTE`: Ajuste manual

**Razones:**
- `COMPRA`: Compra a proveedor
- `PROYECTO`: Uso en proyecto
- `KIT`: Armado de kit
- `DEVOLUCION`: Devolución
- `AJUSTE_MANUAL`: Ajuste manual
- `VENTA`: Venta directa
- `SERVICIO`: Uso en servicio

### Transferir Stock entre Almacenes
```http
POST /api/inventory/transfer
Content-Type: application/json
Authorization: Bearer <token>

{
  "productId": 1,
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "quantity": 50,
  "notes": "Transferencia para proyecto"
}
```

**Permiso Requerido:** `inventory.transfer`

**Respuesta exitosa (200):**
```json
{
  "message": "Transferencia realizada exitosamente"
}
```

**Características:**
- ✅ Requiere permiso específico `inventory.transfer`
- ✅ Genera 2 movimientos automáticamente:
  - EGRESO del almacén origen (con cantidad negativa)
  - INGRESO al almacén destino (con cantidad positiva)
- ✅ Actualiza stock en ambos almacenes en una transacción
- ✅ Valida que haya stock suficiente en origen
- ✅ Los movimientos aparecen en reportes con reason: "TRANSFERENCIA"
- ✅ Permite agregar notas para trazabilidad

**Errores:**
- `400`: Stock insuficiente en almacén origen
- `400`: Almacenes de origen y destino son iguales
- `403`: Usuario no tiene permiso `inventory.transfer`
- `404`: Producto o almacén no encontrado

---

## 🏢 Almacenes (Warehouses)

### Listar Almacenes
```http
GET /api/inventory/warehouses?page=1&limit=10&search=principal
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por nombre o ubicación

**Respuesta exitosa (200):**
```json
{
  "warehouses": [
    {
      "id": "1",
      "name": "Almacén Principal",
      "location": "Bodega Central, Piso 1",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Obtener Almacén por ID
```http
GET /api/inventory/warehouses/:id
```

**Respuesta exitosa (200):**
```json
{
  "id": "1",
  "name": "Almacén Principal",
  "location": "Bodega Central, Piso 1",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "stocks": [
    {
      "id": "1",
      "productId": "1",
      "quantity": 100,
      "product": {
        "id": "1",
        "name": "Cable UTP Cat6",
        "sku": "CAB-001"
      }
    }
  ]
}
```

### Crear Almacén
```http
POST /api/inventory/warehouses
Content-Type: application/json

{
  "code": "ALM-02",
  "name": "Almacén Sucursal Norte",
  "description": "Almacén ubicado en sucursal norte",
  "type": "SUCURSAL",
  "isActive": true
}
```

**Campos:**
- `code` (requerido): Código único del almacén
- `name` (requerido): Nombre del almacén
- `description` (opcional): Descripción
- `type` (opcional): Tipo de almacén (`PRINCIPAL`, `SUCURSAL`, `TEMPORAL`, `TRANSITO`)
- `parentId` (opcional): ID del almacén padre (para jerarquías)
- `isActive` (opcional): Estado activo/inactivo (default: true)

**Respuesta exitosa (201):**
```json
{
  "id": "2",
  "code": "ALM-02",
  "name": "Almacén Sucursal Norte",
  "description": "Almacén ubicado en sucursal norte",
  "type": "SUCURSAL",
  "parentId": null,
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### Actualizar Almacén
```http
PUT /api/inventory/warehouses/:id
Content-Type: application/json

{
  "code": "ALM-02-UPD",
  "name": "Almacén Sucursal Norte - Actualizado",
  "description": "Nueva descripción",
  "type": "SUCURSAL",
  "isActive": true
}
```

### Eliminar Almacén
```http
DELETE /api/inventory/warehouses/:id
```

**Nota:** No se puede eliminar un almacén que tiene stock registrado.

### Obtener Stock de un Almacén
```http
GET /api/inventory/warehouses/:id/stock
```

**Respuesta exitosa (200):**
```json
{
  "warehouse": {
    "id": "1",
    "name": "Almacén Principal",
    "location": "Bodega Central, Piso 1",
    "isActive": true
  },
  "stocks": [
    {
      "id": "1",
      "productId": "1",
      "warehouseId": "1",
      "quantity": 100,
      "product": {
        "id": "1",
        "name": "Cable UTP Cat6",
        "sku": "CAB-001",
        "salePrice": "8000"
      }
    }
  ],
  "totalProducts": 15,
  "totalQuantity": 450
}
```

---

## 🔐 Roles y Permisos

### Listar Roles
```http
GET /api/roles?page=1&limit=10&search=admin
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por nombre o descripción

### Obtener Rol por ID
```http
GET /api/roles/:id
```

### Crear Rol
```http
POST /api/roles
Content-Type: application/json

{
  "name": "Vendedor",
  "description": "Rol para personal de ventas"
}
```

### Actualizar Rol
```http
PUT /api/roles/:id
Content-Type: application/json

{
  "name": "Vendedor Senior",
  "description": "Rol para vendedores con experiencia"
}
```

### Eliminar Rol
```http
DELETE /api/roles/:id
```

### Asignar Permisos a Rol
```http
POST /api/roles/:id/permissions
Content-Type: application/json

{
  "permissionIds": [1, 2, 3, 5, 8]
}
```

### Remover Permiso de Rol
```http
DELETE /api/roles/:id/permissions/:permissionId
```

### Asignar Rol a Usuario
```http
POST /api/roles/assign-user
Content-Type: application/json

{
  "userId": 1,
  "roleId": 2
}
```

### Remover Rol de Usuario
```http
POST /api/roles/remove-user
Content-Type: application/json

{
  "userId": 1,
  "roleId": 2
}
```

### Obtener Roles de Usuario
```http
GET /api/roles/user/:userId/roles
```

### Obtener Permisos de Usuario
```http
GET /api/roles/user/:userId/permissions
```

---

## 🔑 Permisos

### Listar Permisos
```http
GET /api/permissions?page=1&limit=10&search=client&module=Clientes
```

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Items por página
- `search` (opcional): Buscar por código o descripción
- `module` (opcional): Filtrar por módulo

### Obtener Permisos Agrupados por Módulo
```http
GET /api/permissions/by-module
```

### Obtener Permiso por ID
```http
GET /api/permissions/:id
```

### Crear Permiso
```http
POST /api/permissions
Content-Type: application/json

{
  "code": "clients.create",
  "description": "Crear clientes",
  "module": "Clientes"
}
```

### Crear Permisos en Lote
```http
POST /api/permissions/bulk
Content-Type: application/json

{
  "permissions": [
    {
      "code": "clients.view",
      "description": "Ver clientes",
      "module": "Clientes"
    },
    {
      "code": "clients.create",
      "description": "Crear clientes",
      "module": "Clientes"
    },
    {
      "code": "clients.update",
      "description": "Actualizar clientes",
      "module": "Clientes"
    },
    {
      "code": "clients.delete",
      "description": "Eliminar clientes",
      "module": "Clientes"
    }
  ]
}
```

### Actualizar Permiso
```http
PUT /api/permissions/:id
Content-Type: application/json

{
  "description": "Ver listado de clientes",
  "module": "Gestión de Clientes"
}
```

### Eliminar Permiso
```http
DELETE /api/permissions/:id
```

---

## 📊 Importación desde Excel

### Descargar Plantilla de Productos
```http
GET /api/excel/templates/products
```

Descarga un archivo Excel con el formato correcto para importar productos.

**Columnas de la plantilla:**
- `name` (requerido): Nombre del producto
- `sku` (requerido): Código SKU único
- `description`: Descripción del producto
- `costPrice`: Precio de costo
- `salePrice`: Precio de venta
- `minStock`: Stock mínimo
- `categoryId`: ID de la categoría
- `unitId`: ID de la unidad de medida

### Descargar Plantilla de Stock
```http
GET /api/excel/templates/stock
```

Descarga un archivo Excel con el formato correcto para actualizar stock.

**Columnas de la plantilla:**
- `sku` o `productId` (requerido): Identificador del producto
- `warehouseId` (requerido): ID del almacén
- `quantity` (requerido): Cantidad de stock
- `type`: Tipo de movimiento (INGRESO, EGRESO, AJUSTE)
- `reason`: Razón del movimiento (COMPRA, AJUSTE_MANUAL, etc.)
- `notes`: Notas adicionales
- `userId`: ID del usuario que realiza el movimiento

### Importar Productos desde Excel (Formato Estándar)
```http
POST /api/excel/import-products
Content-Type: multipart/form-data

file: [archivo.xlsx]
```

Importa productos masivamente desde un archivo Excel con formato estándar.

**Respuesta exitosa (200):**
```json
{
  "message": "Importación completada",
  "results": {
    "total": 10,
    "success": 8,
    "errors": 2,
    "successDetails": [
      {
        "row": 2,
        "productId": "1",
        "sku": "CAB-001",
        "name": "Cable UTP"
      }
    ],
    "errorDetails": [
      {
        "row": 5,
        "error": "Ya existe un producto con ese SKU",
        "data": {...}
      }
    ]
  }
}
```

### Importar Productos desde Excel (Formato Cliente)
```http
POST /api/excel/import-products-client
Content-Type: multipart/form-data

file: [archivo.xlsx]
```

Importa productos desde un archivo Excel con el formato proporcionado por el cliente.

**Columnas esperadas:**
- `CODIGO` (requerido): Código SKU del producto
- `NOMBRE` (requerido): Nombre del producto
- `CODIGO FABRICANTE`: Código del fabricante
- `PRECIO DE COMPRA`: Precio de costo
- `PRECIO DE VENTA`: Precio de venta
- `CANTIDAD`: Cantidad inicial en stock
- `MARCA`: Marca del producto
- `PROVEEDOR`: Nombre del proveedor (se crea automáticamente si no existe)
- `GRUPO`: Categoría del producto (se crea automáticamente si no existe)
- `PROCEDENCIA`: Origen del producto
- `ALMACEN`: Código del almacén donde se asignará el stock
- `UND`: Unidad de medida (se crea automáticamente si no existe)
- `OBSERVACIONES`: Descripción o notas adicionales

**Características:**
- ✅ Crea automáticamente categorías, proveedores, unidades y almacenes si no existen
- ✅ Actualiza productos existentes si el SKU ya está registrado
- ✅ Asigna stock automáticamente al almacén especificado
- ✅ Maneja múltiples formatos de datos

**Respuesta exitosa (200):**
```json
{
  "success": [
    {
      "row": 2,
      "action": "created",
      "productId": "1",
      "sku": "1717125",
      "name": "Multitoma 25 Tomas Universal Vertical"
    },
    {
      "row": 3,
      "action": "updated",
      "productId": "2",
      "sku": "1717125Y",
      "name": "Multitoma 25 Tomas Universal Vertical 500Amp Breaker"
    }
  ],
  "errors": [
    {
      "row": 5,
      "error": "Campos requeridos: NOMBRE, CODIGO",
      "data": {...}
    }
  ],
  "total": 10,
  "created": 7,
  "updated": 2
}
```

### Actualizar Stock desde Excel
```http
POST /api/excel/update-stock
Content-Type: multipart/form-data

file: [archivo.xlsx]
```

Actualiza el stock de múltiples productos desde un archivo Excel.

**Respuesta exitosa (200):**
```json
{
  "message": "Actualización de stock completada",
  "results": {
    "total": 10,
    "success": 9,
    "errors": 1,
    "successDetails": [
      {
        "row": 2,
        "productId": "1",
        "sku": "CAB-001",
        "name": "Cable UTP",
        "warehouseId": "1",
        "quantity": 100
      }
    ],
    "errorDetails": [
      {
        "row": 7,
        "error": "Producto no encontrado",
        "data": {...}
      }
    ]
  }
}
```

---

## 📝 Respuestas de Error

Todos los endpoints retornan errores en el siguiente formato:

```json
{
  "error": "Mensaje de error descriptivo"
}
```

**Códigos de Estado HTTP:**
- `200`: OK - Operación exitosa
- `201`: Created - Recurso creado exitosamente
- `400`: Bad Request - Error en los datos enviados
- `401`: Unauthorized - No autenticado o token inválido
- `404`: Not Found - Recurso no encontrado
- `500`: Internal Server Error - Error del servidor

---

## 🔄 Paginación

Las respuestas paginadas tienen el siguiente formato:

**Clientes:**
```json
{
  "clients": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Productos:**
```json
{
  "products": [...],
  "pagination": {...}
}
```

**Proveedores:**
```json
{
  "suppliers": [...],
  "pagination": {...}
}
```

**Cotizaciones:**
```json
{
  "quotes": [...],
  "pagination": {...}
}
```

**Movimientos:**
```json
{
  "movements": [...],
  "pagination": {...}
}
```

---

## 📈 Reportes (Solo Administrador)

**Permiso Requerido:** `reports.view` (asignado automáticamente al rol Administrador)

### Reporte General
```http
GET /api/reports/general?startDate=2024-01-01&endDate=2024-12-31
```

**Respuesta exitosa (200):**
```json
{
  "overview": {
    "totalQuotes": 150,
    "approvedQuotes": 80,
    "totalApprovedAmount": 125000.00,
    "totalMovements": 320,
    "totalClients": 45
  },
  "topEmployees": [
    {
      "userId": "2",
      "username": "vendedor1",
      "fullName": "Juan Pérez",
      "totalQuotes": 35,
      "totalAmount": 52000.00
    }
  ],
  "topProducts": [
    {
      "productId": "1",
      "sku": "P001",
      "name": "Cable UTP Cat6",
      "timesCited": 28,
      "totalQuantity": 450
    }
  ],
  "salesByDay": [
    { "date": "2024-12-31", "count": 5, "total": 8500.00 }
  ]
}
```

---

### Reporte de Ventas / Cotizaciones
```http
GET /api/reports/sales?startDate=2024-01-01&endDate=2024-12-31&userId=2&status=APROBADA&page=1&limit=10
```

**Query Parameters:**
- `startDate` (opcional): Fecha inicio (ISO 8601)
- `endDate` (opcional): Fecha fin (ISO 8601)
- `userId` (opcional): Filtrar por empleado específico
- `status` (opcional): `PENDIENTE`, `ENVIADA`, `APROBADA`, `RECHAZADA`, `VENCIDA`
- `page` / `limit` (opcional): Paginación

**Respuesta exitosa (200):**
```json
{
  "quotes": [
    {
      "id": "1",
      "quoteNumber": "COT-2024-0001",
      "status": "APROBADA",
      "totalAmount": 1500.00,
      "quoteType": "PRODUCTOS",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "client": { "id": "1", "name": "Empresa ABC" },
      "createdBy": { "id": "2", "username": "vendedor1", "fullName": "Juan Pérez" }
    }
  ],
  "pagination": { "total": 80, "page": 1, "limit": 10, "totalPages": 8 },
  "summary": {
    "totalQuotes": 80,
    "totalAmount": 125000.00,
    "totalDiscount": 3500.00,
    "byStatus": [
      { "status": "APROBADA", "_count": 80, "_sum": { "totalAmount": 125000.00 } }
    ]
  }
}
```

---

### Reporte por Empleado
```http
GET /api/reports/employees?userId=2&startDate=2024-01-01&endDate=2024-12-31
```

**Query Parameters:**
- `userId` (opcional): Si se omite, devuelve reporte de TODOS los empleados
- `startDate` / `endDate` (opcional): Rango de fechas

**Respuesta exitosa (200):**
```json
[
  {
    "user": {
      "id": "2",
      "username": "vendedor1",
      "fullName": "Juan Pérez",
      "email": "juan@empresa.com",
      "roles": ["Vendedor"]
    },
    "summary": {
      "totalQuotes": 35,
      "approvedQuotes": 28,
      "pendingQuotes": 7,
      "totalSalesAmount": 52000.00,
      "totalMovements": 15,
      "totalServiceOrders": 8
    },
    "quotes": [...],
    "movements": [...],
    "serviceOrders": [...]
  }
]
```

---

### Reporte de Movimientos de Inventario
```http
GET /api/reports/inventory?startDate=2024-01-01&endDate=2024-12-31&type=EGRESO&warehouseId=1&page=1&limit=10
```

**Query Parameters:**
- `startDate` / `endDate` (opcional): Rango de fechas
- `type` (opcional): `INGRESO`, `EGRESO`, `AJUSTE`
- `warehouseId` (opcional): Filtrar por almacén
- `page` / `limit` (opcional): Paginación

**Respuesta exitosa (200):**
```json
{
  "movements": [
    {
      "id": "1",
      "type": "EGRESO",
      "reason": "VENTA",
      "quantity": -10,
      "createdAt": "2024-01-15T14:30:00.000Z",
      "product": { "sku": "P001", "name": "Cable UTP Cat6", "category": { "name": "Cables" } },
      "warehouse": { "code": "SLEN", "name": "Almacén Principal" },
      "createdBy": { "id": "2", "username": "vendedor1", "fullName": "Juan Pérez" }
    }
  ],
  "pagination": { "total": 320, "page": 1, "limit": 10, "totalPages": 32 },
  "summary": {
    "byType": [
      { "type": "INGRESO", "_count": 200, "_sum": { "quantity": 5000 } },
      { "type": "EGRESO", "_count": 100, "_sum": { "quantity": -2000 } }
    ],
    "byReason": [
      { "reason": "COMPRA", "_count": 150 },
      { "reason": "VENTA", "_count": 80 },
      { "reason": "TRANSFERENCIA", "_count": 40 }
    ]
  }
}
```

---

## 📌 Notas Importantes

1. **IDs en Respuestas**: Todos los IDs se retornan como strings (ej: `"1"`, `"2"`) debido a la serialización de BigInt. Al enviar IDs en requests, puedes usar números normales.

2. **Autenticación**: Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren el header `Authorization: Bearer <token>`.

3. **Validación de Stock**: Antes de crear egresos, el sistema valida que haya stock suficiente.

4. **Números de Cotización**: Se generan automáticamente en formato `COT-YYYY-NNNN` (ej: `COT-2026-0001`).

5. **Transferencias**: Las transferencias crean dos movimientos automáticamente (egreso en origen, ingreso en destino).

6. **Campos Requeridos vs Opcionales**:
   - **Cliente**: `name`, `rut`, `email` son requeridos
   - **Producto**: `name`, `sku` son requeridos
   - **Proveedor**: `name`, `rut` son requeridos
   - **Cotización**: `clientId`, `items` son requeridos

7. **Tipos de Pago**: `CONTADO` o `CREDITO`

8. **Estados de Cotización**: `PENDIENTE`, `ENVIADA`, `APROBADA`, `RECHAZADA`, `VENCIDA`

9. **Sistema de Roles y Permisos**:
   - Un usuario puede tener múltiples roles
   - Un rol puede tener múltiples permisos
   - Los permisos se organizan por módulos (ej: "Clientes", "Productos", "Inventario")
   - Formato de código de permiso: `modulo.accion` (ej: `clients.create`, `products.view`)

10. **Permisos Sugeridos por Módulo**:
    - **Clientes**: `clients.view`, `clients.create`, `clients.update`, `clients.delete`
    - **Productos**: `products.view`, `products.create`, `products.update`, `products.delete`
    - **Proveedores**: `suppliers.view`, `suppliers.create`, `suppliers.update`, `suppliers.delete`
    - **Cotizaciones**: `quotes.view`, `quotes.create`, `quotes.update`, `quotes.delete`, `quotes.approve`
    - **Inventario**: `inventory.view`, `inventory.movements`, `inventory.transfer`
    - **Roles**: `roles.view`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign`
    - **Permisos**: `permissions.view`, `permissions.create`, `permissions.update`, `permissions.delete`

---

## 🚀 Ejemplos de Uso Completos

### Flujo de Autenticación
```bash
# 1. Registrar usuario
POST http://localhost:3000/api/auth/register
{
  "email": "admin@empresa.com",
  "password": "miPassword123"
}

# 2. Iniciar sesión (obtener token)
POST http://localhost:3000/api/auth/login
{
  "email": "admin@empresa.com",
  "password": "miPassword123"
}
# Respuesta: { "user": {...}, "token": "eyJ..." }

# 3. Usar el token en requests
GET http://localhost:3000/api/clients
Authorization: Bearer eyJ...
```

### Flujo de Creación de Cotización
```bash
# 1. Crear cliente
POST http://localhost:3000/api/clients
Authorization: Bearer <token>
{
  "name": "Empresa XYZ",
  "rut": "12345678-9",
  "email": "contacto@xyz.com",
  "phone": "+56912345678",
  "address": "Santiago, Chile",
  "type": "REGULAR",
  "contactPerson": "Juan Pérez"
}
# Respuesta: { "id": "1", ... }

# 2. Crear productos
POST http://localhost:3000/api/products
Authorization: Bearer <token>
{
  "name": "Cable UTP Cat6",
  "sku": "CAB-001",
  "description": "Cable de red",
  "costPrice": 5000,
  "salePrice": 8000,
  "minStock": 50
}
# Respuesta: { "id": "1", ... }

# 3. Crear cotización
POST http://localhost:3000/api/quotes
Authorization: Bearer <token>
{
  "clientId": 1,
  "paymentType": "CONTADO",
  "validUntil": "2026-03-31",
  "discount": 10,
  "items": [
    {
      "productId": 1,
      "itemType": "PRODUCT",
      "description": "Cable UTP Cat6",
      "quantity": 100,
      "unitPrice": 8000
    }
  ]
}
# Respuesta: { "id": "1", "quoteNumber": "COT-2026-0001", ... }

# 4. Verificar stock disponible
GET http://localhost:3000/api/quotes/1/check-stock
Authorization: Bearer <token>
```

### Flujo de Gestión de Inventario
```bash
# 1. Listar almacenes
GET http://localhost:3000/api/inventory/warehouses
Authorization: Bearer <token>

# 2. Crear movimiento de ingreso
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token>
{
  "productId": 1,
  "warehouseId": 1,
  "type": "INGRESO",
  "reason": "COMPRA",
  "quantity": 100,
  "notes": "Compra inicial"
}

# 3. Verificar productos con stock bajo
GET http://localhost:3000/api/inventory/low-stock
Authorization: Bearer <token>

# 4. Transferir stock entre almacenes
POST http://localhost:3000/api/inventory/transfer
Authorization: Bearer <token>
{
  "productId": 1,
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "quantity": 50,
  "notes": "Transferencia para proyecto"
}
```

### Flujo de Roles y Permisos
```bash
# 1. Crear permisos en lote
POST http://localhost:3000/api/permissions/bulk
Authorization: Bearer <token>
{
  "permissions": [
    {
      "code": "clients.view",
      "description": "Ver clientes",
      "module": "Clientes"
    },
    {
      "code": "clients.create",
      "description": "Crear clientes",
      "module": "Clientes"
    },
    {
      "code": "quotes.view",
      "description": "Ver cotizaciones",
      "module": "Cotizaciones"
    },
    {
      "code": "quotes.create",
      "description": "Crear cotizaciones",
      "module": "Cotizaciones"
    }
  ]
}
# Respuesta: [{ "id": "1", "code": "clients.view", ... }, ...]

# 2. Crear un rol
POST http://localhost:3000/api/roles
Authorization: Bearer <token>
{
  "name": "Vendedor",
  "description": "Rol para personal de ventas"
}
# Respuesta: { "id": "1", "name": "Vendedor", ... }

# 3. Asignar permisos al rol
POST http://localhost:3000/api/roles/1/permissions
Authorization: Bearer <token>
{
  "permissionIds": [1, 2, 3, 4]
}
# Respuesta: [{ "id": "1", "roleId": "1", "permissionId": "1", ... }, ...]

# 4. Asignar rol a un usuario
POST http://localhost:3000/api/roles/assign-user
Authorization: Bearer <token>
{
  "userId": 2,
  "roleId": 1
}
# Respuesta: { "id": "1", "userId": "2", "roleId": "1", ... }

# 5. Verificar permisos del usuario
GET http://localhost:3000/api/roles/user/2/permissions
Authorization: Bearer <token>
# Respuesta: [
#   { "id": "1", "code": "clients.view", ... },
#   { "id": "2", "code": "clients.create", ... },
#   { "id": "3", "code": "quotes.view", ... },
#   { "id": "4", "code": "quotes.create", ... }
# ]
```

---

## 📦 TRANSFERENCIA DE STOCK ENTRE ALMACENES

```http
POST http://localhost:3000/api/inventory/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": 61,
  "fromWarehouseId": 1,
  "toWarehouseId": 4,
  "quantity": 5,
  "notes": "Motivo de la transferencia (opcional)"
}
```

### Respuesta exitosa (200)
```json
{ "message": "Transferencia realizada exitosamente" }
```

### Errores posibles
```json
{ "error": "Stock insuficiente en el almacén de origen" }
{ "error": "Los almacenes de origen y destino no pueden ser iguales" }
```

### Notas
- Requiere permiso: `inventory.transfer`
- Descuenta stock del almacén origen y suma al destino automáticamente
- Registra un movimiento de tipo `TRANSFERENCIA` en el historial
- Si el producto no tiene stock en el almacén destino, se crea el registro automáticamente

### Almacenes disponibles
```
GET http://localhost:3000/api/inventory/warehouses
Authorization: Bearer <token>
```
```json
[
  { "id": "4", "code": "SLEN", "name": "Almacén La paz" }
]
```

---

## 🔍 BÚSQUEDA DE PRODUCTOS

```http
GET http://localhost:3000/api/products?search=sierra&categoryId=2&page=1&limit=10
Authorization: Bearer <token>
```

### Parámetros
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Busca en nombre, SKU y descripción |
| `categoryId` | number | Filtra por categoría |
| `page` | number | Página (default: 1) |
| `limit` | number | Resultados por página (default: 10) |

### Respuesta (200)
```json
{
  "products": [
    {
      "id": "61",
      "name": "Sierra manual",
      "sku": "SIE-001",
      "description": "...",
      "costPrice": 45.00,
      "salePrice": 65.00,
      "category": { "id": "2", "name": "Herramientas" },
      "unit": { "id": "1", "name": "Unidad" },
      "warehouseStocks": [
        { "warehouseId": "4", "quantity": 89, "warehouse": { "name": "Almacén La paz" } }
      ]
    }
  ],
  "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

### Obtener producto por ID (con últimos 10 movimientos)
```http
GET http://localhost:3000/api/products/:id
Authorization: Bearer <token>
```

### Obtener stock de un producto por almacén
```http
GET http://localhost:3000/api/products/:id/stock
Authorization: Bearer <token>
```
```json
[
  {
    "warehouseId": "4",
    "productId": "61",
    "quantity": 89,
    "warehouse": { "id": "4", "name": "Almacén La paz", "code": "SLEN" },
    "product": { "id": "61", "name": "Sierra manual", "sku": "SIE-001" }
  }
]
```

---

## 📊 BÚSQUEDA EN STOCK / INVENTARIO

```http
GET http://localhost:3000/api/inventory?search=sierra&categoryId=2&warehouseId=4&page=1&limit=10&lowStockOnly=false
Authorization: Bearer <token>
```

### Parámetros
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Busca en nombre y SKU |
| `categoryId` | number | Filtra por categoría |
| `warehouseId` | number | Filtra por almacén (solo productos con stock ahí) |
| `lowStockOnly` | boolean | `true` para ver solo productos con stock bajo |
| `page` | number | Página (default: 1) |
| `limit` | number | Resultados por página (default: 10) |

### Respuesta (200)
```json
{
  "inventory": [
    {
      "id": "61",
      "name": "Sierra manual",
      "sku": "SIE-001",
      "totalStock": 89,
      "isLowStock": false,
      "costPrice": 45.00,
      "salePrice": 65.00,
      "stockByWarehouse": [
        { "warehouseId": "4", "warehouseName": "Almacén La paz", "warehouseCode": "SLEN", "quantity": 89 }
      ],
      "category": { "name": "Herramientas" }
    }
  ],
  "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

### Stock bajo
```http
GET http://localhost:3000/api/inventory/low-stock
Authorization: Bearer <token>
```

---

## 🗂️ BÚSQUEDA DE CATEGORÍAS

```http
GET http://localhost:3000/api/categories?search=herramienta&page=1&limit=10
Authorization: Bearer <token>
```

### Parámetros
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Busca en nombre y descripción |
| `page` | number | Página (default: 1) |
| `limit` | number | Resultados por página (default: 10) |

### Respuesta (200)
```json
{
  "categories": [
    {
      "id": "2",
      "name": "Herramientas",
      "description": "Herramientas manuales y eléctricas",
      "_count": { "products": 35 }
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### Obtener categoría por ID (con primeros 10 productos)
```http
GET http://localhost:3000/api/categories/:id
Authorization: Bearer <token>
```
