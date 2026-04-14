const prisma = require('../config/db');

// Получить все тренировки с упражнениями
exports.getAllWorkouts = async (req, res) => {
    try {
        const workouts = await prisma.workout.findMany({
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });
        res.json(workouts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить одну тренировку по ID
exports.getWorkoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const workout = await prisma.workout.findUnique({
            where: { id: parseInt(id) },
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });
        if (!workout) return res.status(404).json({ error: 'Workout not found' });
        res.json(workout);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Создать тренировку
exports.createWorkout = async (req, res) => {
    try {
        const { name, description, difficulty, exercises } = req.body;
        const workout = await prisma.workout.create({
            data: {
                name,
                description,
                difficulty,
                exercises: {
                    create: exercises.map((ex, idx) => ({
                        exerciseId: ex.exerciseId,
                        sets: ex.sets,
                        reps: ex.reps,
                        durationSec: ex.durationSec,
                        orderIndex: idx
                    }))
                }
            },
            include: { exercises: { include: { exercise: true } } }
        });
        res.status(201).json(workout);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Обновить тренировку
exports.updateWorkout = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, difficulty, exercises } = req.body;
        // Удаляем старые связи
        await prisma.workoutExercise.deleteMany({ where: { workoutId: parseInt(id) } });
        // Обновляем основную запись
        const workout = await prisma.workout.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                difficulty,
                exercises: {
                    create: exercises.map((ex, idx) => ({
                        exerciseId: ex.exerciseId,
                        sets: ex.sets,
                        reps: ex.reps,
                        durationSec: ex.durationSec,
                        orderIndex: idx
                    }))
                }
            },
            include: { exercises: { include: { exercise: true } } }
        });
        res.json(workout);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Удалить тренировку
exports.deleteWorkout = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.workout.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Workout deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};