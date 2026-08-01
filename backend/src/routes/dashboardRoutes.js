const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', ctrl.getSummary);
router.get('/charts', ctrl.getCharts);
router.get('/pl', ctrl.getProfitLoss);

module.exports = router;
