const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Recipe = require('../models/Recipe');

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/recipes');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат файла'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Получение всех рецептов
router.get('/', async (req, res) => {
    try {
        const recipes = await Recipe.find();
        res.json(recipes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Получение конкретного рецепта
router.get('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }
        res.json(recipe);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Создание нового рецепта
router.post('/', auth, async (req, res) => {
    const recipe = new Recipe({
        ...req.body,
        author: req.userId
    });

    try {
        const newRecipe = await recipe.save();
        res.status(201).json(newRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Обновление рецепта
router.patch('/:id', auth, async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        if (recipe.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Нет прав на редактирование' });
        }

        Object.assign(recipe, req.body);
        const updatedRecipe = await recipe.save();
        res.json(updatedRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Удаление рецепта
router.delete('/:id', auth, async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        if (recipe.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Нет прав на удаление' });
        }

        await recipe.remove();
        res.json({ message: 'Рецепт удален' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Добавление рецепта в избранное
router.post('/:id/favorite', auth, async (req, res) => {
    try {
        const user = req.user;
        const recipeId = req.params.id;

        if (!user.favorites.includes(recipeId)) {
            user.favorites.push(recipeId);
            await user.save();
        }

        res.json({ message: 'Рецепт добавлен в избранное' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при добавлении в избранное' });
    }
});

// Удаление рецепта из избранного
router.delete('/:id/favorite', auth, async (req, res) => {
    try {
        const user = req.user;
        const recipeId = req.params.id;

        user.favorites = user.favorites.filter(id => id.toString() !== recipeId);
        await user.save();

        res.json({ message: 'Рецепт удален из избранного' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении из избранного' });
    }
});

module.exports = router; 