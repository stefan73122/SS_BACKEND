const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener notificaciones del usuario
router.get('/', notificationController.getNotifications);

// Obtener contador de no leídas
router.get('/unread-count', notificationController.getUnreadCount);

// Marcar notificación como leída
router.patch('/:id/read', notificationController.markAsRead);

// Marcar todas como leídas
router.patch('/read-all', notificationController.markAllAsRead);

// Eliminar notificación
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
