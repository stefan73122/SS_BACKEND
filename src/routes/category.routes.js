const express = require('express');
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/',       requirePermission('categories.view'),   categoryController.getAllCategories);
router.get('/:id',    requirePermission('categories.view'),   categoryController.getCategoryById);
router.post('/',      requirePermission('categories.create'), categoryController.createCategory);
router.put('/:id',    requirePermission('categories.update'), categoryController.updateCategory);
router.delete('/:id', requirePermission('categories.delete'), categoryController.deleteCategory);

module.exports = router;
