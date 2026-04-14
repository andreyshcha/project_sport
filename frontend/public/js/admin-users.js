import { getToken, getUser } from '/js/auth.js';

const user = getUser();
if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
}

const API_BASE = '/api/admin/users';

const usersContainer = document.getElementById('users-container');
const modal = document.getElementById('user-modal');
const modalTitle = document.getElementById('modal-title');
const userForm = document.getElementById('user-form');
const closeModalBtn = document.getElementById('close-modal');

// Загрузка списка пользователей
async function loadUsers() {
    try {
        const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Ошибка загрузки пользователей');
    }
}

// Отображение карточек пользователей
function renderUsers(users) {
    usersContainer.innerHTML = '';
    users.forEach(u => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `
            <div class="user-info">
                <h3>${escapeHtml(u.name || 'Без имени')}</h3>
                <p>${escapeHtml(u.email)}</p>
                <div class="user-meta">
                    <span class="badge ${u.role === 'admin' ? 'admin-badge' : 'user-badge'}">${u.role === 'admin' ? 'Админ' : 'Пользователь'}</span>
                    ${u.profile?.gender ? `<span class="badge">${getGenderLabel(u.profile.gender)}</span>` : ''}
                </div>
            </div>
            <div class="user-actions">
                <button class="btn-icon" data-id="${u.id}" data-action="edit">✏️</button>
                ${u.role !== 'admin' ? `<button class="btn-icon" data-id="${u.id}" data-action="delete">🗑️</button>` : ''}
            </div>
        `;
        usersContainer.appendChild(card);
    });
    // Обработчики
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(parseInt(btn.dataset.id)));
    });
}

function getGenderLabel(gender) {
    const genders = { male: 'М', female: 'Ж', other: 'Др.' };
    return genders[gender] || gender;
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

// Открыть модалку для редактирования
async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        const u = await response.json();
        modalTitle.textContent = 'Редактировать пользователя';
        document.getElementById('user-id').value = u.id;
        document.getElementById('user-name').value = u.name || '';
        document.getElementById('user-email').value = u.email;
        document.getElementById('user-role').value = u.role;
        document.getElementById('user-gender').value = u.profile?.gender || '';
        document.getElementById('user-height').value = u.profile?.height || '';
        document.getElementById('user-weight').value = u.profile?.weight || '';
        document.getElementById('user-age').value = u.profile?.age || '';
        document.getElementById('user-goal').value = u.profile?.goal || '';
        document.getElementById('user-level').value = u.profile?.level || '';
        document.getElementById('new-password').value = '';
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching user:', error);
        alert('Не удалось загрузить пользователя');
    }
}

// Сохранить изменения пользователя
async function saveUser(event) {
    event.preventDefault();
    const id = document.getElementById('user-id').value;
    const name = document.getElementById('user-name').value.trim();
    const role = document.getElementById('user-role').value;
    const profile = {
        gender: document.getElementById('user-gender').value || null,
        height: parseInt(document.getElementById('user-height').value) || null,
        weight: parseFloat(document.getElementById('user-weight').value) || null,
        age: parseInt(document.getElementById('user-age').value) || null,
        goal: document.getElementById('user-goal').value || null,
        level: document.getElementById('user-level').value || null
    };
    const payload = { name, role, profile };
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Save failed');
        await loadUsers();
        modal.style.display = 'none';
        alert('Пользователь обновлён');
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Ошибка сохранения');
    }
}

// Сброс пароля
async function resetPassword() {
    const id = document.getElementById('user-id').value;
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword) {
        alert('Введите новый пароль');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/${id}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ newPassword })
        });
        if (!response.ok) throw new Error('Reset failed');
        alert('Пароль успешно сброшен');
        document.getElementById('new-password').value = '';
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Ошибка сброса пароля');
    }
}

// Удалить пользователя
async function deleteUser(id) {
    if (!confirm('Удалить пользователя?')) return;
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Delete failed');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Ошибка удаления');
    }
}

function closeModal() {
    modal.style.display = 'none';
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    userForm.addEventListener('submit', saveUser);
    closeModalBtn.addEventListener('click', closeModal);
    document.getElementById('reset-password-btn').addEventListener('click', resetPassword);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});