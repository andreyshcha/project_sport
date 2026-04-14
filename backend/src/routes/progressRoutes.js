const express = require('express');
const { getProgressSummary, getMeasurements, getMetric  } = require('../controllers/progressController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/summary', authMiddleware, getProgressSummary);
router.get('/measurements', authMiddleware, getMeasurements);
router.get('/metric', authMiddleware, getMetric);

module.exports = router;