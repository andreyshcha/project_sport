const express = require('express');
const {
    getCurrentWorkout,
    completeTraining,
    getHistory,
    getUserWorkouts,  
    getWorkoutById,
    getUpcomingWorkouts
} = require('../controllers/trainingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/current', authMiddleware, getCurrentWorkout);
router.post('/complete', authMiddleware, completeTraining);
router.get('/history', authMiddleware, getHistory);
router.get('/user/workouts', authMiddleware, getUserWorkouts); // GET /api/training/user/workouts
router.get('/workout/:id', authMiddleware, getWorkoutById);   // GET /api/training/workout/:id
router.get('/user/workouts/upcoming', authMiddleware, getUpcomingWorkouts);

module.exports = router;