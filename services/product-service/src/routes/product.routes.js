const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const {
  getAllProducts, getProductById, createProduct, updateProduct,
  deleteProduct, updateStock, getProductsByIds
} = require('../controllers/product.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

const productValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('category').isIn(['Electronics','Clothing','Books','Home & Garden','Sports','Toys','Beauty','Other']).withMessage('Invalid category'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
];

router.get('/', getAllProducts);
router.post('/bulk', getProductsByIds);
router.get('/:id', getProductById);
router.post('/', verifyToken, requireAdmin, productValidation, createProduct);
router.put('/:id', verifyToken, requireAdmin, updateProduct);
router.delete('/:id', verifyToken, requireAdmin, deleteProduct);
router.patch('/:id/stock', updateStock); // Internal service-to-service call

module.exports = router;
