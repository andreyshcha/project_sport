import { getToken, redirectIfNotAuthenticated } from '/js/auth.js';
redirectIfNotAuthenticated();

async function loadProgress() {
    try {
        const response = await fetch('/api/progress/summary', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load progress');
        const data = await response.json();

        const totalHours = Math.floor(data.totalDurationSec / 3600);
        const totalMinutes = Math.floor((data.totalDurationSec % 3600) / 60);
        document.getElementById('total-duration').textContent = `${totalHours} ч ${totalMinutes} мин`;
        document.getElementById('total-calories').textContent = `${data.totalCalories} ккал`;

        // Форматируем даты в ДД/ММ
        const labels = data.activityDays.map(d => {
            const parts = d.split('-');
            return `${parts[2]}/${parts[1]}`;
        });
        drawBarChart(data.activityMinutes, labels);
    } catch (error) {
        console.error('Error loading progress:', error);
        alert('Не удалось загрузить статистику');
    }
}

function drawBarChart(data, labels) {
    const canvas = document.getElementById('activityChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const barWidth = (width / data.length) * 0.7;
    const barSpacing = (width / data.length) * 0.3;
    const maxValue = Math.max(...data, 1);
    const scaleY = height / maxValue;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    for (let i = 0; i < data.length; i++) {
        const barHeight = data[i] * scaleY;
        const x = i * (barWidth + barSpacing) + barSpacing/2;
        const y = height - barHeight;

        ctx.fillStyle = '#007bff';
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#333';
        ctx.fillText(labels[i], x + barWidth/2, height - 5);

        if (data[i] > 0) {
            ctx.fillStyle = '#333';
            ctx.fillText(data[i] + ' мин', x + barWidth/2, y - 5);
        }
    }
}

document.addEventListener('DOMContentLoaded', loadProgress);