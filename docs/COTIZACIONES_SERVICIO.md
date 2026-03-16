# API de Cotizaciones de Servicio

## Descripción
Sistema completo para gestionar cotizaciones de servicios con todos los campos necesarios para generar facturas profesionales.

## Endpoints

### Base URL
`/api/service-quotes`

---

## 1. Crear Cotización de Servicio

**POST** `/api/service-quotes`


### Campos del Request Body

```json
{
  "clientId": "1",
  "version": 2,
  "paymentType": "CONTADO",
  "validUntil": "2026-03-31",
  "discountPercent": 10,
  "observations": "Ochenta y ocho Bolivianos con Noventa y cinco Centavos",
  "termsConditions": "Condiciones generales de venta",
  "deliveryTime": "1 Día",
  "generalDescription": "Descripción general del servicio",
  "responsibleName": "LPB02 Quispe Carlo Ruddy",
  "responsiblePosition": "Gerente",
  "responsiblePhone": "72035493",
  "responsibleEmail": "ruddy-quispe@electrored.com.bo",
  "salesExecutive": "LPB02 Quispe Carlo Ruddy",
  "items": [
    {
      "description": "BASE PARA FOTOCELDA METALICO SOPORTA 1\" EXATRON",
      "productId": "123",
      "quantity": 1,
      "unitPrice": 68.30,
      "unitPriceBase": 68.30,
      "discount": 0,
      "sortOrder": 1,
      "details": [
        "Instalación incluida",
        "Garantía de 1 año",
        "Soporte técnico"
      ],
      "hiddenCosts": [
        {
          "costType": "MANO_DE_OBRA",
          "description": "Técnico especializado",
          "quantity": 2,
          "unitCost": 50
        },
        {
          "costType": "TRANSPORTE",
          "description": "Traslado al sitio",
          "quantity": 1,
          "unitCost": 30
        }
      ]
    },
    {
      "description": "FOTOCELDA ELECTRONICA EXATRON 1000W 1800VA 220V IP67",
      "productId": "124",
      "quantity": 1,
      "unitPrice": 68.68,
      "discount": 0,
      "sortOrder": 2
    }
  ]
}
```

### Campos Principales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `clientId` | string/number | ✅ | ID del cliente |
| `version` | number | ❌ | Versión de la cotización (default: 1) |
| `paymentType` | string | ❌ | "CONTADO" o "CREDITO" (default: "CONTADO") |
| `validUntil` | date | ❌ | Fecha de validez de la cotización |
| `discountPercent` | number | ❌ | Porcentaje de descuento global (0-100) |
| `observations` | string | ❌ | Observaciones generales (ej: monto en letras) |
| `termsConditions` | string | ❌ | Términos y condiciones |
| `deliveryTime` | string | ❌ | Tiempo de entrega |
| `generalDescription` | string | ❌ | Descripción general del servicio |
| `responsibleName` | string | ❌ | Nombre del responsable/contacto |
| `responsiblePosition` | string | ❌ | Cargo del responsable |
| `responsiblePhone` | string | ❌ | Teléfono del responsable |
| `responsibleEmail` | string | ❌ | Email del responsable |
| `salesExecutive` | string | ❌ | Ejecutivo de ventas asignado |
| `items` | array | ✅ | Lista de servicios/items |

### Campos de Items

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `description` | string | ✅ | Descripción del servicio |
| `productId` | string/number | ❌ | ID del producto relacionado (si aplica) |
| `quantity` | number | ❌ | Cantidad (default: 1) |
| `unitPrice` | number | ✅ | Precio unitario |
| `unitPriceBase` | number | ❌ | Precio base sin descuentos |
| `discount` | number | ❌ | Descuento del item en porcentaje (0-100) |
| `sortOrder` | number | ❌ | Orden de visualización |
| `details` | array[string] | ❌ | Detalles adicionales del servicio |
| `hiddenCosts` | array[object] | ❌ | Costos ocultos/adicionales |

