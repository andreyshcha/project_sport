console.log('profileController loaded');


const prisma = require('../config/db');

function calculateBodyFat(weight, height, age, gender) {
    if (!weight || !height || !age || !gender) return null;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    // Пол: 1 – мужчина, 0 – женщина (для other используем усреднённое)
    const sexFactor = gender === 'male' ? 1 : gender === 'female' ? 0 : 0.5;
    let bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
    // Ограничим разумными пределами
    bodyFat = Math.min(Math.max(bodyFat, 3), 45);
    return Math.round(bodyFat * 10) / 10;
}

exports.getProfile = async (req, res) => {
    console.log('getProfile called');
    try {
        const userId = req.user.id;
        console.log('userId:', userId);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });
        console.log('user found:', user ? 'yes' : 'no');

        if (!user) {
            console.log('User not found, sending 404');
            return res.status(404).json({ error: 'User not found' });
        }

        const profileData = {
            name: user.name,
            email: user.email,
            photoUrl: user.photoUrl,
            ...user.profile,
            equipment: user.profile?.equipment || {},
            injuries: user.profile?.injuries || []
        };
        console.log('profileData prepared, sending response');
        res.json(profileData);
        console.log('response sent');
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, gender, height, age, weight,
            hips, chest, waist,
            goal, level,
            equipment, injuries
        } = req.body;

        // Обновляем имя, если передано
        if (name) {
            await prisma.user.update({
                where: { id: userId },
                data: { name }
            });
        }

        // Подготовка данных для upsert
        const updateData = {
            gender,
            height: height ? parseInt(height) : undefined,
            age: age ? parseInt(age) : undefined,
            weight: weight ? parseFloat(weight) : undefined,
            hips: hips ? parseFloat(hips) : undefined,
            chest: chest ? parseFloat(chest) : undefined,
            waist: waist ? parseFloat(waist) : undefined,
            goal,
            level,
            equipment: equipment || {},
            injuries: injuries || [],
            updatedAt: new Date()
        };

        const createData = {
            userId,
            gender,
            height: height ? parseInt(height) : undefined,
            age: age ? parseInt(age) : undefined,
            weight: weight ? parseFloat(weight) : undefined,
            hips: hips ? parseFloat(hips) : undefined,
            chest: chest ? parseFloat(chest) : undefined,
            waist: waist ? parseFloat(waist) : undefined,
            goal,
            level,
            equipment: equipment || {},
            injuries: injuries || []
        };

        // Расчёт % жира, если есть все необходимые данные
        if (weight && height && age && gender) {
            const bodyFat = calculateBodyFat(
                parseFloat(weight),
                parseInt(height),
                parseInt(age),
                gender
            );
            updateData.bodyFat = bodyFat;
            createData.bodyFat = bodyFat;
        }

        const profile = await prisma.userProfile.upsert({
            where: { userId },
            update: updateData,
            create: createData
        });

        await prisma.userMeasurement.create({
  data: {
    userId,
    weight: weight ? parseFloat(weight) : undefined,
    hips: hips ? parseFloat(hips) : undefined,
    chest: chest ? parseFloat(chest) : undefined,
    waist: waist ? parseFloat(waist) : undefined,
    bodyFat: profile.bodyFat,
  }
});

        res.json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const userId = req.user.id;
        const photoUrl = `/uploads/${req.file.filename}`;

        // Обновляем пользователя
        await prisma.user.update({
            where: { id: userId },
            data: { photoUrl }
        });

        res.json({ photoUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
};