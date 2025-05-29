const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверяем, существует ли пользователь
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Пользователь с таким email или именем уже существует' 
            });
        }

        // Создаем нового пользователя
        const user = new User({ username, email, password });
        await user.save();

        // Создаем токен
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
        res.status(500).json({ message: 'Ошибка при регистрации' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Ищем пользователя
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        // Проверяем пароль
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        // Создаем токен
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при входе' });
    }
});

module.exports = router; 