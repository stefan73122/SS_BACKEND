const express = require('express');
const serviceQuoteController = require('../controllers/serviceQuote.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', serviceQuoteController.getAll);
router.get('/:id', serviceQuoteController.getById);
router.get('/:id/receipt', serviceQuoteController.getReceipt);
router.post('/', serviceQuoteController.create);
router.put('/:id', serviceQuoteController.update);
router.delete('/:id', serviceQuoteController.remove);

module.exports = router;
