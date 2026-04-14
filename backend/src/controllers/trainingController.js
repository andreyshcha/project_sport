const prisma = require('../config/db');

// Получить текущую тренировку (пока первую из базы)
exports.getCurrentWorkout = async (req, res) => {
    try {
        const workout = await prisma.workout.findFirst({
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });
        if (!workout) return res.status(404).json({ error: 'Нет тренировок' });
        const formatted = {
            id: workout.id,
            name: workout.name,
            description: workout.description,
            difficulty: workout.difficulty,
            exercises: workout.exercises.map(we => ({
                id: we.exercise.id,
                name: we.exercise.name,
                description: we.exercise.description,
                image: we.exercise.imageUrl || '/assets/default_photo.png',
                sets: we.sets,
                reps: we.reps,
                durationSec: we.durationSec
            }))
        };
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Завершить тренировку с расчётом калорий
exports.completeTraining = async (req, res) => {
    try {
        const { workoutId, durationSec, rating, exercises } = req.body;
        const userId = req.user.id;

        // 1. Получаем вес пользователя
        const userProfile = await prisma.userProfile.findUnique({
            where: { userId },
            select: { weight: true }
        });
        const weightKg = userProfile?.weight || 70; // по умолчанию 70 кг

        // 2. Получаем MET для каждого упражнения
        const exerciseIds = exercises.map(ex => ex.exerciseId);
        const exerciseMetData = await prisma.exercise.findMany({
            where: { id: { in: exerciseIds } },
            select: { id: true, met: true }
        });
        const metMap = Object.fromEntries(exerciseMetData.map(e => [e.id, e.met || 5]));

        // 3. Рассчитываем средний MET и калории
        const totalMet = exercises.reduce((sum, ex) => sum + (metMap[ex.exerciseId] || 5), 0);
        const avgMet = totalMet / exercises.length;
        const durationHours = durationSec / 3600;
        const caloriesBurned = Math.round(weightKg * avgMet * durationHours);

        // 4. Создаём сессию с калориями
        const session = await prisma.trainingSession.create({
            data: {
                userId,
                workoutId,
                durationSec,
                rating,
                caloriesBurned,
                exercises: {
                    create: exercises.map((ex, idx) => ({
                        exerciseId: ex.exerciseId,
                        setsJson: ex.sets,
                        orderIndex: idx,
                        startTime: ex.startTime ? new Date(ex.startTime) : undefined,
                        endTime: ex.endTime ? new Date(ex.endTime) : undefined
                    }))
                }
            }
        });
        res.status(201).json({ sessionId: session.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить историю тренировок (с калориями)
exports.getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await prisma.trainingSession.findMany({
            where: { userId },
            include: {
                workout: true,
                exercises: {
                    include: { exercise: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить все тренировки пользователя (личные сгенерированные планы)
exports.getUserWorkouts = async (req, res) => {
    try {
        const userId = req.user.id;
        const workouts = await prisma.workout.findMany({
            where: { userId },
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { orderIndex: 'asc' }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(workouts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить тренировку по ID (для старта)
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
        const formatted = {
            id: workout.id,
            name: workout.name,
            description: workout.description,
            difficulty: workout.difficulty,
            exercises: workout.exercises.map(we => ({
                id: we.exercise.id,
                name: we.exercise.name,
                description: we.exercise.description,
                image: we.exercise.imageUrl || '/assets/default_photo.png',
                sets: we.sets,
                reps: we.reps,
                durationSec: we.durationSec
            }))
        };
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить предстоящие тренировки на указанное количество дней (требуется поле scheduledDate)
exports.getUpcomingWorkouts = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 1;
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        scheduledDate: {
          gte: today,
          lt: endDate
        }
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });
    res.json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};