### Campos de Hidden Costs

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `costType` | string | ❌ | "MANO_DE_OBRA", "TRANSPORTE", "ACCESORIOS", "MATERIAL" |
| `description` | string | ❌ | Descripción del costo |
| `quantity` | number | ❌ | Cantidad (default: 1) |
| `unitCost` | number | ✅ | Costo unitario |

### Response

```json
{
  "id": "1",
  "quoteNumber": "SERV-2026-0001",
  "version": 2,
  "clientId": "1",
  "createdBy": "1",
  "status": "PENDIENTE",
  "quoteType": "SERVICIOS",
  "paymentType": "CONTADO",
  "validUntil": "2026-03-31T00:00:00.000Z",
  "issueDate": "2026-02-25T00:00:00.000Z",
  "currency": "BOB",
  "subtotal": "98.83",
  "taxTotal": "0.00",
  "discountTotal": "9.88",
  "grandTotal": "88.95",
  "observations": "Ochenta y ocho Bolivianos con Noventa y cinco Centavos",
  "termsConditions": "Condiciones generales de venta",
  "createdAt": "2026-02-25T14:58:00.000Z",
  "updatedAt": "2026-02-25T14:58:00.000Z",
  "client": {
    "id": "1",
    "name": "SMART SERVICES S.R.L.",
    "documentType": "NIT",
    "documentNum": "333314024",
    "email": "contacto@smartservices.com",
    "phone": "77299562",
    "address": "Av. Principal 123",
    "city": "La Paz",
    "country": "Bolivia"
  },
  "creator": {
    "id": "1",
    "username": "admin",
    "fullName": "Administrador del Sistema"
  },
  "items": [
    {
      "id": "1",
      "quoteId": "1",
      "itemType": "SERVICE",
      "productId": "123",
      "description": "BASE PARA FOTOCELDA METALICO SOPORTA 1\" EXATRON",
      "quantity": "1.00",
      "unitPrice": "68.30",
      "unitPriceBase": "68.30",
      "discount": "0.00",
      "taxPercent": "0.00",
      "lineTotal": "68.30",
      "sortOrder": 1,
      "product": {
        "id": "123",
        "sku": "18354",
        "name": "BASE PARA FOTOCELDA METALICO SOPORTA 1\" EXATRON",
        "brand": "EXATRON",
        "origin": "Nacional"
      },
      "details": [
        {
          "id": "1",
          "quoteItemId": "1",
          "description": "Instalación incluida",
          "sortOrder": 0
        },
        {
          "id": "2",
          "quoteItemId": "1",
          "description": "Garantía de 1 año",
          "sortOrder": 1
        }
      ],
      "hiddenCosts": [
        {
          "id": "1",
          "quoteItemId": "1",
          "costType": "MANO_DE_OBRA",
          "description": "Técnico especializado",
          "quantity": "2.00",
          "unitCost": "50.00",
          "totalCost": "100.00"
        }
      ]
    }
  ]
}
```

---

## 2. Listar Cotizaciones de Servicio

**GET** `/api/service-quotes`

### Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | number | Número de página (default: 1) |
| `limit` | number | Items por página (default: 10) |
| `search` | string | Buscar por número de cotización o nombre de cliente |
| `status` | string | Filtrar por estado: PENDIENTE, ENVIADA, APROBADA, RECHAZADA, VENCIDA |
| `clientId` | string/number | Filtrar por ID de cliente |

### Ejemplo

```
GET /api/service-quotes?page=1&limit=10&status=PENDIENTE&search=SMART
```

---

## 3. Obtener Cotización por ID

**GET** `/api/service-quotes/:id`

### Ejemplo

```
GET /api/service-quotes/1
```

---

## 4. Actualizar Cotización de Servicio

**PUT** `/api/service-quotes/:id`

### Request Body

Misma estructura que crear, pero todos los campos son opcionales. Solo envía los campos que deseas actualizar.

```json
{
  "status": "ENVIADA",
  "version": 3,
  "discountPercent": 15,
  "items": [...]
}
```

