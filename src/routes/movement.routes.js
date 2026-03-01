const express = require('express');
const movementController = require('../controllers/movement.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', movementController.getMovements);
router.get('/summary', movementController.getMovementsSummary);
router.get('/:id', movementController.getMovementById);
router.post('/', requirePermission('inventory.movements'), movementController.createMovement);

module.exports = router;
