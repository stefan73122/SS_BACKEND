const notificationService = require('../services/notification.service');

async function getNotifications(req, res) {
  try {
    const userId = req.user.userId;
    const { limit = 20, unreadOnly = false } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      limit,
      unreadOnly: unreadOnly === 'true',
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const userId = req.user.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    console.error('Error al contar notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
}

async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    res.json(notification);
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(404).json({ error: error.message });
  }
}

async function markAllAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const result = await notificationService.markAllAsRead(userId);

    res.json(result);
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({ error: error.message });
  }
}

async function deleteNotification(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await notificationService.deleteNotification(id, userId);

    res.json(result);
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(404).json({ error: error.message });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
