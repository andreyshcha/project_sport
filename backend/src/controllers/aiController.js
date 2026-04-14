const prisma = require('../config/db');
const { generateWorkoutPlan } = require('../utils/aiClient');

exports.chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;
        
        // Получаем профиль пользователя для контекста
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
        
        // Сохраняем диалог в базу (опционально)
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