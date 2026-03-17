# API de Créditos - Guía para Frontend

## 📋 Resumen

Nueva sección **"Créditos"** para visualizar todos los pagos a crédito con sus fechas de vencimiento, estado de pago y gestión de cobros.

---

## 🔗 Endpoints Disponibles

### 1. GET `/api/credits`
Obtiene todos los pagos a crédito con filtros y paginación.

**Query Parameters:**
- `page` (number, opcional): Número de página (default: 1)
- `limit` (number, opcional): Resultados por página (default: 50)
- `status` (string, opcional): Filtrar por estado
  - `all` - Todos los pagos (default)
  - `pending` - Solo pagos pendientes
  - `paid` - Solo pagos realizados
  - `overdue` - Solo pagos vencidos (pendientes con fecha pasada)
- `clientId` (string, opcional): Filtrar por cliente específico
- `sortBy` (string, opcional): Ordenar por
  - `dueDate` - Fecha de vencimiento (default)
  - `amount` - Monto
  - `quoteNumber` - Número de cotización

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
```json
{
  "payments": [
    {
      "id": "1",
      "quoteId": "123",
      "installmentNumber": 1,
      "percentage": 30.00,
      "amount": 3000.00,
      "daysAfterIssue": 0,
      "dueDate": "2024-01-15",
      "description": "Pago inicial al firmar",
      "isPaid": false,
      "paidAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isOverdue": false,
      "daysUntilDue": 5,
      "status": "pending",
      "quote": {
        "id": "123",
        "quoteNumber": "COT-2024-001",
        "grandTotal": 10000.00,
        "issueDate": "2024-01-15",
        "client": {
          "id": "10",
          "name": "Empresa ABC",
          "email": "contacto@abc.com",
          "phone": "555-1234"
        },
        "creator": {
          "id": "5",
          "username": "juan.perez",
          "firstName": "Juan",
          "lastName": "Pérez"
        }
      }
    },
    {
      "id": "2",
      "quoteId": "123",
      "installmentNumber": 2,
      "percentage": 40.00,
      "amount": 4000.00,
      "daysAfterIssue": 15,
      "dueDate": "2024-01-30",
      "description": "Segunda cuota",
      "isPaid": false,
      "paidAt": null,
      "isOverdue": true,
      "daysUntilDue": -5,
      "status": "overdue",
      "quote": {...}
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

**Campos calculados:**
- `isOverdue` (boolean): Si el pago está vencido (fecha pasada y no pagado)
- `daysUntilDue` (number): Días hasta el vencimiento (negativo si está vencido)
- `status` (string): Estado calculado: "paid", "pending", "overdue"

---

### 2. GET `/api/credits/summary`
Obtiene un resumen estadístico de todos los créditos.

**Respuesta exitosa (200):**
```json
{
  "totalPending": 15,
  "totalPaid": 8,
  "totalOverdue": 3,
  "amountPending": 45000.00,
  "amountPaid": 32000.00,
  "amountOverdue": 12000.00,
  "countPending": 15,
  "countPaid": 8,
  "countOverdue": 3
}
```

---

### 3. PATCH `/api/credits/:id/mark-paid`
Marca un pago como pagado.

**URL Parameters:**
- `id` (string): ID del término de pago

**Respuesta exitosa (200):**
```json
{
  "id": "1",
  "quoteId": "123",
  "installmentNumber": 1,
  "isPaid": true,
  "paidAt": "2024-01-20T10:30:00.000Z",
  "quote": {
    "quoteNumber": "COT-2024-001",
    "client": {
      "name": "Empresa ABC"
    }
  }
}
```

---

## 🎨 Implementación en el Frontend

### 1. Página de Créditos - Lista de Pagos

```tsx
import { useState, useEffect } from 'react';

interface CreditPayment {
  id: string;
  installmentNumber: number;
  percentage: number;
  amount: number;
  dueDate: string;
  description: string;
  isPaid: boolean;
  paidAt?: string;
  isOverdue: boolean;
  daysUntilDue: number;
  status: 'paid' | 'pending' | 'overdue';
  quote: {
    quoteNumber: string;
    grandTotal: number;
    client: {
      name: string;
      email: string;
      phone: string;
    };
    creator: {
      firstName: string;
      lastName: string;
    };
  };
}

