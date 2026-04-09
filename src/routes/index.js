const express = require('express');
const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const supplierRoutes = require('./supplier.routes');
const quoteRoutes = require('./quote.routes');
const serviceQuoteRoutes = require('./serviceQuote.routes');
const inventoryRoutes = require('./inventory.routes');
const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const excelRoutes = require('./excel.routes');
const userRoutes = require('./user.routes');
const dashboardRoutes = require('./dashboard.routes');
const movementRoutes = require('./movement.routes');
const reportRoutes = require('./report.routes');
const unitRoutes = require('./unit.routes');
const creditRoutes = require('./credit.routes');
const healthRoutes = require('./health.routes');
const notificationRoutes = require('./notification.routes');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/clients', clientRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/quotes', quoteRoutes);
router.use('/service-quotes', serviceQuoteRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/movements', movementRoutes);
router.use('/reports', reportRoutes);
router.use('/excel', excelRoutes);
router.use('/units', unitRoutes);
router.use('/credits', creditRoutes);
router.use('/notifications', notificationRoutes);

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Perfil del usuario', userId: req.userId });
});

module.exports = router;
