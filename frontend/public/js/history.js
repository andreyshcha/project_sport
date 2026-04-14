import { getToken, redirectIfNotAuthenticated } from '/js/auth.js';
redirectIfNotAuthenticated();

async function loadHistory() {
    try {
        const response = await fetch('/api/training/history', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load history');
        const sessions = await response.json();
        renderHistory(sessions);
    } catch (error) {
        console.error('Error loading history:', error);
        alert('Не удалось загрузить историю');
    }
}

function renderHistory(sessions) {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';
    if (sessions.length === 0) {
        container.innerHTML = '<div class="history-item">Нет завершённых тренировок</div>';
        return;
    }
    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const date = new Date(session.date).toLocaleDateString('ru-RU');
        const workoutName = session.workout ? session.workout.name : 'Тренировка';
        const durationMin = Math.floor(session.durationSec / 60);
        const ratingText = {
            easy: 'Легко',
            normal: 'Нормально',
            hard: 'Тяжело'
        }[session.rating] || '—';
        item.innerHTML = `
            <div class="history-date">${date}</div>
            <div class="history-workout">${workoutName}</div>
            <div class="history-duration">${durationMin} мин</div>
            <div class="history-rating">Оценка: ${ratingText}</div>
        `;
        container.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', loadHistory);