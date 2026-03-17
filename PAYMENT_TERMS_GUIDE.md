# Sistema de Términos de Pago para Cotizaciones

## 📋 Resumen

Se ha implementado un sistema completo de términos de pago (cuotas/plazos) para cotizaciones a crédito. Esto permite al vendedor especificar cómo se realizarán los pagos parciales.

---

## 🆕 Nuevo Modelo: QuotePaymentTerm

### Estructura de Datos

```typescript
interface QuotePaymentTerm {
  id: string;
  quoteId: string;
  installmentNumber: number;      // Número de cuota (1, 2, 3, etc.)
  percentage: number;              // Porcentaje del total (ej: 30.00 = 30%)
  amount: number;                  // Monto calculado de la cuota
  daysAfterIssue: number;          // Días después de la emisión
  dueDate?: string;                // Fecha de vencimiento calculada
  description?: string;            // Descripción personalizada (ej: "Pago inicial")
  isPaid: boolean;                 // Si ya fue pagado
  paidAt?: string;                 // Fecha de pago
  createdAt: string;
}
```

### Ejemplo de Términos de Pago

**Escenario:** Cotización de $10,000 a crédito
- 30% al momento de la firma (día 0)
- 40% a los 15 días
- 30% a los 30 días

```json
{
  "quoteId": "123",
  "grandTotal": 10000,
  "paymentType": "CREDITO",
  "paymentTerms": [
    {
      "id": "1",
      "installmentNumber": 1,
      "percentage": 30.00,
      "amount": 3000.00,
      "daysAfterIssue": 0,
      "dueDate": "2024-01-15",
      "description": "Pago inicial al firmar",
      "isPaid": false
    },
    {
      "id": "2",
      "installmentNumber": 2,
      "percentage": 40.00,
      "amount": 4000.00,
      "daysAfterIssue": 15,
      "dueDate": "2024-01-30",
      "description": "Segunda cuota",
      "isPaid": false
    },
    {
      "id": "3",
      "installmentNumber": 3,
      "percentage": 30.00,
      "amount": 3000.00,
      "daysAfterIssue": 30,
      "dueDate": "2024-02-14",
      "description": "Pago final",
      "isPaid": false
    }
  ]
}
```

---

## 📊 Modelo Quote Actualizado

```typescript
interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  clientId: string;
  createdBy: string;
  status: QuoteStatus;
  quoteType: QuoteType;
  paymentType: PaymentType;          // "CONTADO" o "CREDITO"
  cashPaymentPercentage?: number;    // Solo para CONTADO
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
  creator: User;                     // ⚠️ Datos del vendedor
  items: QuoteItem[];
  paymentTerms: QuotePaymentTerm[];  // ⚠️ NUEVO: Términos de pago
}

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}
```

---

## 🔄 Endpoints Actualizados

### GET `/api/quotes`
Ahora incluye `creator` y `paymentTerms`:

```json
{
  "quotes": [
    {
      "id": "1",
      "quoteNumber": "COT-2024-001",
      "grandTotal": 10000,
      "paymentType": "CREDITO",
      "creator": {
        "id": "5",
        "username": "juan.perez",
        "email": "juan@example.com",
        "firstName": "Juan",
        "lastName": "Pérez"
      },
      "paymentTerms": [
        {
          "installmentNumber": 1,
          "percentage": 30.00,
          "amount": 3000.00,
          "daysAfterIssue": 0,
          "description": "Pago inicial"
        },
        {
          "installmentNumber": 2,
          "percentage": 70.00,
          "amount": 7000.00,
          "daysAfterIssue": 30,
          "description": "Pago final"
        }
      ],
      ...
    }
  ],
  "pagination": {...}
}
```

### GET `/api/quotes/:id`
Incluye toda la información detallada de términos de pago y vendedor.

### POST `/api/quotes`
Al crear una cotización a crédito, puedes incluir los términos de pago:

```json
{
  "clientId": "10",
  "paymentType": "CREDITO",
  "items": [...],
  "paymentTerms": [
    {
      "installmentNumber": 1,
      "percentage": 30.00,
      "daysAfterIssue": 0,
      "description": "Pago inicial al firmar contrato"
    },
    {
      "installmentNumber": 2,
      "percentage": 40.00,
      "daysAfterIssue": 15,
      "description": "Segunda cuota a los 15 días"
    },
    {
      "installmentNumber": 3,
      "percentage": 30.00,
      "daysAfterIssue": 30,
      "description": "Pago final a los 30 días"
    }
  ]
}
```

