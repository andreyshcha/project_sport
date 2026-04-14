const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminMiddleware = require('./middleware/adminMiddleware');
const adminExercisesRoutes = require('./routes/adminExercisesRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const adminWorkoutsRoutes = require('./routes/adminWorkoutsRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
const progressRoutes = require('./routes/progressRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');

console.log('authRoutes:', authRoutes);
console.log('profileRoutes:', profileRoutes);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

// Статика
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../../frontend/public/uploads')));

console.log('Loading profileRoutes...');
console.log(profileRoutes); // что это?
console.log('Profile routes registered');

// API маршруты – ДО fallback
app.use('/api/auth', authRoutes);
console.log('profileRoutes module:', profileRoutes);
app.use('/api/profile', profileRoutes); // ← добавлено


// Пример для админских эндпоинтов упражнений
app.use('/api/admin/exercises', authMiddleware, adminMiddleware, adminExercisesRoutes);

app.use('/api/admin/workouts', authMiddleware, adminMiddleware, adminWorkoutsRoutes);
app.use('/api/admin/users', authMiddleware, adminMiddleware, adminUsersRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);



// SPA fallback – после всех API
// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
// });

module.exports = app;