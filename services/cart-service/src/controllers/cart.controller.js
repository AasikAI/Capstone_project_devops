const axios = require('axios');
const Cart = require('../models/cart.model');
const logger = require('../config/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002';

// GET /api/cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) cart = await Cart.create({ userId: req.user.id, items: [] });
    res.status(200).json({ success: true, data: { cart } });
  } catch (err) {
    logger.error(`Get cart error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

// POST /api/cart/items - add or update item
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    // Validate product exists
    let product;
    try {
      const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
      product = data.data.product;
    } catch (err) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) cart = new Cart({ userId: req.user.id, items: [] });

    const existingIdx = cart.items.findIndex((i) => i.productId === productId);
    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      cart.items.push({ productId, name: product.name, price: product.price, quantity, imageUrl: product.imageUrl || '' });
    }

    await cart.save();
    logger.info(`Cart updated for user ${req.user.id}: added product ${productId}`);
    res.status(200).json({ success: true, message: 'Cart updated', data: { cart } });
  } catch (err) {
    logger.error(`Add to cart error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
};

// PATCH /api/cart/items/:productId - update quantity
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: 'Valid quantity required' });

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const idx = cart.items.findIndex((i) => i.productId === productId);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Item not in cart' });

    cart.items[idx].quantity = quantity;
    await cart.save();
    res.status(200).json({ success: true, message: 'Item quantity updated', data: { cart } });
  } catch (err) {
    logger.error(`Update cart item error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
};

// DELETE /api/cart/items/:productId
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter((i) => i.productId !== productId);
    await cart.save();
    res.status(200).json({ success: true, message: 'Item removed', data: { cart } });
  } catch (err) {
    logger.error(`Remove cart item error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// DELETE /api/cart - clear entire cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items = [];
    await cart.save();
    res.status(200).json({ success: true, message: 'Cart cleared', data: { cart } });
  } catch (err) {
    logger.error(`Clear cart error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
