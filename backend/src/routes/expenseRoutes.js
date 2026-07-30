const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.listExpenses);
router.post('/', ctrl.createExpense);

module.exports = router;
