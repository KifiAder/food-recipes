const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Проверка необходимых переменных окружения
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Отсутствует переменная окружения ${envVar}`);
        process.exit(1);
    }
}

// Импорт роутов
const authRoutes = require('./routes/auth');
const recipesRoutes = require('./routes/recipes');
const reviewsRoutes = require('./routes/reviews');

const app = express();

// Настройка CORS
app.use(cors());

// Middleware
app.use(express.json());

// Подключение к MongoDB с улучшенной обработкой ошибок
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Успешное подключение к MongoDB Atlas');
    } catch (err) {
        console.error('❌ Ошибка подключения к MongoDB:', err.message);
        // В production среде лучше завершить процесс
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

connectDB();

// Роуты API
app.use('/.netlify/functions/api/auth', authRoutes);
app.use('/.netlify/functions/api/recipes', recipesRoutes);
app.use('/.netlify/functions/api/reviews', reviewsRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err.message);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Что-то пошло не так!'
        : err.message;
    res.status(statusCode).json({ message });
});

module.exports.handler = serverless(app); 