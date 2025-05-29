const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

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
    try {
        const { username, email, password } = req.body;

        // Валидация данных
        const validationErrors = validateUserData({ username, email, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: validationErrors 
            });
        }

        // Проверка существования пользователя
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { username: username.trim() }
            ]
        });
        
        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ message: 'Этот email уже зарегистрирован' });
            }
            return res.status(400).json({ message: 'Это имя пользователя уже занято' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание нового пользователя
        const user = new User({
            username: username.trim(),
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await user.save();

        // Создание токена
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ 
            token, 
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ 
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