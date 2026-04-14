// profile.js
// const photoInput = document.getElementById('photo-upload');
// const profilePhoto = document.getElementById('profile-photo');

// photoInput.addEventListener('change', function(e) {
//     const file = e.target.files[0];
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = function(event) {
//             profilePhoto.src = event.target.result;
//         };
//         reader.readAsDataURL(file);
//     }
// });


import { getToken, getUser, redirectIfNotAuthenticated } from './auth.js';

// Проверка авторизации
redirectIfNotAuthenticated();

const API_BASE = '/api/profile';

// DOM элементы
const profileForm = document.getElementById('profile-form');
const userNameSpan = document.getElementById('user-name');
const editNameBtn = document.getElementById('edit-name-btn');

// Поля
const genderSelect = document.getElementById('gender');
const heightInput = document.getElementById('height');
const ageInput = document.getElementById('age');
const weightInput = document.getElementById('weight');
const hipsInput = document.getElementById('hips');
const chestInput = document.getElementById('chest');
const waistInput = document.getElementById('waist');
const bodyfatInput = document.getElementById('bodyfat');
const goalSelect = document.getElementById('goal');
const levelSelect = document.getElementById('level');
const equipmentCheckboxes = document.querySelectorAll('#equipment-group input');
const injuriesTextarea = document.getElementById('injuries');

// Фото (пока просто заглушка)
const photoInput = document.getElementById('photo-upload');
const changePhotoBtn = document.getElementById('change-photo-btn');
const profilePhoto = document.getElementById('profile-photo');

// Вспомогательные функции
function setFormData(data) {
    // имя пользователя
    if (data.name) {
        userNameSpan.textContent = data.name;
    }
    if (data.gender) genderSelect.value = data.gender;
    if (data.height) heightInput.value = data.height;
    if (data.age) ageInput.value = data.age;
    if (data.weight) weightInput.value = data.weight;
    if (data.hips) hipsInput.value = data.hips;
    if (data.chest) chestInput.value = data.chest;
    if (data.waist) waistInput.value = data.waist;
    if (data.bodyFat) bodyfatInput.value = data.bodyFat;
    if (data.goal) goalSelect.value = data.goal;
    if (data.level) levelSelect.value = data.level;

    // Оборудование
    if (data.equipment) {
        equipmentCheckboxes.forEach(cb => {
            cb.checked = !!data.equipment[cb.value];
        });
    }
    // Травмы
    if (data.injuries && Array.isArray(data.injuries)) {
        injuriesTextarea.value = data.injuries.join(', ');
    }
     if (data.photoUrl) {
        profilePhoto.src = data.photoUrl;
    }
}

function getFormData() {
    // Собираем оборудование
    const equipment = {};
    equipmentCheckboxes.forEach(cb => {
        equipment[cb.value] = cb.checked;
    });
    // Травмы
    const injuriesStr = injuriesTextarea.value.trim();
    const injuries = injuriesStr ? injuriesStr.split(',').map(s => s.trim()) : [];

    return {
        name: userNameSpan.textContent,
        gender: genderSelect.value,
        height: parseInt(heightInput.value),
        age: parseInt(ageInput.value),
        weight: parseFloat(weightInput.value),
        hips: parseFloat(hipsInput.value),
        chest: parseFloat(chestInput.value),
        waist: parseFloat(waistInput.value),
        goal: goalSelect.value,
        level: levelSelect.value,
        equipment,
        injuries
    };
}

// Загрузка профиля с сервера
async function loadProfile() {
    try {
        const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        console.log('Response status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const currentUser = getUser();
if (currentUser && data.name) {
    currentUser.name = data.name;
    localStorage.setItem('user', JSON.stringify(currentUser));
}
        console.log('Profile data:', data);
        setFormData(data);
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Ошибка загрузки профиля');
    }
}

// Сохранение профиля
async function saveProfile(event) {
    event.preventDefault();
    const formData = getFormData();
    try {
        const response = await fetch(API_BASE, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to save profile');
        const result = await response.json();
        alert('Профиль сохранён');
        const user = getUser();
if (user && formData.name) {
    user.name = formData.name;
    localStorage.setItem('user', JSON.stringify(user));
}
        if (result.profile && result.profile.bodyFat) {
            bodyfatInput.value = result.profile.bodyFat;
        }
        if (formData.name) {
            userNameSpan.textContent = formData.name;
        }
        // Можно также обновить другие поля, если они изменились на сервере
        // но для простоты достаточно обновить bodyFat
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Ошибка сохранения профиля');
    }
}

// Изменение имени (можно сделать модалку или prompt)
function editName() {
    const newName = prompt('Введите ваше имя:', userNameSpan.textContent);
    if (newName && newName.trim()) {
        userNameSpan.textContent = newName.trim();
        // Сразу сохраняем? Можно, но лучше при нажатии "Сохранить"
    }
}

// Обработчики
profileForm.addEventListener('submit', saveProfile);
editNameBtn.addEventListener('click', editName);

// Загрузка фото (предпросмотр)
changePhotoBtn.addEventListener('click', () => photoInput.click());
// Загрузка фото на сервер
photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Предпросмотр
    const reader = new FileReader();
    reader.onload = (event) => {
        profilePhoto.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Отправка на сервер
    const formData = new FormData();
    formData.append('photo', file);
    try {
        const response = await fetch('/api/profile/photo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        console.log('Photo uploaded:', data.photoUrl);
        // Если нужно, можно обновить фото в localStorage или просто оставить
    } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Ошибка загрузки фото');
    }
});

// Инициализация
loadProfile();