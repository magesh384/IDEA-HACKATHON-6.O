const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { lookupGstByHsn, VALID_GST_RATES } = require('../utils/gst');

// GET /api/products
const listProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
  let sql = 'SELECT * FROM products WHERE business_id = ? AND is_active = 1';
  const params = [req.user.businessId];

  if (search) {
    sql += ' AND (name LIKE ? OR barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (lowStock === 'true') {
    sql += ' AND quantity <= reorder_level';
  }
  sql += ' ORDER BY name ASC';

  const [rows] = await pool.query(sql, params);
  res.json({ success: true, products: rows });
});

// GET /api/products/:id
const getProduct = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ? AND business_id = ?', [
    req.params.id,
    req.user.businessId,
  ]);
  if (rows.length === 0) throw new AppError('Product not found', 404);
  res.json({ success: true, product: rows[0] });
});

// GET /api/products/gst-lookup/:hsnCode — auto-fetch GST rate from HSN code
const gstLookup = asyncHandler(async (req, res) => {
  const result = await lookupGstByHsn(req.params.hsnCode);
  if (!result) {
    return res.json({ success: true, found: false, message: 'HSN code not in reference table — please enter GST rate manually.' });
  }
  res.json({ success: true, found: true, ...result });
});

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const {
    name, barcode, category, brand, supplierId, buyingPrice, sellingPrice,
    hsnCode, gstRate, cessRate, quantity, reorderLevel, expiryDate,
  } = req.body;

  if (!name) throw new AppError('Product name is required', 400);
  if (gstRate !== undefined && !VALID_GST_RATES.includes(Number(gstRate))) {
    throw new AppError(`GST rate must be one of: ${VALID_GST_RATES.join(', ')}`, 400);
  }

  const [result] = await pool.query(
    `INSERT INTO products (
      business_id, name, barcode, category, brand, supplier_id, buying_price, selling_price,
      hsn_code, gst_rate, cess_rate, quantity, reorder_level, expiry_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.user.businessId, name, barcode || null, category || null, brand || null, supplierId || null,
      buyingPrice || 0, sellingPrice || 0, hsnCode || null, gstRate || 0, cessRate || 0,
      quantity || 0, reorderLevel || 5, expiryDate || null,
    ]
  );

  res.status(201).json({ success: true, message: 'Product added', productId: result.insertId });
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name', 'barcode', 'category', 'brand', 'supplier_id', 'buying_price', 'selling_price',
    'hsn_code', 'gst_rate', 'cess_rate', 'quantity', 'reorder_level', 'expiry_date', 'is_active',
  ];
  const fieldMap = {
    supplierId: 'supplier_id', buyingPrice: 'buying_price', sellingPrice: 'selling_price',
    hsnCode: 'hsn_code', gstRate: 'gst_rate', cessRate: 'cess_rate', reorderLevel: 'reorder_level',
    expiryDate: 'expiry_date', isActive: 'is_active',
  };

  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(req.body)) {
    const column = fieldMap[key] || key;
    if (allowedFields.includes(column)) {
      updates.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (updates.length === 0) throw new AppError('No valid fields to update', 400);

  values.push(req.params.id, req.user.businessId);
  const [result] = await pool.query(
    `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND business_id = ?`,
    values
  );
  if (result.affectedRows === 0) throw new AppError('Product not found', 404);

  res.json({ success: true, message: 'Product updated' });
});

// DELETE /api/products/:id — soft delete
const deleteProduct = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'UPDATE products SET is_active = 0 WHERE id = ? AND business_id = ?',
    [req.params.id, req.user.businessId]
  );
  if (result.affectedRows === 0) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product removed' });
});

module.exports = { listProducts, getProduct, gstLookup, createProduct, updateProduct, deleteProduct };
