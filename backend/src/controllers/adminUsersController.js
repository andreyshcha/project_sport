const bcrypt = require('bcrypt');
const prisma = require('../config/db');

// Получить всех пользователей
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { profile: true },
            orderBy: { id: 'asc' }
        });
        // Форматируем, убираем пароль
        const formatted = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            photoUrl: user.photoUrl,
            createdAt: user.createdAt,
            profile: {
                gender: user.profile?.gender,
                height: user.profile?.height,
                age: user.profile?.age,
                weight: user.profile?.weight,
                goal: user.profile?.goal,
                level: user.profile?.level
            }
        }));
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Получить одного пользователя по ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { profile: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const formatted = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            photoUrl: user.photoUrl,
            createdAt: user.createdAt,
            profile: {
                gender: user.profile?.gender,
                height: user.profile?.height,
                age: user.profile?.age,
                weight: user.profile?.weight,
                goal: user.profile?.goal,
                level: user.profile?.level
            }
        };
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Обновить пользователя (имя, роль, профиль)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, profile } = req.body;
        // Обновляем основную таблицу
        const userData = {};
        if (name !== undefined) userData.name = name;
        if (role !== undefined) userData.role = role;

        let updatedUser;
        if (Object.keys(userData).length > 0) {
            updatedUser = await prisma.user.update({
                where: { id: parseInt(id) },
                data: userData
            });
        }

        // Обновляем профиль, если переданы данные
        if (profile) {
            await prisma.userProfile.upsert({
                where: { userId: parseInt(id) },
                update: {
                    gender: profile.gender,
                    height: profile.height,
                    age: profile.age,
                    weight: profile.weight,
                    goal: profile.goal,
                    level: profile.level,
                    updatedAt: new Date()
                },
                create: {
                    userId: parseInt(id),
                    gender: profile.gender,
                    height: profile.height,
                    age: profile.age,
                    weight: profile.weight,
                    goal: profile.goal,
                    level: profile.level
                }
            });
        }

        const finalUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { profile: true }
        });
        res.json(finalUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Сброс пароля пользователя (админ может задать новый)
exports.resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password required' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { passwordHash: hashed }
        });
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Удалить пользователя (только не админа)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToDelete) return res.status(404).json({ error: 'User not found' });
        if (userToDelete.role === 'admin') {
            return res.status(403).json({ error: 'Cannot delete admin user' });
        }
        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};