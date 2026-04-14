import { getToken, getUser } from '/js/auth.js';

const user = getUser();
if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
}

const API_BASE = '/api/admin/workouts';
let allExercises = [];

const workoutsContainer = document.getElementById('workouts-container');
const modal = document.getElementById('workout-modal');
const modalTitle = document.getElementById('modal-title');
const workoutForm = document.getElementById('workout-form');
const closeModalBtn = document.getElementById('close-modal');
const addWorkoutBtn = document.getElementById('add-workout-btn');
const addExerciseRowBtn = document.getElementById('add-exercise-row');
const exercisesContainer = document.getElementById('exercises-list-container');

async function loadExercisesList() {
    try {
        const response = await fetch('/api/admin/exercises', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load exercises');
        allExercises = await response.json();
    } catch (error) {
        console.error('Error loading exercises:', error);
        alert('Ошибка загрузки упражнений');
    }
}

function renderExerciseRow(exerciseData, index) {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.setAttribute('data-index', index);
    row.innerHTML = `
        <div class="exercise-row-select">
            <select class="exercise-select" data-index="${index}" required>
                <option value="">Выберите упражнение</option>
                ${allExercises.map(ex => `<option value="${ex.id}" ${ex.id == exerciseData.exerciseId ? 'selected' : ''}>${escapeHtml(ex.name)}</option>`).join('')}
            </select>
        </div>
        <div class="exercise-row-fields">
            <input type="number" class="exercise-sets" placeholder="Подходы" value="${exerciseData.sets || ''}" step="1">
            <input type="number" class="exercise-reps" placeholder="Повторения" value="${exerciseData.reps || ''}" step="1">
            <input type="number" class="exercise-duration" placeholder="Время (сек)" value="${exerciseData.durationSec || ''}" step="1">
            <button type="button" class="remove-exercise-btn" data-index="${index}">✖</button>
        </div>
    `;
    return row;
}

function getExercisesFromRows() {
    const rows = document.querySelectorAll('.exercise-row');
    const exercises = [];
    rows.forEach(row => {
        const select = row.querySelector('.exercise-select');
        const exerciseId = parseInt(select.value);
        if (isNaN(exerciseId)) return;
        const sets = parseInt(row.querySelector('.exercise-sets').value) || null;
        const reps = parseInt(row.querySelector('.exercise-reps').value) || null;
        const durationSec = parseInt(row.querySelector('.exercise-duration').value) || null;
        exercises.push({ exerciseId, sets, reps, durationSec });
    });
    return exercises;
}

async function loadWorkouts() {
    try {
        const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load workouts');
        const workouts = await response.json();
        renderWorkouts(workouts);
    } catch (error) {
        console.error('Error loading workouts:', error);
        alert('Ошибка загрузки тренировок');
    }
}

function getWorkoutDifficultyLabel(diff) {
    const map = {
        'beginner': 'Новичок',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый'
    };
    return map[diff] || diff || 'Не указан';
}

function renderWorkouts(workouts) {
    workoutsContainer.innerHTML = '';
    workouts.forEach(workout => {
        const difficultyRu = getWorkoutDifficultyLabel(workout.difficulty);
        const card = document.createElement('div');
        card.className = 'workout-card';
        card.innerHTML = `
            <div class="workout-info">
                <h3>${escapeHtml(workout.name)}</h3>
                <p>${escapeHtml(workout.description || '')}</p>
                <div class="workout-meta">
                    <span class="badge">${difficultyRu}</span>
                    <span class="badge">${workout.exercises.length} упр.</span>
                </div>
            </div>
            <div class="workout-actions">
                <button class="btn-icon" data-id="${workout.id}" data-action="edit">✏️</button>
                <button class="btn-icon" data-id="${workout.id}" data-action="delete">🗑️</button>
            </div>
        `;
        workoutsContainer.appendChild(card);
    });
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteWorkout(parseInt(btn.dataset.id)));
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function openAddModal() {
    modalTitle.textContent = 'Добавить тренировку';
    document.getElementById('workout-id').value = '';
    document.getElementById('workout-name').value = '';
    document.getElementById('workout-description').value = '';
    document.getElementById('workout-difficulty').value = 'intermediate'; // по умолчанию средний
    exercisesContainer.innerHTML = '';
    addEmptyExerciseRow();
    refreshRemoveHandlers();
    modal.style.display = 'flex';
}

function refreshRemoveHandlers() {
    document.querySelectorAll('.remove-exercise-btn').forEach(btn => {
        btn.removeEventListener('click', removeExerciseRow);
        btn.addEventListener('click', removeExerciseRow);
    });
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch workout');
        const workout = await response.json();
        modalTitle.textContent = 'Редактировать тренировку';
        document.getElementById('workout-id').value = workout.id;
        document.getElementById('workout-name').value = workout.name;
        document.getElementById('workout-description').value = workout.description || '';
        document.getElementById('workout-difficulty').value = workout.difficulty || 'intermediate';
        exercisesContainer.innerHTML = '';
        if (workout.exercises && workout.exercises.length) {
            workout.exercises.forEach(ex => {
                const rowData = {
                    exerciseId: ex.exercise.id,
                    sets: ex.sets,
                    reps: ex.reps,
                    durationSec: ex.durationSec
                };
                const row = renderExerciseRow(rowData, 0);
                exercisesContainer.appendChild(row);
            });
        } else {
            addEmptyExerciseRow();
        }
        refreshRemoveHandlers();
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching workout:', error);
        alert('Не удалось загрузить тренировку');
    }
}

function addEmptyExerciseRow() {
    const emptyRow = renderExerciseRow({}, exercisesContainer.children.length);
    exercisesContainer.appendChild(emptyRow);
}

async function saveWorkout(event) {
    event.preventDefault();
    const id = document.getElementById('workout-id').value;
    const name = document.getElementById('workout-name').value.trim();
    if (!name) {
        alert('Название обязательно');
        return;
    }
    const description = document.getElementById('workout-description').value.trim();
    const difficulty = document.getElementById('workout-difficulty').value;
    const exercises = getExercisesFromRows();
    if (exercises.length === 0) {
        alert('Добавьте хотя бы одно упражнение');
        return;
    }
    const payload = { name, description: description || null, difficulty, exercises };
    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(payload)
            });
        }
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Save failed');
        }
        await loadWorkouts();
        modal.style.display = 'none';
    } catch (error) {
        console.error('Error saving workout:', error);
        alert('Ошибка сохранения: ' + error.message);
    }
}

async function deleteWorkout(id) {
    if (!confirm('Удалить тренировку?')) return;
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Delete failed');
        await loadWorkouts();
    } catch (error) {
        console.error('Error deleting workout:', error);
        alert('Ошибка удаления');
    }
}

function handleAddExerciseRow() {
    addEmptyExerciseRow();
    refreshRemoveHandlers();
}

function removeExerciseRow(event) {
    const row = event.target.closest('.exercise-row');
    if (row) row.remove();
    refreshRemoveHandlers();
}

function closeModal() {
    modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadExercisesList();
    await loadWorkouts();
    addWorkoutBtn.addEventListener('click', openAddModal);
    workoutForm.addEventListener('submit', saveWorkout);
    closeModalBtn.addEventListener('click', closeModal);
    addExerciseRowBtn.addEventListener('click', handleAddExerciseRow);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});