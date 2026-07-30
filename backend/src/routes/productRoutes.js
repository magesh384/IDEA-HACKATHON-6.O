const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.listProducts);
router.get('/gst-lookup/:hsnCode', ctrl.gstLookup);
router.get('/:id', ctrl.getProduct);
router.post('/', ctrl.createProduct);
router.put('/:id', ctrl.updateProduct);
router.delete('/:id', ctrl.deleteProduct);

module.exports = router;
