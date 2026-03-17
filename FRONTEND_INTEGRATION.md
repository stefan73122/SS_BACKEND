# Documentación de Integración Frontend - Productos con Unidades

## 📋 Resumen de Cambios

Se ha agregado validación obligatoria del campo **unidad** (`unitId`) para todos los productos. Ahora cada producto debe tener una unidad asociada (pieza, metro, litro, etc.).

---

## 🔗 Nuevo Endpoint: Unidades

### GET `/api/units`
Obtiene todas las unidades disponibles en el sistema.

**Headers requeridos:**
```
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "1",
    "code": "PZA",
    "name": "Pieza",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "2",
    "code": "MTR",
    "name": "Metro",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "3",
    "code": "LTR",
    "name": "Litro",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET `/api/units/:id`
Obtiene una unidad específica por ID.

**Respuesta exitosa (200):**
```json
{
  "id": "1",
  "code": "PZA",
  "name": "Pieza",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Respuesta error (404):**
```json
{
  "error": "Unidad no encontrada"
}
```

---

## 📦 Cambios en Productos

### Modelo Product Actualizado

```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  unitId: string;              // ⚠️ AHORA ES OBLIGATORIO
  costPrice?: number;
  salePrice?: number;
  brand?: string;
  origin?: string;
  manufacturerCode?: string;
  isService: boolean;
  isActive: boolean;
  minStockGlobal?: number;
  createdAt: string;
  updatedAt?: string;
  
  // Relaciones
  category?: Category;
  supplier?: Supplier;
  unit: Unit;                  // ⚠️ SIEMPRE INCLUIDO EN LAS RESPUESTAS
  warehouseStocks?: WarehouseStock[];
}

interface Unit {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}
```

### GET `/api/products`
Los productos ahora **siempre incluyen** la información de la unidad:

```json
{
  "products": [
    {
      "id": "1",
      "sku": "CAB-001",
      "name": "Cable UTP Cat6",
      "unitId": "2",
      "unit": {
        "id": "2",
        "code": "MTR",
        "name": "Metro"
      },
      ...
    }
  ],
  "pagination": {...}
}
```

### POST `/api/products`
**Validación obligatoria de `unitId`:**

**Request body:**
```json
{
  "name": "Cable UTP Cat6",
  "sku": "CAB-001",
  "description": "Cable de red categoría 6",
  "unitId": "2",              // ⚠️ OBLIGATORIO
  "costPrice": 5000,
  "salePrice": 8000,
  "categoryId": "1"
}
```

**Respuesta error si falta `unitId` (400):**
```json
{
  "error": "La unidad es obligatoria para crear un producto"
}
```

---

## 📊 Importación/Exportación Excel

### Plantilla de Productos
La plantilla de Excel incluye el campo `unitId`:

| name | sku | description | costPrice | salePrice | minStock | categoryId | unitId |
|------|-----|-------------|-----------|-----------|----------|------------|--------|
| Cable UTP Cat6 | CAB-UTP-CAT6 | Cable de red categoría 6 | 5000 | 8000 | 50 | 1 | 1 |
| Switch 24 puertos | SW-24P | Switch Gigabit 24 puertos | 150000 | 200000 | 5 | 1 | 2 |

### POST `/api/excel/import-products`
**Validación en importación:**

Si una fila no tiene `unitId`, se rechazará con el error:
```json
{
  "errors": [
    {
      "row": 3,
      "error": "El campo unitId es obligatorio. Debe especificar la unidad del producto (pieza, metro, litro, etc.)",
      "data": {...}
    }
  ]
}
```

### GET `/api/excel/templates/products`
Descarga la plantilla de Excel con ejemplos que incluyen `unitId`.

---

## 🎨 Implementación en el Frontend

### 1. Cargar Unidades al Iniciar

```typescript
// En tu componente de productos o layout
import { useEffect, useState } from 'react';

const [units, setUnits] = useState<Unit[]>([]);

useEffect(() => {
  const loadUnits = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUnits(data);
    } catch (error) {
      console.error('Error cargando unidades:', error);
    }
  };
  
  loadUnits();
}, []);
```

### 2. Formulario de Creación de Producto

```tsx
<form onSubmit={handleSubmit}>
  <input 
    type="text" 
    name="name" 
    placeholder="Nombre del producto"
    required 
  />
  
  <input 
    type="text" 
    name="sku" 
    placeholder="SKU"
    required 
  />
  
  {/* ⚠️ Campo obligatorio de unidad */}
  <select 
    name="unitId" 
    required
    onChange={(e) => setFormData({...formData, unitId: e.target.value})}
  >
    <option value="">Seleccione una unidad *</option>
    {units.map(unit => (
      <option key={unit.id} value={unit.id}>
        {unit.name} ({unit.code})
      </option>
    ))}
  </select>
  
  <input 
    type="number" 
    name="costPrice" 
    placeholder="Precio de costo"
  />
  
  <button type="submit">Crear Producto</button>
</form>
```

### 3. Validación en el Frontend

```typescript
const validateProduct = (product: ProductFormData) => {
  const errors: string[] = [];
  
  if (!product.name) errors.push('El nombre es obligatorio');
  if (!product.sku) errors.push('El SKU es obligatorio');
  if (!product.unitId) errors.push('La unidad es obligatoria'); // ⚠️ Nueva validación
  
  return errors;
};
```

### 4. Mostrar Unidad en Listados

```tsx
<table>
  <thead>
    <tr>
      <th>SKU</th>
      <th>Nombre</th>
      <th>Unidad</th> {/* ⚠️ Nueva columna */}
      <th>Precio</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => (
      <tr key={product.id}>
        <td>{product.sku}</td>
        <td>{product.name}</td>
        <td>{product.unit.name}</td> {/* ⚠️ Mostrar unidad */}
        <td>{product.salePrice}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🔄 Cambios en Cotizaciones

### Modelo Quote Actualizado

```typescript
interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  clientId: string;
  createdBy: string;
  status: QuoteStatus;
  quoteType: QuoteType;
  paymentType: PaymentType;
  cashPaymentPercentage?: number;  // ⚠️ NUEVO CAMPO
  validUntil?: string;
  issueDate: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  termsConditions?: string;
  observations?: string;
  pdfPath?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Relaciones
  client: Client;
  creator: User;               // ⚠️ Datos del vendedor
  items: QuoteItem[];
}
```

### Campo: cashPaymentPercentage
- **Tipo:** `Decimal` (5,2)
- **Descripción:** Porcentaje de descuento o ajuste cuando el método de pago es AL CONTADO
- **Ejemplo:** `5.00` = 5%, `10.50` = 10.5%
- **Uso:** Solo aplicable cuando `paymentType === 'CONTADO'`

### Datos del Vendedor
Cada cotización tiene la relación `creator` que contiene los datos del usuario (vendedor) que la creó:

```json
{
  "id": "1",
  "quoteNumber": "COT-2024-001",
  "createdBy": "5",
  "creator": {
    "id": "5",
    "username": "juan.perez",
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": {
      "id": "2",
      "name": "Vendedor"
    }
  },
  "cashPaymentPercentage": 5.00,
  "paymentType": "CONTADO",
  ...
}
```

---

## ✅ Checklist de Implementación Frontend

- [ ] Crear servicio/hook para obtener unidades (`GET /api/units`)
- [ ] Agregar campo de selección de unidad en formulario de productos (obligatorio)
- [ ] Validar que `unitId` esté presente antes de enviar el formulario
- [ ] Mostrar la unidad en listados y detalles de productos
- [ ] Actualizar plantilla de importación Excel con columna `unitId`
- [ ] Agregar validación en importación de Excel
- [ ] Agregar campo `cashPaymentPercentage` en formulario de cotizaciones
- [ ] Mostrar datos del vendedor (`creator`) en cotizaciones
- [ ] Actualizar tipos TypeScript con los nuevos campos

---

## 🚀 Deploy

Los cambios ya están desplegados en Railway:
- **URL Backend:** `https://ssbackend-production-133b.up.railway.app`
- **URL API:** `https://ssbackend-production-133b.up.railway.app/api`

---

## 📞 Soporte

Si tienes dudas o encuentras algún problema, revisa:
1. Los logs de Railway para errores del backend
2. La consola del navegador para errores del frontend
3. Verifica que el token de autenticación sea válido
4. Confirma que la URL base incluya `/api`
