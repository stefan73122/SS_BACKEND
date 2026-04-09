const prisma = require('../prisma/client');

// Obtener notificaciones del usuario
async function getUserNotifications(userId, { limit = 20, unreadOnly = false }) {
  const where = {
    userId: BigInt(userId),
    ...(unreadOnly && { isRead: false }),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });

  // Transformar para compatibilidad con frontend
  return notifications.map(notification => ({
    ...notification,
    id: notification.id.toString(),
    userId: notification.userId.toString(),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  }));
}

// Contar notificaciones no leídas
async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: {
      userId: BigInt(userId),
      isRead: false,
    },
  });

  return count;
}

// Marcar notificación como leída
async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: BigInt(notificationId),
      userId: BigInt(userId),
    },
  });

  if (!notification) {
    throw new Error('Notificación no encontrada');
  }

  const updated = await prisma.notification.update({
    where: { id: BigInt(notificationId) },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    ...updated,
    id: updated.id.toString(),
    userId: updated.userId.toString(),
  };
}

// Marcar todas como leídas
async function markAllAsRead(userId) {
  await prisma.notification.updateMany({
    where: {
      userId: BigInt(userId),
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { message: 'Todas las notificaciones marcadas como leídas' };
}

// Crear notificación (para uso interno del sistema)
async function createNotification(data) {
  const { userId, type, title, message, link } = data;

  const notification = await prisma.notification.create({
    data: {
      userId: BigInt(userId),
      type: type || 'INFO',
      title,
      message,
      link: link || null,
    },
  });

  return {
    ...notification,
    id: notification.id.toString(),
    userId: notification.userId.toString(),
  };
}

// Eliminar notificación
async function deleteNotification(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: BigInt(notificationId),
      userId: BigInt(userId),
    },
  });

  if (!notification) {
    throw new Error('Notificación no encontrada');
  }

  await prisma.notification.delete({
    where: { id: BigInt(notificationId) },
  });

  return { message: 'Notificación eliminada' };
}

// Crear notificación de stock bajo (automática)
async function createLowStockNotification(productId, productName, currentStock, minStock) {
  // Obtener usuarios con permiso de ver inventario
  const usersWithPermission = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: {
            rolePermissions: {
              some: {
                permission: {
                  code: 'inventory.view',
                },
              },
            },
          },
        },
      },
    },
  });

  // Crear notificación para cada usuario
  const notifications = await Promise.all(
    usersWithPermission.map(user =>
      createNotification({
        userId: user.id.toString(),
        type: 'STOCK_LOW',
        title: 'Stock Bajo',
        message: `El producto "${productName}" tiene stock bajo (${currentStock}/${minStock})`,
        link: `/products/${productId}`,
      })
    )
  );

  return notifications;
}

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  createLowStockNotification,
};
