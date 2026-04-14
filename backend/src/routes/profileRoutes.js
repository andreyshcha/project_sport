const express = require('express');
const { getProfile, updateProfile, uploadPhoto } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.post('/photo', authMiddleware, upload.single('photo'), uploadPhoto);

module.exports = router;