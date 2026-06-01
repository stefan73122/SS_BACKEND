const express = require('express');
const serviceQuoteController = require('../controllers/serviceQuote.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',            requirePermission('service-quotes.view'),   serviceQuoteController.getAll);
router.get('/:id',         requirePermission('service-quotes.view'),   serviceQuoteController.getById);
router.get('/:id/receipt', requirePermission('service-quotes.view'),   serviceQuoteController.getReceipt);
router.post('/',           requirePermission('service-quotes.create'), serviceQuoteController.create);
router.put('/:id',         requirePermission('service-quotes.update'), serviceQuoteController.update);
router.delete('/:id',      requirePermission('service-quotes.delete'), serviceQuoteController.remove);

module.exports = router;
