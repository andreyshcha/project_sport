import { getToken, getUser, redirectIfNotAuthenticated } from '/js/auth.js';

redirectIfNotAuthenticated();

async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/summary', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load dashboard');
        const data = await response.json();

        // Отображаем приветствие
        const user = getUser();
        if (user && user.name) {
            document.getElementById('username').textContent = user.name;
        }

        // Следующая тренировка
        if (data.nextWorkout) {
            document.querySelector('.workout-name').textContent = data.nextWorkout.name;
            // время пока оставляем как есть (заглушка)
        } else {
            document.querySelector('.next-workout-card').innerHTML = '<h3>Нет тренировок</h3><p>Создайте тренировку в админ-панели</p>';
        }

        // Статистика
        document.querySelector('.stats-preview .stat-card:first-child .stat-value').textContent = data.weeklyWorkoutsCount;
        document.querySelector('.stats-preview .stat-card:last-child .stat-value').textContent = data.weeklyCalories;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Можно показать заглушку
    }
}

// Кнопка "Начать тренировку" – перенаправляет на страницу тренировки
document.getElementById('start-workout-btn')?.addEventListener('click', () => {
    window.location.href = '/training.html';
});

document.addEventListener('DOMContentLoaded', loadDashboard);