function CreditsPage() {
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/credits?status=${filter}&sortBy=dueDate`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      setPayments(data.payments);
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (paymentId: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/credits/${paymentId}/mark-paid`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      loadPayments(); // Recargar lista
    } catch (error) {
      console.error('Error marcando pago:', error);
    }
  };

  const getStatusBadge = (payment: CreditPayment) => {
    if (payment.isPaid) {
      return <span className="badge badge-success">Pagado ✓</span>;
    }
    if (payment.isOverdue) {
      return <span className="badge badge-danger">Vencido</span>;
    }
    return <span className="badge badge-warning">Pendiente</span>;
  };

  return (
    <div className="credits-page">
      <h1>Créditos y Pagos Pendientes</h1>

      {/* Filtros */}
      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pendientes
        </button>
        <button 
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Vencidos
        </button>
        <button 
          className={filter === 'paid' ? 'active' : ''}
          onClick={() => setFilter('paid')}
        >
          Pagados
        </button>
      </div>

      {/* Tabla de pagos */}
      <table className="credits-table">
        <thead>
          <tr>
            <th>Cotización</th>
            <th>Cliente</th>
            <th>Cuota</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha Vencimiento</th>
            <th>Días</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className={payment.isOverdue ? 'overdue-row' : ''}>
              <td>{payment.quote.quoteNumber}</td>
              <td>
                <div>{payment.quote.client.name}</div>
                <small>{payment.quote.client.phone}</small>
              </td>
              <td>#{payment.installmentNumber}</td>
              <td>{payment.description}</td>
              <td className="amount">${payment.amount.toFixed(2)}</td>
              <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
              <td>
                {payment.isPaid ? (
                  '-'
                ) : payment.daysUntilDue >= 0 ? (
                  <span className="days-left">{payment.daysUntilDue} días</span>
                ) : (
                  <span className="days-overdue">{Math.abs(payment.daysUntilDue)} días vencido</span>
                )}
              </td>
              <td>{getStatusBadge(payment)}</td>
              <td>
                {!payment.isPaid && (
                  <button 
                    onClick={() => markAsPaid(payment.id)}
                    className="btn-mark-paid"
                  >
                    Marcar como Pagado
                  </button>
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

### 2. Dashboard de Resumen de Créditos

```tsx
function CreditsSummaryWidget() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/credits/summary`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    }
  };

  if (!summary) return <div>Cargando...</div>;

  return (
    <div className="credits-summary">
      <h3>Resumen de Créditos</h3>
      
      <div className="summary-cards">
        <div className="card pending">
          <h4>Pendientes</h4>
          <p className="count">{summary.countPending}</p>
          <p className="amount">${summary.amountPending.toFixed(2)}</p>
        </div>

        <div className="card overdue">
          <h4>Vencidos</h4>
          <p className="count">{summary.countOverdue}</p>
          <p className="amount">${summary.amountOverdue.toFixed(2)}</p>
        </div>

        <div className="card paid">
          <h4>Pagados</h4>
          <p className="count">{summary.countPaid}</p>
          <p className="amount">${summary.amountPaid.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
```

### 3. Agregar al Menú de Navegación

```tsx
// En tu componente de navegación/sidebar
<nav>
  <Link href="/punto-venta">
    <ShoppingCart /> Punto de Venta
  </Link>
  
  <Link href="/servicios">
    <Wrench /> Servicios
  </Link>
  
  <Link href="/cotizaciones">
    <FileText /> Cotizaciones
  </Link>
  
  {/* ⬇️ NUEVO */}
  <Link href="/creditos">
    <CreditCard /> Créditos
  </Link>
  
  <Link href="/clientes">
    <Users /> Clientes
  </Link>
  
  <Link href="/inventario">
    <Package /> Inventario
  </Link>
  
  <Link href="/proyectos">
    <Wrench /> Proyectos
  </Link>
</nav>
```

---

## 📊 Ejemplos de Uso

### Obtener todos los pagos vencidos:
```
GET /api/credits?status=overdue&sortBy=dueDate
```

### Obtener pagos pendientes de un cliente específico:
```
GET /api/credits?status=pending&clientId=10
```

### Obtener resumen de créditos:
```
GET /api/credits/summary
```

### Marcar pago como pagado:
```
PATCH /api/credits/1/mark-paid
```

---

## 🎯 Características Implementadas

✅ **Listado completo** de todos los pagos a crédito  
✅ **Filtros** por estado (pendiente, pagado, vencido)  
✅ **Ordenamiento** por fecha, monto o cotización  
✅ **Información del cliente** y vendedor  
✅ **Cálculo automático** de días hasta vencimiento  
✅ **Resumen estadístico** de créditos  
✅ **Marcar pagos como pagados**  
✅ **Detección de pagos vencidos**  

---

## 🚀 Deploy

Los cambios están listos para desplegarse en Railway.

**URL Base:** `https://ssbackend-production-133b.up.railway.app/api`
