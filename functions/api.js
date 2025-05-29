const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Импорт роутов
const authRoutes = require('../routes/auth');
const recipesRoutes = require('../routes/recipes');
const reviewsRoutes = require('../routes/reviews');

const app = express();

// Настройка CORS
app.use(cors());

// Middleware
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Успешное подключение к MongoDB Atlas');
})
.catch(err => {
    console.error('❌ Ошибка подключения к MongoDB:', err.message);
});

// Роуты API
app.use('/.netlify/functions/api/auth', authRoutes);
app.use('/.netlify/functions/api/recipes', recipesRoutes);
app.use('/.netlify/functions/api/reviews', reviewsRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err.message);
    res.status(500).json({ message: 'Что-то пошло не так!' });
});

module.exports.handler = serverless(app); 