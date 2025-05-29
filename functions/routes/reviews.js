const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/review');
const Recipe = require('../models/Recipe');

// Получение отзывов для рецепта
router.get('/recipe/:recipeId', async (req, res) => {
    try {
        const reviews = await Review.find({ recipe: req.params.recipeId })
            .populate('author', 'username')
            .sort('-createdAt');
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении отзывов' });
    }
});

// Добавление отзыва (требуется авторизация)
router.post('/', auth, async (req, res) => {
    try {
        const { recipeId, text, rating } = req.body;

        const review = new Review({
            recipe: recipeId,
            author: req.user._id,
            text,
            rating
        });

        await review.save();
        
        const populatedReview = await Review.findById(review._id)
            .populate('author', 'username');

        res.status(201).json(populatedReview);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании отзыва' });
    }
});

// Удаление отзыва (только автор)
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Отзыв не найден' });
        }

        if (review.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Нет прав для удаления' });
        }

        await review.remove();
        res.json({ message: 'Отзыв успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении отзыва' });
    }
});

module.exports = router; 