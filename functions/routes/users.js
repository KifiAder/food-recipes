const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Recipe = require('../models/Recipe');

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password')
            .populate('favorites');

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля' });
    }
});

// Обновление настроек пользователя
router.put('/settings', auth, async (req, res) => {
    try {
        const { theme, accessibilityMode } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        user.settings = {
            theme: theme || user.settings.theme,
            accessibilityMode: accessibilityMode !== undefined ? accessibilityMode : user.settings.accessibilityMode
        };

        await user.save();
        res.json(user.settings);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении настроек' });
    }
});

// Добавление/удаление рецепта из избранного
router.post('/favorites/:recipeId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const recipe = await Recipe.findById(req.params.recipeId);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        const favoriteIndex = user.favorites.indexOf(req.params.recipeId);
        
        if (favoriteIndex === -1) {
            user.favorites.push(req.params.recipeId);
        } else {
            user.favorites.splice(favoriteIndex, 1);
        }

        await user.save();
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении избранного' });
    }
});

// Получение избранных рецептов
router.get('/favorites', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('favorites');
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении избранных рецептов' });
    }
});

module.exports = router; 