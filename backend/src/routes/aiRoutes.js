const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/chat', ctrl.chat);
router.get('/chat/history', ctrl.chatHistory);
router.get('/recommendations', ctrl.getRecommendations);
router.put('/recommendations/:id/dismiss', ctrl.dismissRecommendation);
router.get('/investment-advice', ctrl.getInvestmentAdvice);

module.exports = router;
