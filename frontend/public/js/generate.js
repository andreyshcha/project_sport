import { getToken, redirectIfNotAuthenticated } from '/js/auth.js';
redirectIfNotAuthenticated();

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    if (isUser) {
        contentDiv.textContent = text;
    } else {
        contentDiv.innerHTML = formatMarkdown(text);
    }
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    userInput.value = '';
    userInput.style.height = 'auto';

    const typingIndicator = addMessage('...', false);
    typingIndicator.classList.add('typing');

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Ошибка сервера');
        }

        const data = await response.json();
        typingIndicator.remove();

        // Добавляем ответ AI
        addMessage(data.response, false);

        // Добавляем кнопку "Сохранить план" (если ответ содержит план)
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Сохранить план';
        saveButton.className = 'action-btn';
        saveButton.addEventListener('click', async () => {
                const saveResponse = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ message: text }) // text - последний запрос пользователя
    });
            try {
                const saveResponse = await fetch('/api/ai/generate-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ message: text }) // передаём исходный запрос
                });
                if (saveResponse.ok) {
                    alert('План сохранён!');
                    window.location.href = '/training_plan.html';
                } else {
                    const err = await saveResponse.json();
                    alert('Ошибка сохранения: ' + (err.error || 'Неизвестная ошибка'));
                }
            } catch (err) {
                console.error('Save error:', err);
                alert('Ошибка сохранения плана');
            }
        });
        chatMessages.appendChild(saveButton);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Chat error:', error);
        typingIndicator.remove();
        addMessage('Извините, произошла ошибка. Попробуйте позже.', false);
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

function formatMarkdown(text) {
    // Экранируем HTML
    let safe = text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });

    // Обработка заголовков вида "День 1", "День 2", "Неделя 1" и т.п. (без #)
    safe = safe.replace(/^(День\s+\d+.*)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^(Неделя\s+\d+.*)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^(Месяц\s+\d+.*)$/gm, '<h3>$1</h3>');
    
    // Заголовки с решётками
    safe = safe.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    safe = safe.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    safe = safe.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Жирный текст
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Курсив – временно защищаем маркеры списка в начале строки
    safe = safe.replace(/^\* /gm, '___LIST_MARKER___');
    safe = safe.replace(/^\-\s/gm, '___LIST_MARKER___');
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safe = safe.replace(/___LIST_MARKER___/g, '- ');

    // Списки: строки, начинающиеся с цифры с точкой или дефиса
    safe = safe.replace(/^(\d+\.)\s+(.*)$/gm, '<li>$2</li>');
    safe = safe.replace(/^-\s+(.*)$/gm, '<li>$1</li>');

    // Обёртка последовательных <li> в <ul>
    safe = safe.replace(/(<li>.*<\/li>\n?)+/gm, function(match) {
        return '<ul>' + match + '</ul>';
    });

    // Переносы строк
    safe = safe.replace(/\n/g, '<br>');

    // Удаляем лишние <br> внутри заголовков и списков (опционально)
    safe = safe.replace(/<(h[1-4])>(.*?)<\/\1>/g, function(match, tag, content) {
        return '<' + tag + '>' + content.replace(/<br>/g, ' ') + '</' + tag + '>';
    });
    safe = safe.replace(/<li>(.*?)<\/li>/g, function(match, content) {
        return '<li>' + content.replace(/<br>/g, ' ') + '</li>';
    });
    safe = safe.replace(/\*/g, '-');

    return safe;
}