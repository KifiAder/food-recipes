const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const auth = require('../middleware/auth');

// Получение всех отзывов для рецепта
router.get('/recipe/:recipeId', async (req, res) => {
    try {
        const reviews = await Review.find({ recipe: req.params.recipeId });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Добавление отзыва
router.post('/', auth, async (req, res) => {
    const review = new Review({
        ...req.body,
        author: req.userId
    });

    try {
        const newReview = await review.save();
        res.status(201).json(newReview);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Обновление отзыва
router.patch('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Отзыв не найден' });
        }

        if (review.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Нет прав на редактирование' });
        }

        Object.assign(review, req.body);
        const updatedReview = await review.save();
        res.json(updatedReview);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Удаление отзыва
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Отзыв не найден' });
        }

        if (review.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Нет прав на удаление' });
        }

        await review.remove();
        res.json({ message: 'Отзыв удален' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 