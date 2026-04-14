const prisma = require('../config/db');

// Получить все упражнения с группами мышц

exports.getAllExercises = async (req, res) => {
    try {
        const exercises = await prisma.exercise.findMany({
            include: {
                muscleGroups: true,
                workoutExercises: {
                    include: {
                        workout: true
                    }
                }
            }
        });
        const formatted = exercises.map(ex => ({
            ...ex,
            muscleGroups: ex.muscleGroups.map(mg => mg.muscleGroup),
            workouts: ex.workoutExercises.map(we => we.workout) // массив тренировок
        }));
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Создать упражнение
exports.createExercise = async (req, res) => {
  try {
    const { name, description, imageUrl, type, difficulty, met, muscleGroups } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const exercise = await prisma.exercise.create({
      data: {
        name,
        description,
        imageUrl,
        type,
        difficulty,
        met: met ? parseFloat(met) : undefined,
        muscleGroups: {
          create: muscleGroups.map(mg => ({ muscleGroup: mg }))
        }
      }
    });
    res.status(201).json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Обновить упражнение
exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, type, difficulty, met, muscleGroups } = req.body;

    // Сначала удаляем старые группы мышц
    await prisma.exerciseMuscleGroup.deleteMany({
      where: { exerciseId: parseInt(id) }
    });

    const exercise = await prisma.exercise.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        imageUrl,
        type,
        difficulty,
        met: met ? parseFloat(met) : undefined,
        muscleGroups: {
          create: muscleGroups.map(mg => ({ muscleGroup: mg }))
        }
      }
    });
    res.json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Удалить упражнение
exports.deleteExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const exerciseId = parseInt(id);
        
        // Удаляем связанные записи
        await prisma.exerciseMuscleGroup.deleteMany({ where: { exerciseId } });
        await prisma.workoutExercise.deleteMany({ where: { exerciseId } });
        await prisma.sessionExercise.deleteMany({ where: { exerciseId } });
        await prisma.exerciseAlternative.deleteMany({ where: { exerciseId } });
        await prisma.exerciseAlternative.deleteMany({ where: { alternativeId: exerciseId } });
        
        // Теперь удаляем упражнение
        await prisma.exercise.delete({ where: { id: exerciseId } });
        
        res.json({ message: 'Exercise deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getExerciseById = async (req, res) => {
    try {
        const { id } = req.params;
        const exercise = await prisma.exercise.findUnique({
            where: { id: parseInt(id) },
            include: {
                muscleGroups: true,
                workoutExercises: {
                    include: { workout: true }
                }
            }
        });
        if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
        const formatted = {
            ...exercise,
            muscleGroups: exercise.muscleGroups.map(mg => mg.muscleGroup),
            workouts: exercise.workoutExercises.map(we => we.workout)
        };
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadExerciseImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = `/uploads/exercises/${req.file.filename}`;
        const exercise = await prisma.exercise.update({
            where: { id: parseInt(id) },
            data: { imageUrl }
        });
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error uploading exercise image:', error);
        res.status(500).json({ error: error.message });
    }
};

const fs = require('fs');
const path = require('path');

exports.uploadExercisePhoto = async (req, res) => {
    try {

        console.log('File received:', req.file);
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { id } = req.params;
        const photoUrl = `/uploads/exercises/${req.file.filename}`;

        // Обновляем упражнение
        await prisma.exercise.update({
            where: { id: parseInt(id) },
            data: { imageUrl: photoUrl }
        });

        res.json({ photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
};