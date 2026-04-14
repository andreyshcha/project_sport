const express = require('express');
const { chat, generatePlan } = require('../controllers/aiPlanController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/chat', authMiddleware, chat);
router.post('/generate-plan', authMiddleware, generatePlan);

module.exports = router;