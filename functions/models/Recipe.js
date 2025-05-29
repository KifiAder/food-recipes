const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    image: {
        type: String,
        required: true
    },
    ingredients: [{
        type: String,
        required: true,
        trim: true
    }],
    steps: [{
        type: String,
        required: true,
        trim: true
    }],
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    type: {
        type: String,
        required: true,
        enum: ['main', 'soup', 'salad', 'dessert', 'drink', 'appetizer']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isCustom: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Виртуальное поле для подсчета среднего рейтинга из отзывов
recipeSchema.virtual('averageRating').get(function() {
    if (!this.reviews || this.reviews.length === 0) return this.rating;
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round(sum / this.reviews.length);
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe; 