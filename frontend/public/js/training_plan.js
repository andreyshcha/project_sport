import { getToken, redirectIfNotAuthenticated } from '/js/auth.js';
redirectIfNotAuthenticated();

let currentPeriod = 'day'; // по умолчанию неделя

async function loadPlan(period) {
    let days = 7;
    if (period === 'day') days = 1;
    else if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    
    try {
        const response = await fetch(`/api/training/user/workouts/upcoming?days=${days}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load plan');
        const workouts = await response.json();
        renderPlan(workouts, period);
    } catch (error) {
        console.error('Error loading plan:', error);
        alert('Не удалось загрузить план');
    }
}

function renderPlan(workouts, period) {
    const difficultyMap = {
        'beginner': 'Новичок',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый'
    };

    const container = document.getElementById('plan-container');
    if (!container) return;
    container.innerHTML = '';
    if (workouts.length === 0) {
        container.innerHTML = '<div class="no-plan">Нет запланированных тренировок на выбранный период. Сгенерируйте план.</div>';
        return;
    }
    workouts.forEach(workout => {
        const date = new Date(workout.scheduledDate);
        let formattedDate = '';
        if (period === 'day') {
            formattedDate = 'Сегодня';
        } else {
            formattedDate = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'numeric', day: 'numeric' });
        }
        
        // Преобразуем уровень сложности
        const difficultyRu = difficultyMap[workout.difficulty] || workout.difficulty || 'Не указан';
        
        const card = document.createElement('div');
        card.className = 'workout-card';
        card.innerHTML = `
            <div class="workout-date">${formattedDate}</div>
            <h3>${escapeHtml(workout.name)}</h3>
            <p>${escapeHtml(workout.description || '')}</p>
            <div class="workout-meta">
                <span class="badge">${difficultyRu}</span>
                <span class="badge">${workout.exercises.length} упр.</span>
            </div>
            <ul>
                ${workout.exercises.map(ex => `<li>${escapeHtml(ex.exercise.name)} - ${ex.sets}×${ex.reps}</li>`).join('')}
            </ul>
            <button class="start-workout" data-id="${workout.id}">Начать тренировку</button>
        `;
        container.appendChild(card);
    });
    document.querySelectorAll('.start-workout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const workoutId = e.target.dataset.id;
            window.location.href = `/training.html?workout=${workoutId}`;
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Обработка кнопок периодов
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadPlan(currentPeriod);
        });
    });
    loadPlan(currentPeriod);
});