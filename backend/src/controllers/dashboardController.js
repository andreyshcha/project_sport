const prisma = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekSessions = await prisma.trainingSession.findMany({
      where: {
        userId,
        date: { gte: weekAgo }
      }
    });

    const weeklyWorkoutsCount = weekSessions.length;
    const weeklyCalories = weekSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);

    // Следующая тренировка (по scheduledDate)
    const nextWorkout = await prisma.workout.findFirst({
      where: {
        userId,
        scheduledDate: { gte: now }
      },
      orderBy: { scheduledDate: 'asc' }
    });
    const nextWorkoutObj = nextWorkout ? { name: nextWorkout.name } : null;

    res.json({
      weeklyWorkoutsCount,
      weeklyCalories,
      nextWorkout: nextWorkoutObj
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};