---

## 5. Eliminar Cotización de Servicio

**DELETE** `/api/service-quotes/:id`

### Response

```json
{
  "message": "Cotización de servicio eliminada exitosamente"
}
```

---

## 6. Obtener Recibo/Comprobante

**GET** `/api/service-quotes/:id/receipt`

Retorna todos los datos formateados para generar el PDF de la cotización, incluyendo:

- Datos completos del cliente
- Información del vendedor
- Items con todos sus detalles
- Costos ocultos
- Totales calculados
- Descuentos aplicados
- Versión de la cotización

### Response

```json
{
  "id": "1",
  "quoteNumber": "SERV-2026-0001",
  "receiptData": {
    "quoteNumber": "SERV-2026-0001",
    "issueDate": "2026-02-25T00:00:00.000Z",
    "validUntil": "2026-03-31T00:00:00.000Z",
    "paymentType": "CONTADO",
    "status": "PENDIENTE",
    "version": 2,
    "client": {
      "name": "SMART SERVICES S.R.L.",
      "documentType": "NIT",
      "documentNum": "333314024",
      "phone": "77299562",
      "email": "contacto@smartservices.com",
      "address": "Av. Principal 123"
    },
    "seller": "Administrador del Sistema",
    "items": [
      {
        "description": "BASE PARA FOTOCELDA METALICO SOPORTA 1\" EXATRON",
        "sku": "18354",
        "brand": "EXATRON",
        "origin": "Nacional",
        "quantity": 1,
        "unitPrice": 68.30,
        "unitPriceBase": 68.30,
        "discount": 0,
        "lineTotal": 68.30,
        "details": [
          "Instalación incluida",
          "Garantía de 1 año"
        ],
        "hiddenCosts": [
          {
            "costType": "MANO_DE_OBRA",
            "description": "Técnico especializado",
            "quantity": 2,
            "unitCost": 50,
            "totalCost": 100
          }
        ]
      }
    ],
    "subtotal": 98.83,
    "discountTotal": 9.88,
    "discountPercent": 10,
    "taxTotal": 0,
    "grandTotal": 88.95,
    "observations": "Ochenta y ocho Bolivianos con Noventa y cinco Centavos",
    "termsConditions": "Condiciones generales de venta"
  }
}
```

---

## Estados de Cotización

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Cotización en proceso de creación |
| `ENVIADA` | Cotización enviada al cliente |
| `APROBADA` | Cotización aprobada por el cliente |
| `RECHAZADA` | Cotización rechazada |
| `VENCIDA` | Cotización que superó su fecha de validez |

---

## Tipos de Pago

| Tipo | Descripción |
|------|-------------|
| `CONTADO` | Pago al contado |
| `CREDITO` | Pago a crédito |

---

## Tipos de Costos Ocultos

| Tipo | Descripción |
|------|-------------|
| `MANO_DE_OBRA` | Costos de mano de obra |
| `TRANSPORTE` | Costos de transporte |
| `ACCESORIOS` | Costos de accesorios |
| `MATERIAL` | Costos de materiales |

---

## Notas Importantes

1. **Numeración Automática**: Las cotizaciones de servicio usan el formato `SERV-YYYY-NNNN` (diferente a cotizaciones de productos que usan `COT-YYYY-NNNN`)

2. **Descuentos**: 
   - Puedes aplicar descuento por item individual (`item.discount`)
   - Puedes aplicar descuento global a toda la cotización (`discountPercent`)
   - Los descuentos se calculan en cascada (primero por item, luego global)

3. **Versiones**: El campo `version` permite mantener un historial de cambios en la cotización

4. **Detalles por Item**: Cada servicio puede tener múltiples líneas de detalle para especificar qué incluye

5. **Costos Ocultos**: Útil para registrar costos internos que no se muestran al cliente pero se consideran en el análisis

6. **Autenticación**: Todos los endpoints requieren autenticación mediante JWT token en el header `Authorization: Bearer <token>`
