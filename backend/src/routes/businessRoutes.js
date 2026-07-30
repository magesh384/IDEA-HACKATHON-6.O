const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/businessController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/register', ctrl.registerBusiness);
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);

module.exports = router;
