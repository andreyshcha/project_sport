// const fetch = require('node-fetch');

async function generateWorkoutPlan(userContext, userMessage) {
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
    
    const prompt = `Ты — персональный фитнес-тренер. 
    Данные пользователя:
    - Цель: ${userContext.goal || 'не указана'}
    - Уровень: ${userContext.level || 'не указан'}
    - Инвентарь: ${userContext.equipment ? Object.keys(userContext.equipment).filter(k => userContext.equipment[k]).join(', ') : 'не указан'}
    - Травмы: ${userContext.injuries?.join(', ') || 'нет'}
    
    Пользователь спрашивает: "${userMessage}"
    
    Дай структурированный ответ с конкретными упражнениями, подходами и повторениями.`;

    const body = {
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
            stream: false,
            temperature: 0.6,
            maxTokens: 4000
        },
        messages: [
            {
                role: "system",
                text: "Ты профессиональный фитнес-тренер. Отвечай кратко, по делу, используй списки упражнений с подходами и повторениями."
            },
            {
                role: "user",
                text: prompt
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
                'x-folder-id': process.env.YANDEX_FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Yandex API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const reply = data.result?.alternatives?.[0]?.message?.text;
        
        if (!reply) {
            throw new Error('Invalid response structure from Yandex API');
        }
        
        return reply;
    } catch (error) {
        console.error('Yandex GPT API error:', error);
        throw new Error('Не удалось получить ответ от ИИ-тренера');
    }
}

module.exports = { generateWorkoutPlan };