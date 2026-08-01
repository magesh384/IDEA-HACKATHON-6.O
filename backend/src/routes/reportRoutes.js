const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/gst", ctrl.gstReport);
router.get("/profit-loss", ctrl.profitLossReport);
router.get("/invoices", ctrl.invoiceReport);
router.get("/expenses", ctrl.expenseReport);

module.exports = router;
