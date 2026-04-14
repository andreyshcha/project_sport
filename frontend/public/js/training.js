import { getToken, redirectIfNotAuthenticated } from '/js/auth.js';
redirectIfNotAuthenticated();

let currentWorkout = null;
let exercises = [];
let currentExerciseIndex = 0;
let currentSetIndex = 0;
let totalRounds = 3;          // количество кругов (можно задать или брать из плана)
let currentRound = 1;
let timerSeconds = 0;
let timerInterval = null;
let isPaused = false;
let completedSets = [];

// DOM элементы
const previewMode = document.getElementById('preview-mode');
const activeMode = document.getElementById('active-mode');
const completionMode = document.getElementById('completion-mode');
const exercisesListDiv = document.getElementById('exercises-list');
const startBtn = document.getElementById('start-training-btn');
const completeBtn = document.getElementById('complete-btn');
const pauseBtn = document.getElementById('pause-btn');
const endTrainingBtn = document.getElementById('end-training-btn');
const timerDisplay = document.querySelector('.timer-display');
const currentExerciseImg = document.getElementById('current-exercise-img');
const currentExerciseName = document.getElementById('current-exercise-name');
const currentExerciseDesc = document.getElementById('current-exercise-desc');
const goHomeBtn = document.getElementById('go-home-btn');
const currentRoundSpan = document.getElementById('current-round');
const totalRoundsSpan = document.getElementById('total-rounds');

// Создаём блок для информации о подходах
const setInfo = document.createElement('div');
setInfo.className = 'set-info';
document.querySelector('.current-exercise-card').appendChild(setInfo);

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timerSeconds);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused) {
            timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showCurrentExercise() {
    const ex = exercises[currentExerciseIndex];
    currentExerciseName.textContent = ex.name;
    currentExerciseDesc.textContent = ex.description;
    currentExerciseImg.src = ex.image;

    const exerciseNumber = currentExerciseIndex + 1;
    const totalExercises = exercises.length;
    const setNumber = currentSetIndex + 1;
    const totalSets = ex.sets;
    const reps = ex.reps;

    setInfo.innerHTML = `
        <div>Упражнение ${exerciseNumber} из ${totalExercises}</div>
        <div>Подход ${setNumber} из ${totalSets}</div>
        <div>Повторений: ${reps}</div>
    `;
}

function completeCurrentSet() {
    const ex = exercises[currentExerciseIndex];
    // Фиксируем подход (вес 0)
    completedSets.push({
        exerciseId: ex.id,
        sets: [{ weight: 0, reps: ex.reps }]
    });

    // Переход к следующему подходу
    if (currentSetIndex + 1 < ex.sets) {
        currentSetIndex++;
        showCurrentExercise();
    } else {
        // Переход к следующему упражнению
        currentSetIndex = 0;
        if (currentExerciseIndex + 1 < exercises.length) {
            currentExerciseIndex++;
            showCurrentExercise();
        } else {
            // Круг завершён
            if (currentRound < totalRounds) {
                currentRound++;
                currentRoundSpan.textContent = currentRound;
                currentExerciseIndex = 0;
                currentSetIndex = 0;
                showCurrentExercise();
            } else {
                endTraining(true);
            }
        }
    }
}

function endTraining(isComplete = false) {
    stopTimer();
    if (isComplete) {
        activeMode.style.display = 'none';
        completionMode.style.display = 'block';
        window.lastTrainingDuration = timerSeconds;
        window.completedSets = completedSets;
    } else {
        activeMode.style.display = 'none';
        previewMode.style.display = 'block';
        resetTrainingState();
    }
}

function resetTrainingState() {
    currentRound = 1;
    currentExerciseIndex = 0;
    currentSetIndex = 0;
    timerSeconds = 0;
    isPaused = false;
    updateTimerDisplay();
    completedSets = [];
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    pauseBtn.textContent = 'Пауза';
    if (currentRoundSpan) currentRoundSpan.textContent = currentRound;
    if (totalRoundsSpan) totalRoundsSpan.textContent = totalRounds;
}

function startTraining() {
    previewMode.style.display = 'none';
    activeMode.style.display = 'block';
    resetTrainingState();
    showCurrentExercise();
    startTimer();
}

function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Возобновить' : 'Пауза';
}

async function saveTrainingResult(rating) {
    const durationSec = window.lastTrainingDuration;
    const setsData = window.completedSets || [];

    const payload = {
        workoutId: currentWorkout.id,
        durationSec,
        rating,
        exercises: setsData.map((ex, idx) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            orderIndex: idx
        }))
    };

    try {
        const response = await fetch('/api/training/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to save training');
        console.log('Training saved');
        goHome();
    } catch (error) {
        console.error('Error saving training:', error);
        alert('Ошибка сохранения тренировки');
        goHome();
    }
}

function goHome() {
    window.location.href = '/';
}

async function loadWorkout() {
    const urlParams = new URLSearchParams(window.location.search);
    const workoutId = urlParams.get('workout');
    let url;
    if (workoutId) {
        url = `/api/training/workout/${workoutId}`;
    } else {
        url = '/api/training/current';
    }
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load workout');
        currentWorkout = await response.json();
        exercises = currentWorkout.exercises;
        renderPreviewList();
    } catch (error) {
        console.error('Error loading workout:', error);
        alert('Не удалось загрузить тренировку');
    }
}

function renderPreviewList() {
    exercisesListDiv.innerHTML = '';
    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-preview-card';
        card.innerHTML = `
            <img src="${ex.image}" alt="${ex.name}" class="preview-img">
            <div class="preview-info">
                <h3>${ex.name}</h3>
                <p>${ex.description.substring(0, 80)}...</p>
                <small>${ex.sets} × ${ex.reps}</small>
            </div>
        `;
        exercisesListDiv.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadWorkout();
    startBtn.addEventListener('click', startTraining);
    completeBtn.addEventListener('click', completeCurrentSet);
    pauseBtn.addEventListener('click', togglePause);
    endTrainingBtn.addEventListener('click', () => endTraining(false));
    goHomeBtn.addEventListener('click', goHome);

    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rating = e.target.getAttribute('data-rating');
            saveTrainingResult(rating);
        });
    });
});