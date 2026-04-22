const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cart.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/', getCart);
router.post('/items', [
  body('productId').notEmpty().withMessage('productId is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
], addToCart);
router.patch('/items/:productId', [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
], updateCartItem);
router.delete('/items/:productId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
