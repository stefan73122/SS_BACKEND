const express = require('express');
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', serviceController.create);
router.put('/:id', serviceController.update);
router.delete('/:id', serviceController.remove);

module.exports = router;
