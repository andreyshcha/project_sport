const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getAllExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    uploadExercisePhoto   // ← импортируем
} = require('../controllers/adminExercisesController');

const router = express.Router();

// Настройка хранилища для упражнений
const uploadDir = path.join(__dirname, '../../../frontend/public/uploads/exercises');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `exercise-${req.params.id}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Маршруты
router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);
router.post('/:id/photo', upload.single('photo'), uploadExercisePhoto); // ← загрузка фото

console.log('Upload directory:', uploadDir);

module.exports = router;