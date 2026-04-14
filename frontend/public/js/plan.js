// plan.js
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.plan-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            // Убираем активный класс у всех кнопок и контента
            tabBtns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            // Активируем текущие
            btn.classList.add('active');
            document.getElementById(`${period}-plan`).classList.add('active');
        });
    });
});