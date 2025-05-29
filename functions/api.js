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
const authRoutes = require('./routes/auth.js');
const recipesRoutes = require('./routes/recipes.js');
const reviewsRoutes = require('./routes/reviews.js');

const app = express();

// Настройка CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400
}));

// Middleware для preflight запросов
app.options('*', cors());

// Middleware для парсинга JSON с обработкой ошибок
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.error('Ошибка парсинга JSON:', e);
            res.status(400).json({ 
                success: false, 
                message: 'Неверный формат JSON',
                details: e.message 
            });
            throw new Error('Неверный формат JSON');
        }
    }
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
        query: req.query
    });
    next();
});

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

// Базовый маршрут для проверки работоспособности API
app.get('/.netlify/functions/api', (req, res) => {
    res.json({ status: 'API работает' });
});

// Роуты API
app.use('/.netlify/functions/api/auth', authRoutes);
app.use('/.netlify/functions/api/recipes', recipesRoutes);
app.use('/.netlify/functions/api/reviews', reviewsRoutes);

// Обработка ошибок JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            success: false, 
            message: 'Неверный формат JSON' 
        });
    }
    next(err);
});

// Общая обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Что-то пошло не так!'
        : err.message;
    
    res.status(statusCode).json({ 
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден'
    });
});

module.exports.handler = serverless(app); 