const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.listCustomers);
router.post('/', ctrl.createCustomer);
router.get('/:id/insights', ctrl.getCustomerInsights);

module.exports = router;
