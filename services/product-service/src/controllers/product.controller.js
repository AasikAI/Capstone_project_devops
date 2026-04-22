const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const logger = require('../config/logger');

// GET /api/products - list with filters, sorting, pagination
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, minPrice, maxPrice, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    logger.error(`Get all products error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: { product } });
  } catch (err) {
    logger.error(`Get product by ID error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

// POST /api/products - Admin only
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    const product = await Product.create(req.body);
    logger.info(`Product created: ${product.name} (${product._id})`);
    res.status(201).json({ success: true, message: 'Product created', data: { product } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'SKU already exists' });
    }
    logger.error(`Create product error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

// PUT /api/products/:id - Admin only
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product updated', data: { product } });
  } catch (err) {
    logger.error(`Update product error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// DELETE /api/products/:id - Admin only (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    logger.error(`Delete product error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

// PATCH /api/products/:id/stock - internal use (called by order service)
const updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'decrement' | 'increment'
    const update = operation === 'increment'
      ? { $inc: { stock: quantity } }
      : { $inc: { stock: -quantity } };

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, stock: { $gte: operation === 'decrement' ? quantity : 0 } },
      update,
      { new: true }
    );

    if (!product) {
      return res.status(400).json({ success: false, message: 'Insufficient stock or product not found' });
    }
    res.status(200).json({ success: true, data: { stock: product.stock } });
  } catch (err) {
    logger.error(`Update stock error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
};

// GET /api/products/bulk - fetch multiple by IDs (called by cart/order service)
const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const products = await Product.find({ _id: { $in: ids }, isActive: true });
    res.status(200).json({ success: true, data: { products } });
  } catch (err) {
    logger.error(`Bulk fetch error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock, getProductsByIds };
