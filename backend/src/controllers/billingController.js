const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { splitGst, round2 } = require('../utils/gst');
const { runAutomaticChecks } = require('../services/notificationService');

// POST /api/billing/invoices
// body: { customerId, items: [{ productId, quantity, discount }], discount, paymentMethod, isInterstate }
const createInvoice = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const { customerId, items, discount = 0, paymentMethod = 'cash', isInterstate = false, paymentStatus = 'paid' } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one line item is required', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    let costTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    const lineItemsToInsert = [];

    for (const item of items) {
      const [productRows] = await conn.query(
        'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
        [item.productId, businessId]
      );
      const product = productRows[0];
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404);
      if (product.quantity < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.quantity}`, 400);
      }

      const lineTotal = round2(product.selling_price * item.quantity);
      const lineDiscount = item.discount || 0;
      const taxableAmount = round2(lineTotal - lineDiscount);
      const { cgst, sgst, igst } = splitGst(taxableAmount, product.gst_rate, isInterstate);
      const cess = round2((taxableAmount * (product.cess_rate || 0)) / 100);

      subtotal += lineTotal;
      costTotal += product.buying_price * item.quantity;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalCess += cess;

      lineItemsToInsert.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.selling_price,
        buyingPrice: product.buying_price,
        gstRate: product.gst_rate,
        lineTotal: taxableAmount,
      });

      await conn.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, product.id]);
    }

    const grandTotal = round2(subtotal - discount + totalCgst + totalSgst + totalIgst + totalCess);

    // Generate a sequential invoice number per business
    const [[{ maxNum }]] = await conn.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)), 1000) AS maxNum
       FROM invoices WHERE business_id = ?`,
      [businessId]
    );
    const invoiceNumber = `INV-${Number(maxNum) + 1}`;

    const [invoiceResult] = await conn.query(
      `INSERT INTO invoices (
        business_id, customer_id, invoice_number, subtotal, discount, cgst, sgst, igst, cess,
        grand_total, cost_total, payment_method, payment_status, is_interstate
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        businessId, customerId || null, invoiceNumber, round2(subtotal), discount,
        round2(totalCgst), round2(totalSgst), round2(totalIgst), round2(totalCess),
        grandTotal, round2(costTotal), paymentMethod, paymentStatus, isInterstate ? 1 : 0,
      ]
    );
    const invoiceId = invoiceResult.insertId;

    for (const li of lineItemsToInsert) {
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, buying_price, gst_rate, line_total)
         VALUES (?,?,?,?,?,?,?,?)`,
        [invoiceId, li.productId, li.productName, li.quantity, li.unitPrice, li.buyingPrice, li.gstRate, li.lineTotal]
      );
    }

    if (customerId && paymentStatus !== 'paid') {
      await conn.query('UPDATE customers SET pending_balance = pending_balance + ? WHERE id = ?', [grandTotal, customerId]);
    }

    await conn.commit();

    // Fire-and-forget automatic checks (e.g. this sale pushed something into low-stock)
    runAutomaticChecks(businessId).catch((err) => console.error('Notification check failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Invoice created',
      invoice: {
        id: invoiceId,
        invoiceNumber,
        subtotal: round2(subtotal),
        discount,
        cgst: round2(totalCgst),
        sgst: round2(totalSgst),
        igst: round2(totalIgst),
        cess: round2(totalCess),
        grandTotal,
        items: lineItemsToInsert,
      },
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// GET /api/billing/invoices
const listInvoices = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;
  let sql = `SELECT i.*, c.name AS customer_name FROM invoices i
             LEFT JOIN customers c ON c.id = i.customer_id WHERE i.business_id = ?`;
  const params = [req.user.businessId];

  if (from && to) {
    sql += ' AND i.created_at BETWEEN ? AND ?';
    params.push(from, to);
  }
  if (status) {
    sql += ' AND i.payment_status = ?';
    params.push(status);
  }
  sql += ' ORDER BY i.created_at DESC LIMIT 200';

  const [rows] = await pool.query(sql, params);
  res.json({ success: true, invoices: rows });
});

// GET /api/billing/invoices/:id
const getInvoice = asyncHandler(async (req, res) => {
  const [invoiceRows] = await pool.query(
    `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone
     FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.id = ? AND i.business_id = ?`,
    [req.params.id, req.user.businessId]
  );
  if (invoiceRows.length === 0) throw new AppError('Invoice not found', 404);

  const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
  res.json({ success: true, invoice: { ...invoiceRows[0], items } });
});

module.exports = { createInvoice, listInvoices, getInvoice };