**Nota:** El backend calculará automáticamente:
- `amount` = (`percentage` / 100) * `grandTotal`
- `dueDate` = `issueDate` + `daysAfterIssue`

---

## 🎨 Implementación en el Frontend

### 1. Formulario de Cotización con Términos de Pago

```tsx
import { useState } from 'react';

interface PaymentTerm {
  installmentNumber: number;
  percentage: number;
  daysAfterIssue: number;
  description: string;
}

function QuoteForm() {
  const [paymentType, setPaymentType] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [cashPercentage, setCashPercentage] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  const addPaymentTerm = () => {
    setPaymentTerms([
      ...paymentTerms,
      {
        installmentNumber: paymentTerms.length + 1,
        percentage: 0,
        daysAfterIssue: 0,
        description: '',
      },
    ]);
  };

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: any) => {
    const updated = [...paymentTerms];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentTerms(updated);
  };

  const removePaymentTerm = (index: number) => {
    setPaymentTerms(paymentTerms.filter((_, i) => i !== index));
  };

  const totalPercentage = paymentTerms.reduce((sum, term) => sum + term.percentage, 0);

  return (
    <form>
      {/* Tipo de pago */}
      <div>
        <label>Tipo de Pago</label>
        <select 
          value={paymentType} 
          onChange={(e) => setPaymentType(e.target.value as any)}
        >
          <option value="CONTADO">Al Contado</option>
          <option value="CREDITO">A Crédito</option>
        </select>
      </div>

      {/* Si es AL CONTADO - mostrar campo de porcentaje de descuento */}
      {paymentType === 'CONTADO' && (
        <div>
          <label>Descuento por Pago al Contado (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={cashPercentage}
            onChange={(e) => setCashPercentage(parseFloat(e.target.value))}
            placeholder="Ej: 5 para 5%"
          />
        </div>
      )}

      {/* Si es A CRÉDITO - mostrar términos de pago */}
      {paymentType === 'CREDITO' && (
        <div className="payment-terms">
          <h3>Términos de Pago</h3>
          
          {paymentTerms.map((term, index) => (
            <div key={index} className="payment-term-row">
              <span>Cuota {term.installmentNumber}</span>
              
              <input
                type="number"
                placeholder="Porcentaje (%)"
                value={term.percentage}
                onChange={(e) => updatePaymentTerm(index, 'percentage', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.01"
              />
              
              <input
                type="number"
                placeholder="Días después"
                value={term.daysAfterIssue}
                onChange={(e) => updatePaymentTerm(index, 'daysAfterIssue', parseInt(e.target.value))}
                min="0"
              />
              
              <input
                type="text"
                placeholder="Descripción"
                value={term.description}
                onChange={(e) => updatePaymentTerm(index, 'description', e.target.value)}
              />
              
              <button type="button" onClick={() => removePaymentTerm(index)}>
                Eliminar
              </button>
            </div>
          ))}

          <button type="button" onClick={addPaymentTerm}>
            + Agregar Cuota
          </button>

          {/* Validación */}
          <div className={totalPercentage !== 100 ? 'error' : 'success'}>
            Total: {totalPercentage}% {totalPercentage !== 100 && '(Debe sumar 100%)'}
          </div>
        </div>
      )}

      <button type="submit">Crear Cotización</button>
    </form>
  );
}
```

### 2. Mostrar Términos de Pago en Detalle de Cotización

