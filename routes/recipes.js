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
        const recipes = await Recipe.find()
            .populate('author', 'username')
            .sort('-createdAt');
        res.json(recipes);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении рецептов' });
    }
});

// Получение рецепта по ID
router.get('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id)
            .populate('author', 'username')
            .populate({
                path: 'reviews',
                populate: { path: 'author', select: 'username' }
            });

        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        res.json(recipe);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении рецепта' });
    }
});

// Добавление нового рецепта (требуется авторизация)
router.post('/', auth, async (req, res) => {
    try {
        const { name, image, ingredients, steps, type } = req.body;

        const recipe = new Recipe({
            name,
            image,
            ingredients,
            steps,
            type,
            author: req.user._id
        });

        await recipe.save();
        res.status(201).json(recipe);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании рецепта' });
    }
});

// Обновление рецепта (только автор)
router.put('/:id', auth, async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        if (recipe.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Нет прав для редактирования' });
        }

        const updatedRecipe = await Recipe.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json(updatedRecipe);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении рецепта' });
    }
});

// Удаление рецепта (только автор)
router.delete('/:id', auth, async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не найден' });
        }

        if (recipe.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Нет прав для удаления' });
        }

        await recipe.remove();
        res.json({ message: 'Рецепт успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении рецепта' });
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