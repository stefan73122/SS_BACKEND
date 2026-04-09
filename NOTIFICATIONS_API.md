# API de Notificaciones

Sistema completo de notificaciones para la aplicación.

## 📋 Endpoints Disponibles

### 1. Obtener Notificaciones del Usuario

```http
GET /api/notifications
```

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (opcional): Número de notificaciones a retornar (default: 20)
- `unreadOnly` (opcional): `true` para obtener solo no leídas (default: false)

**Respuesta:**
```json
[
  {
    "id": "1",
    "userId": "2",
    "type": "STOCK_LOW",
    "title": "Stock Bajo",
    "message": "El producto 'Cable UTP Cat6' tiene stock bajo (5/50)",
    "link": "/products/8",
    "isRead": false,
    "createdAt": "2026-04-09T12:00:00.000Z",
    "readAt": null
  }
]
```

### 2. Obtener Contador de No Leídas

```http
GET /api/notifications/unread-count
```

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "count": 5
}
```

### 3. Marcar Notificación como Leída

```http
PATCH /api/notifications/:id/read
```

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "id": "1",
  "userId": "2",
  "type": "STOCK_LOW",
  "title": "Stock Bajo",
  "message": "El producto 'Cable UTP Cat6' tiene stock bajo (5/50)",
  "link": "/products/8",
  "isRead": true,
  "createdAt": "2026-04-09T12:00:00.000Z",
  "readAt": "2026-04-09T12:05:00.000Z"
}
```

### 4. Marcar Todas como Leídas

```http
PATCH /api/notifications/read-all
```

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "message": "Todas las notificaciones marcadas como leídas"
}
```

### 5. Eliminar Notificación

```http
DELETE /api/notifications/:id
```

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "message": "Notificación eliminada"
}
```

## 🔔 Tipos de Notificaciones

```typescript
enum NotificationType {
  INFO              // Información general
  WARNING           // Advertencia
  SUCCESS           // Operación exitosa
  ERROR             // Error
  STOCK_LOW         // Stock bajo
  QUOTE_APPROVED    // Cotización aprobada
  QUOTE_REJECTED    // Cotización rechazada
  ORDER_COMPLETED   // Orden completada
  PAYMENT_RECEIVED  // Pago recibido
}
```

## 🎨 Ejemplo de Uso en React

```typescript
// services/notifications.service.ts
import { apiClient } from './api-config';

export const notificationsService = {
  // Obtener notificaciones
  async getNotifications(unreadOnly = false) {
    const response = await apiClient.get('/notifications', {
      params: { unreadOnly }
    });
    return response.data;
  },

  // Obtener contador
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.count;
  },

  // Marcar como leída
  async markAsRead(id: string) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Marcar todas como leídas
  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  // Eliminar notificación
  async deleteNotification(id: string) {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};
```

```tsx
// components/NotificationBell.tsx
import { useState, useEffect } from 'react';
import { notificationsService } from '@/services/notifications.service';

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar contador al montar
  useEffect(() => {
    loadUnreadCount();
    // Actualizar cada 30 segundos
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar notificaciones al abrir
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setCount(count);
    } catch (error) {
      console.error('Error al cargar contador:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      loadNotifications();
      setCount(0);
    } catch (error) {
      console.error('Error al marcar todas:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <BellIcon className="w-6 h-6" />
        {count > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notificaciones</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start">
                    <NotificationIcon type={notification.type} />
                    <div className="ml-3 flex-1">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Notificaciones Automáticas

El sistema puede crear notificaciones automáticamente para:

### Stock Bajo
Cuando un producto alcanza su stock mínimo, se notifica automáticamente a todos los usuarios con permiso `inventory.view`.

```javascript
// En el servicio de inventario
const { createLowStockNotification } = require('./notification.service');

// Después de actualizar stock
if (currentStock <= minStock) {
  await createLowStockNotification(
    productId,
    productName,
    currentStock,
    minStock
  );
}
```

## 🎯 Colores por Tipo de Notificación

```typescript
const notificationColors = {
  INFO: 'blue',
  WARNING: 'yellow',
  SUCCESS: 'green',
  ERROR: 'red',
  STOCK_LOW: 'orange',
  QUOTE_APPROVED: 'green',
  QUOTE_REJECTED: 'red',
  ORDER_COMPLETED: 'green',
  PAYMENT_RECEIVED: 'green',
};
```

## 📱 Polling vs WebSockets

**Polling (Implementado):**
- Actualiza el contador cada 30 segundos
- Simple y funcional
- No requiere configuración adicional

**WebSockets (Futuro):**
- Notificaciones en tiempo real
- Requiere Socket.io o similar
- Mayor complejidad pero mejor UX
