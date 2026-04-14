const prisma = require('../config/db');
const { generateWorkoutPlan } = require('../utils/aiClient');

function normalizeName(name) {
  return name.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/g, '');
}

exports.generatePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const userMessage = req.body.message || '';
    let daysCount = 7;

    const daysMatch = userMessage.match(/(\d+)\s*дн/i);
    if (daysMatch) {
      daysCount = parseInt(daysMatch[1]);
    } else if (userMessage.includes('неделя')) {
      daysCount = 7;
    } else if (userMessage.includes('месяц')) {
      daysCount = 30;
    }
    daysCount = Math.min(Math.max(daysCount, 1), 30);

    let actualDaysToGenerate = daysCount;
    let repeatCycles = 1;
    if (daysCount > 14) {
      actualDaysToGenerate = 14;
      repeatCycles = Math.ceil(daysCount / 14);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    await prisma.workoutExercise.deleteMany({ where: { workout: { userId } } });
    await prisma.workout.deleteMany({ where: { userId } });

    const exercises = await prisma.exercise.findMany();
    const exerciseList = exercises.map(ex => `- ${ex.name}`).join('\n');

    const userContext = {
      goal: user.profile?.goal,
      level: user.profile?.level,
      equipment: user.profile?.equipment,
      injuries: user.profile?.injuries,
      gender: user.profile?.gender,
      age: user.profile?.age,
      weight: user.profile?.weight
    };

    const prompt = `Ты — профессиональный фитнес-тренер. Составь персонализированный план тренировок ровно на ${actualDaysToGenerate} дней.
    
    Данные пользователя:
    - Цель: ${userContext.goal}
    - Уровень: ${userContext.level}
    - Инвентарь: ${Object.keys(userContext.equipment || {}).filter(k => userContext.equipment[k]).join(', ')}
    - Травмы/ограничения: ${userContext.injuries?.join(', ') || 'нет'}
    
    Список доступных упражнений (выбирай ТОЛЬКО из них, используй в точности такие же названия):
    ${exerciseList}
    
    Верни JSON строго в формате:
    {
      "days": [
        {
          "day": 1,
          "exercises": [
            { "name": "Название упражнения", "sets": 3, "reps": 10 }
          ]
        }
      ]
    }
    Дни отдыха отмечай как { "day": N, "rest": true }. Не добавляй упражнения в дни отдыха.
    Важно: количество дней в ответе должно быть строго равно ${actualDaysToGenerate}.`;

    const aiResponse = await generateWorkoutPlan(userContext, prompt);
    console.log('AI response:', aiResponse);

    let plan;
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        plan = JSON.parse(match[0]);
      } else {
        plan = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      return res.status(500).json({ error: 'AI вернул невалидный JSON' });
    }

    if (!plan.days || !Array.isArray(plan.days)) {
      return res.status(500).json({ error: 'Ответ AI не содержит массива days' });
    }

    if (plan.days.length > actualDaysToGenerate) plan.days = plan.days.slice(0, actualDaysToGenerate);
    while (plan.days.length < actualDaysToGenerate) {
      plan.days.push({ day: plan.days.length + 1, rest: true });
    }
    plan.days = plan.days.map(day => {
      if (day.rest) delete day.exercises;
      return day;
    });

    let allDays = [...plan.days];
    if (repeatCycles > 1) {
      for (let i = 1; i < repeatCycles; i++) {
        const shifted = plan.days.map(day => ({
          ...day,
          day: day.day + i * actualDaysToGenerate
        }));
        allDays = allDays.concat(shifted);
      }
      allDays = allDays.slice(0, daysCount);
    }

    const generatedPlan = await prisma.generatedPlan.create({
      data: {
        userId,
        planResult: allDays,
        conversation: [{ role: 'user', content: prompt }, { role: 'assistant', content: aiResponse }]
      }
    });

    const workouts = [];
    const startDate = new Date();
    for (const day of allDays) {
      if (day.rest) continue;
      const workoutDate = new Date(startDate);
      workoutDate.setDate(startDate.getDate() + (day.day - 1));
      const workout = await prisma.workout.create({
        data: {
          name: `День ${day.day}`,
          description: `Тренировка по сгенерированному плану`,
          difficulty: userContext.level,
          userId: userId,
          generatedPlanId: generatedPlan.id,
          scheduledDate: workoutDate,
          exercises: {
            create: await Promise.all(day.exercises.map(async (ex, idx) => {
              let normalizedInput = normalizeName(ex.name);
              let exercise = await prisma.exercise.findFirst({
                where: { name: { contains: ex.name, mode: 'insensitive' } }
              });
              if (!exercise) {
                const allEx = await prisma.exercise.findMany();
                exercise = allEx.find(e => normalizeName(e.name) === normalizedInput);
              }
              if (!exercise) {
                console.warn(`Exercise "${ex.name}" not found, skipping`);
                return null;
              }
              return {
                exerciseId: exercise.id,
                sets: ex.sets,
                reps: ex.reps,
                orderIndex: idx
              };
            })).then(results => results.filter(Boolean))
          }
        }
      });
      workouts.push(workout);
    }

    res.json({ message: 'План сохранён', workouts });
  } catch (error) {
    console.error('Generate plan error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    const userContext = {
      goal: user.profile?.goal,
      level: user.profile?.level,
      equipment: user.profile?.equipment,
      injuries: user.profile?.injuries,
      gender: user.profile?.gender,
      age: user.profile?.age,
      weight: user.profile?.weight
    };
    const response = await generateWorkoutPlan(userContext, message);
    await prisma.generatedPlan.create({
      data: {
        userId,
        conversation: [{ role: 'user', content: message }, { role: 'assistant', content: response }]
      }
    });
    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Ошибка генерации ответа' });
  }
};