```tsx
function QuoteDetail({ quote }: { quote: Quote }) {
  return (
    <div>
      <h2>Cotización {quote.quoteNumber}</h2>
      
      {/* Información del vendedor */}
      <div className="seller-info">
        <h3>Vendedor</h3>
        <p>{quote.creator.firstName} {quote.creator.lastName}</p>
        <p>{quote.creator.email}</p>
      </div>

      {/* Tipo de pago */}
      <div className="payment-info">
        <h3>Información de Pago</h3>
        <p>Tipo: {quote.paymentType === 'CONTADO' ? 'Al Contado' : 'A Crédito'}</p>
        
        {quote.paymentType === 'CONTADO' && quote.cashPaymentPercentage > 0 && (
          <p>Descuento por pago al contado: {quote.cashPaymentPercentage}%</p>
        )}
      </div>

      {/* Términos de pago (solo para crédito) */}
      {quote.paymentType === 'CREDITO' && quote.paymentTerms.length > 0 && (
        <div className="payment-terms">
          <h3>Plan de Pagos</h3>
          <table>
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Porcentaje</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Descripción</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {quote.paymentTerms.map((term) => (
                <tr key={term.id}>
                  <td>#{term.installmentNumber}</td>
                  <td>{term.percentage}%</td>
                  <td>${term.amount.toFixed(2)}</td>
                  <td>{new Date(term.dueDate).toLocaleDateString()}</td>
                  <td>{term.description}</td>
                  <td>
                    {term.isPaid ? (
                      <span className="paid">Pagado ✓</span>
                    ) : (
                      <span className="pending">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total */}
      <div className="total">
        <h3>Total: ${quote.grandTotal.toFixed(2)}</h3>
      </div>
    </div>
  );
}
```

### 3. Vista de Pagos Pendientes (Dashboard)

```tsx
function CreditPaymentsDashboard() {
  const [pendingPayments, setPendingPayments] = useState<QuotePaymentTerm[]>([]);

  useEffect(() => {
    // Obtener todas las cotizaciones a crédito con pagos pendientes
    const loadPendingPayments = async () => {
      const response = await fetch(`${API_URL}/quotes?paymentType=CREDITO`);
      const data = await response.json();
      
      // Extraer todos los términos de pago pendientes
      const pending = data.quotes.flatMap((quote: Quote) =>
        quote.paymentTerms
          .filter(term => !term.isPaid)
          .map(term => ({
            ...term,
            quoteNumber: quote.quoteNumber,
            clientName: quote.client.name,
          }))
      );
      
      setPendingPayments(pending);
    };
    
    loadPendingPayments();
  }, []);

  return (
    <div>
      <h2>Pagos a Crédito Pendientes</h2>
      <table>
        <thead>
          <tr>
            <th>Cotización</th>
            <th>Cliente</th>
            <th>Cuota</th>
            <th>Monto</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pendingPayments.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.quoteNumber}</td>
              <td>{payment.clientName}</td>
              <td>#{payment.installmentNumber}</td>
              <td>${payment.amount.toFixed(2)}</td>
              <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
              <td>
                {new Date(payment.dueDate) < new Date() ? (
                  <span className="overdue">Vencido</span>
                ) : (
                  <span className="pending">Pendiente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ Validaciones Importantes

### En el Frontend:

1. **Suma de porcentajes = 100%**
   ```typescript
   const totalPercentage = paymentTerms.reduce((sum, term) => sum + term.percentage, 0);
   if (totalPercentage !== 100) {
     alert('Los porcentajes deben sumar 100%');
     return;
   }
   ```

2. **Al menos un término de pago para crédito**
   ```typescript
   if (paymentType === 'CREDITO' && paymentTerms.length === 0) {
     alert('Debe agregar al menos un término de pago para cotizaciones a crédito');
     return;
   }
   ```

3. **Días válidos**
   ```typescript
   if (term.daysAfterIssue < 0) {
     alert('Los días deben ser mayor o igual a 0');
     return;
   }
   ```

---

## 📄 Resumen de Cambios

### ✅ Implementado:
1. **Datos del vendedor** en cotizaciones (`creator`)
2. **Porcentaje de descuento AL CONTADO** (`cashPaymentPercentage`)
3. **Sistema de términos de pago** para crédito (`QuotePaymentTerm`)
4. **Tracking de pagos** (isPaid, paidAt)
5. **Cálculo automático** de montos y fechas de vencimiento

### 🎯 Casos de Uso:
- **AL CONTADO**: Aplicar descuento por pago inmediato
- **A CRÉDITO**: Definir plan de pagos con múltiples cuotas
- **Seguimiento**: Ver qué pagos están pendientes o vencidos
- **Reportes**: Generar reportes de cuentas por cobrar

---

## 🚀 Deploy

Los cambios se desplegarán automáticamente en Railway al hacer push.

**URL API:** `https://ssbackend-production-133b.up.railway.app/api`
