import { getToken, getUser } from '/js/auth.js';

const user = getUser();
if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
}

const API_BASE = '/api/admin/exercises';

const exercisesContainer = document.getElementById('exercises-container');
const modal = document.getElementById('exercise-modal');
const modalTitle = document.getElementById('modal-title');
const exerciseForm = document.getElementById('exercise-form');
const closeModalBtn = document.getElementById('close-modal');
const addExerciseBtn = document.getElementById('add-exercise-btn');

const allMuscleGroups = [
    "Грудь", "Спина", "Ноги", "Плечи", "Бицепс", "Трицепс",
    "Ягодицы", "Кор", "Сердечно-сосудистая"
];

function renderMuscleGroups() {
    const container = document.getElementById('muscle-groups');
    if (!container) return;
    container.innerHTML = '';
    allMuscleGroups.forEach(group => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${group}"> ${group}`;
        container.appendChild(label);
    });
}

function getSelectedMuscleGroups() {
    const checkboxes = document.querySelectorAll('#muscle-groups input:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function setSelectedMuscleGroups(groups) {
    const checkboxes = document.querySelectorAll('#muscle-groups input');
    checkboxes.forEach(cb => {
        cb.checked = groups.includes(cb.value);
    });
}

async function loadExercises() {
    try {
        const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load exercises');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Expected array');
        renderExercises(data);
    } catch (error) {
        console.error('Error loading exercises:', error);
        alert('Ошибка загрузки упражнений');
    }
}

function renderExercises(exercises) {
    exercisesContainer.innerHTML = '';
    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        let workoutsHtml = '';
if (ex.workouts && ex.workouts.length > 0) {
    if (ex.workouts.length > 2) {
        workoutsHtml = `
            <div class="exercise-workouts">
                <span class="workouts-label">Используется в нескольких тренировках</span>
            </div>
        `;
    } else {
        workoutsHtml = `
            <div class="exercise-workouts">
                <span class="workouts-label">Используется в:</span>
                ${ex.workouts.map(w => `<span class="badge workout-badge">${escapeHtml(w.name)}</span>`).join('')}
            </div>
        `;
    }
} else {
    workoutsHtml = `<div class="exercise-workouts"><span class="workouts-label">Не используется в тренировках</span></div>`;
}
        card.innerHTML = `
            <img src="${ex.imageUrl || '/assets/default_photo.png'}" class="exercise-img" onerror="this.src='/assets/default_photo.png'">
            <div class="exercise-info">
                <h3>${escapeHtml(ex.name)}</h3>
                <p>${escapeHtml(ex.description?.substring(0, 100) || '')}${ex.description?.length > 100 ? '...' : ''}</p>
                <div class="exercise-meta">
                    <span class="badge">${getTypeLabel(ex.type)}</span>
                    <span class="badge">${getDifficultyLabel(ex.difficulty)}</span>
                    ${ex.muscleGroups.map(mg => `<span class="badge">${escapeHtml(mg)}</span>`).join('')}
                </div>
                ${workoutsHtml}
                <div class="exercise-actions">
                    <button class="btn-icon" data-id="${ex.id}" data-action="edit">✏️</button>
                    <button class="btn-icon" data-id="${ex.id}" data-action="delete">🗑️</button>
                </div>
            </div>
        `;
        exercisesContainer.appendChild(card);
    });
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteExercise(parseInt(btn.dataset.id)));
    });
}

function getTypeLabel(type) {
    const types = { strength: 'Силовое', cardio: 'Кардио', flexibility: 'Гибкость', other: 'Другое' };
    return types[type] || type;
}
function getDifficultyLabel(diff) {
    const diffs = { easy: 'Легкая', medium: 'Средняя', hard: 'Высокая' };
    return diffs[diff] || diff;
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

async function saveExercise(event) {
    event.preventDefault();
    const id = document.getElementById('exercise-id').value;
    const name = document.getElementById('exercise-name').value.trim();
    if (!name) {
        alert('Название обязательно');
        return;
    }
    const imageUrl = document.getElementById('exercise-image').value.trim();
    const description = document.getElementById('exercise-description').value.trim();
    const type = document.getElementById('exercise-type').value;
    const difficulty = document.getElementById('exercise-difficulty').value;
    const met = document.getElementById('exercise-met').value;
    const muscleGroups = getSelectedMuscleGroups();

    const payload = {
        name,
        imageUrl: imageUrl || null,
        description: description || null,
        type,
        difficulty,
        met: met ? parseFloat(met) : null,
        muscleGroups
    };

    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });
        }
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Save failed');
        }
        const saved = await response.json();
        const exerciseId = saved.id;

        const fileInput = document.getElementById('exercise-photo');
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('photo', fileInput.files[0]);
            const uploadResponse = await fetch(`${API_BASE}/${exerciseId}/photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            if (!uploadResponse.ok) {
                console.error('Photo upload failed');
            }
        }

        await loadExercises();
        modal.style.display = 'none';
    } catch (error) {
        console.error('Error saving exercise:', error);
        alert('Ошибка сохранения: ' + error.message);
    }
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch exercise');
        const ex = await response.json();
        modalTitle.textContent = 'Редактировать упражнение';
        document.getElementById('exercise-id').value = ex.id;
        document.getElementById('exercise-name').value = ex.name;
        document.getElementById('exercise-image').value = ex.imageUrl || '';
        document.getElementById('exercise-description').value = ex.description || '';
        document.getElementById('exercise-type').value = ex.type || 'strength';
        document.getElementById('exercise-difficulty').value = ex.difficulty || 'medium';
        document.getElementById('exercise-met').value = ex.met || '';
        setSelectedMuscleGroups(ex.muscleGroups);

        const workoutsListDiv = document.getElementById('exercise-workouts-list');
        if (workoutsListDiv) {
            if (ex.workouts && ex.workouts.length) {
                workoutsListDiv.innerHTML = ex.workouts.map(w => `<span class="badge workout-badge">${escapeHtml(w.name)}</span>`).join('');
            } else {
                workoutsListDiv.innerHTML = '<span class="badge">Не используется</span>';
            }
        }

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching exercise:', error);
        alert('Не удалось загрузить упражнение');
    }
}

function openAddModal() {
    modalTitle.textContent = 'Добавить упражнение';
    document.getElementById('exercise-id').value = '';
    document.getElementById('exercise-name').value = '';
    document.getElementById('exercise-image').value = '';
    document.getElementById('exercise-description').value = '';
    document.getElementById('exercise-type').value = 'strength';
    document.getElementById('exercise-difficulty').value = 'medium';
    document.getElementById('exercise-met').value = '';
    setSelectedMuscleGroups([]);
    const workoutsListDiv = document.getElementById('exercise-workouts-list');
    if (workoutsListDiv) workoutsListDiv.innerHTML = '<span class="badge">Не используется</span>';
    modal.style.display = 'flex';
}

async function deleteExercise(id) {
    if (!confirm('Удалить упражнение?')) return;
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Delete failed');
        await loadExercises();
    } catch (error) {
        console.error('Error deleting exercise:', error);
        alert('Ошибка удаления');
    }
}

function closeModal() {
    modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    renderMuscleGroups();
    loadExercises();
    addExerciseBtn.addEventListener('click', openAddModal);
    exerciseForm.addEventListener('submit', saveExercise);
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});