const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const auth = require('../middleware/auth.js');

// Валидация данных пользователя
const validateUserData = (data) => {
    const errors = [];
    
    if (!data.username || data.username.length < 3) {
        errors.push('Имя пользователя должно содержать минимум 3 символа');
    }
    
    if (!data.email || !data.email.includes('@')) {
        errors.push('Укажите корректный email адрес');
    }
    
    if (!data.password || data.password.length < 6) {
        errors.push('Пароль должен содержать минимум 6 символов');
    }
    
    return errors;
};

// Регистрация
router.post('/register', async (req, res) => {
    console.log('Получен запрос на регистрацию:', {
        body: req.body,
        headers: req.headers,
        url: req.url,
        method: req.method
    });

    try {
        const { username, email, password } = req.body;

        // Проверяем наличие всех полей
        if (!username || !email || !password) {
            console.log('Отсутствуют обязательные поля:', { username: !!username, email: !!email, password: !!password });
            return res.status(400).json({ 
                success: false,
                message: 'Все поля обязательны для заполнения',
                fields: { username: !!username, email: !!email, password: !!password }
            });
        }

        // Нормализация данных
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();

        // Валидация данных
        const validationErrors = validateUserData({ 
            username: normalizedUsername, 
            email: normalizedEmail, 
            password 
        });

        if (validationErrors.length > 0) {
            console.log('Ошибки валидации:', validationErrors);
            return res.status(400).json({ 
                success: false,
                message: validationErrors[0],
                errors: validationErrors 
            });
        }

        // Проверка существующего пользователя
        const existingUser = await User.findOne({ 
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername }
            ]
        }).lean();

        if (existingUser) {
            console.log('Пользователь уже существует:', { 
                email: existingUser.email === normalizedEmail,
                username: existingUser.username === normalizedUsername 
            });
            return res.status(400).json({ 
                success: false,
                message: existingUser.email === normalizedEmail 
                    ? 'Этот email уже зарегистрирован' 
                    : 'Это имя пользователя уже занято'
            });
        }

        // Хеширование пароля с меньшим количеством раундов
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создание пользователя
        const user = new User({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });

        // Сохраняем пользователя
        const savedUser = await user.save();
        console.log('Пользователь сохранен:', savedUser._id);

        // Создаем токен
        const token = jwt.sign(
            { userId: savedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Отправляем ответ
        return res.status(201).json({ 
            success: true,
            token, 
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Ошибка при регистрации пользователя',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Поиск пользователя
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }

        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }

        // Создание токена
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, userId: user._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Получение профиля
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 