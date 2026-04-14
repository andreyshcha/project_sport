const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./src/config/db');

// Подключаем роуты
const authRoutes = require('./src/routes/authRoutes');

const app = require('./src/app');
const PORT = process.env.PORT || 3000;


async function createAdminIfNotExists() {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin'; // можно вынести в .env
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: hashedPassword,
                name: 'Admin',
                role: 'admin'
            }
        });
        console.log('Admin user created');
    }
}


// Middleware
app.use(cors());
app.use(express.json());

// Статика (фронтенд)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API маршруты
app.use('/api/auth', authRoutes);

// SPA fallback – отдаём index.html для всех остальных маршрутов
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});


createAdminIfNotExists().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(console.error);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});