import { getToken, redirectIfNotAuthenticated } from './auth.js';
redirectIfNotAuthenticated();

let chart = null;
const ctx = document.getElementById('progressChart').getContext('2d');

async function loadMetric(metric, period) {
  try {
    const response = await fetch(`/api/progress/metric?metric=${metric}&period=${period}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!response.ok) throw new Error('Failed to load metric');
    const data = await response.json();
    updateChart(data.labels, data.values, metric);
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить данные');
  }
}

function updateChart(labels, values, metric) {
  const metricLabels = {
    weight: 'Вес (кг)',
    hips: 'Бёдра (см)',
    chest: 'Грудь (см)',
    waist: 'Талия (см)',
    bodyFat: '% жира'
  };
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: metricLabels[metric] || metric,
        data: values,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0,123,255,0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        tooltip: { enabled: true },
        legend: { position: 'top' }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const metricSelect = document.getElementById('metric-select');
  const periodBtns = document.querySelectorAll('.filter-btn');
  if (!metricSelect) {
    console.error('Element #metric-select not found');
    return;
  }
  let currentPeriod = 'month';

  metricSelect.addEventListener('change', () => {
    loadMetric(metricSelect.value, currentPeriod);
  });
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      loadMetric(metricSelect.value, currentPeriod);
    });
  });
  loadMetric('weight', 'month');
});