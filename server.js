require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Импорт роутов
const authRoutes = require('./routes/auth');
const recipesRoutes = require('./routes/recipes');
const reviewsRoutes = require('./routes/reviews');

const app = express();

// Настройка CORS
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Логирование запросов
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`\n=== ${new Date().toISOString()} ===`);
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Добавляем логирование ответа
    const oldSend = res.send;
    res.send = function(data) {
        console.log('Response:', data);
        console.log(`Request took ${Date.now() - start}ms`);
        oldSend.apply(res, arguments);
    };

    next();
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-recipes', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Успешное подключение к MongoDB Atlas');
    console.log('📊 База данных:', mongoose.connection.name);
    console.log('🔗 Хост:', mongoose.connection.host);
})
.catch(err => {
    console.error('❌ Ошибка подключения к MongoDB:', err.message);
    process.exit(1);
});

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/reviews', reviewsRoutes);

// Обработка статических файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/catalog', (req, res) => {
    res.sendFile(path.join(__dirname, 'catalog.html'));
});

app.get('/recipe', (req, res) => {
    res.sendFile(path.join(__dirname, 'recipe.html'));
});

app.get('/add-recipe', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-recipe.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/favorite', (req, res) => {
    res.sendFile(path.join(__dirname, 'favorite.html'));
});

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy-policy.html'));
});

app.get('/sitemap', (req, res) => {
    res.sendFile(path.join(__dirname, 'sitemap.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err.message);
    res.status(500).json({ message: 'Что-то пошло не так!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Сервер запущен на порту ${PORT}`);
    console.log('🌍 Окружение:', process.env.NODE_ENV || 'development');
}); 