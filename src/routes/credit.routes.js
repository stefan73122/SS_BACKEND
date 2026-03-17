const express = require('express');
const creditController = require('../controllers/credit.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

// Obtener todos los pagos a crédito
router.get('/', authMiddleware, requirePermission('credits.view'), creditController.getAllCreditPayments);

// Obtener resumen de créditos
router.get('/summary', authMiddleware, requirePermission('credits.view'), creditController.getCreditSummary);

// Marcar un pago como pagado
router.patch('/:id/mark-paid', authMiddleware, requirePermission('credits.mark-paid'), creditController.markPaymentAsPaid);

module.exports = router;
