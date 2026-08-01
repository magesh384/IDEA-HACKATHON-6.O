const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/invoices', ctrl.createInvoice);
router.get('/invoices', ctrl.listInvoices);
router.get('/invoices/:id', ctrl.getInvoice);

module.exports = router;
