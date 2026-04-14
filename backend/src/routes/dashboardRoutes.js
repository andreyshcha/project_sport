const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/summary', authMiddleware, getDashboard); // или '/'

module.exports = router;