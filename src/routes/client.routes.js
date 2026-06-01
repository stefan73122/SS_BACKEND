const express = require('express');
const clientController = require('../controllers/client.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',       requirePermission('clients.view'),   clientController.getAll);
router.get('/:id',    requirePermission('clients.view'),   clientController.getById);
router.post('/',      requirePermission('clients.create'), clientController.create);
router.put('/:id',    requirePermission('clients.update'), clientController.update);
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

module.exports = router;
