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
        const startTime = Date.now();
        const { username, email, password } = req.body;

        // Быстрая предварительная валидация
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Все поля обязательны для заполнения'
            });
        }

        // Нормализация данных
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();

        // Параллельное выполнение валидации и проверки существующего пользователя
        const [validationErrors, existingUser] = await Promise.all([
            Promise.resolve(validateUserData({ username: normalizedUsername, email: normalizedEmail, password })),
            User.findOne({ 
                $or: [
                    { email: normalizedEmail },
                    { username: normalizedUsername }
                ]
            }).lean() // Используем lean() для более быстрого запроса
        ]);

        // Проверка результатов валидации
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: validationErrors 
            });
        }

        // Проверка существующего пользователя
        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.email === normalizedEmail 
                    ? 'Этот email уже зарегистрирован' 
                    : 'Это имя пользователя уже занято'
            });
        }

        // Оптимизированное хеширование пароля (уменьшаем количество раундов)
        const hashedPassword = await bcrypt.hash(password, 8);

        // Создание пользователя с оптимизированным сохранением
        const user = new User({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });

        // Параллельное сохранение пользователя и создание токена
        const [savedUser] = await Promise.all([
            user.save(),
            Promise.resolve(jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            ))
        ]);

        // Проверка времени выполнения
        const executionTime = Date.now() - startTime;
        console.log(`Время регистрации: ${executionTime}ms`);

        // Если время выполнения приближается к лимиту, логируем предупреждение
        if (executionTime > 8000) {
            console.warn('Регистрация заняла слишком много времени:', executionTime);
        }

        res.status(201).json({ 
            token, 
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email
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