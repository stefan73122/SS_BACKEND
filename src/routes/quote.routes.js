const express = require('express');
const quoteController = require('../controllers/quote.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',                      requirePermission('quotes.view'),         quoteController.getAll);
router.get('/:id',                   requirePermission('quotes.view'),         quoteController.getById);
router.get('/:id/check-stock',       requirePermission('quotes.view'),         quoteController.checkStock);
router.get('/:id/receipt',           requirePermission('quotes.view'),         quoteController.getReceipt);
router.post('/',                     requirePermission('quotes.create'),       quoteController.create);
router.put('/:id',                   requirePermission('quotes.update'),       quoteController.update);
router.delete('/:id',                requirePermission('quotes.delete'),       quoteController.remove);
router.patch('/items/:itemId/price', requirePermission('quotes.update-price'), quoteController.updateItemPrice);

module.exports = router;
