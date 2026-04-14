const prisma = require('../config/db');

function getMoscowDate(date) {
    return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}

function getMondayOfWeek(date) {
    const mskDate = getMoscowDate(date);
    const day = mskDate.getDay(); // 0 - воскресенье, 1 - понедельник, ...
    const diff = (day === 0 ? 6 : day - 1); // сколько дней назад до понедельника
    const monday = new Date(mskDate);
    monday.setDate(mskDate.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    // возвращаем UTC дату без смещения (для хранения в Map)
    const mondayUTC = new Date(monday.getTime() - 3 * 60 * 60 * 1000);
    return mondayUTC;
}

exports.getProgressSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await prisma.trainingSession.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        });

        // Определяем понедельник текущей недели в московском времени
        const now = new Date();
        const mondayUTC = getMondayOfWeek(now);
        const activityMap = {};
        // Создаём даты для 7 дней (пн, вт, ср, чт, пт, сб, вс)
        for (let i = 0; i < 7; i++) {
            const day = new Date(mondayUTC);
            day.setDate(mondayUTC.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            activityMap[dateStr] = 0;
        }

        sessions.forEach(s => {
            // Преобразуем дату сессии в московскую строку
            const mskDate = new Date(s.date.getTime() + 3 * 60 * 60 * 1000);
            const dateStr = mskDate.toISOString().split('T')[0];
            if (activityMap[dateStr] !== undefined) {
                activityMap[dateStr] += s.durationSec ? Math.floor(s.durationSec / 60) : 0;
            }
        });

        const activityDays = Object.keys(activityMap).sort();
        const activityMinutes = activityDays.map(day => activityMap[day]);

        const totalDurationSec = sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
        const totalCalories = sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);

        res.json({
            totalDurationSec,
            totalCalories,
            activityMinutes,
            activityDays
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getMeasurements = async (req, res) => {
    try {
        const userId = req.user.id;
        const measurements = await prisma.userMeasurement.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        });
        res.json(measurements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMetric = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metric, period } = req.query;
    let startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate = new Date(0);
    const measurements = await prisma.userMeasurement.findMany({
      where: { userId, date: { gte: startDate } },
      orderBy: { date: 'asc' }
    });
    const labels = measurements.map(m => m.date.toISOString().split('T')[0]);
    const values = measurements.map(m => m[metric]);
    res.json({ labels, values });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};