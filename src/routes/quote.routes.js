const express = require('express');
const quoteController = require('../controllers/quote.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', quoteController.getAll);
router.get('/:id', quoteController.getById);
router.get('/:id/check-stock', quoteController.checkStock);
router.get('/:id/receipt', quoteController.getReceipt);
router.post('/', quoteController.create);
router.put('/:id', quoteController.update);
router.delete('/:id', quoteController.remove);
router.patch('/items/:itemId/price', quoteController.updateItemPrice);

module.exports = router;
