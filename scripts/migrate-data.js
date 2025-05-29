require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Recipe = require('../models/Recipe');

async function migrateData() {
    try {
        // Подключение к MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Подключено к MongoDB Atlas');

        // Чтение данных из файла
        const rawData = fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8');
        const recipes = JSON.parse(rawData);

        // Очистка существующих рецептов
        await Recipe.deleteMany({});
        console.log('🗑️ Существующие рецепты удалены');

        // Преобразование типов рецептов
        const typeMapping = {
            'горячее': 'main',
            'суп': 'soup',
            'салат': 'salad',
            'десерт': 'dessert',
            'закуска': 'appetizer',
            'напиток': 'drink'
        };

        // Подготовка рецептов для импорта
        const recipesToImport = recipes.map(recipe => {
            const { id, ...recipeData } = recipe; // Удаляем поле id
            const type = recipe.type ? typeMapping[recipe.type.toLowerCase()] || 'main' : 'main';
            
            return {
                ...recipeData,
                type,
                author: '65f1f0000000000000000000', // Временный ID автора
                isCustom: false,
                image: recipe.image ? recipe.image.replace('./', '/') : '/assets/default.jpg' // Исправляем пути к изображениям
            };
        });

        // Добавление новых рецептов
        const result = await Recipe.insertMany(recipesToImport);

        console.log(`✨ Успешно импортировано ${result.length} рецептов`);
        console.log('🎉 Миграция завершена успешно');

    } catch (error) {
        console.error('❌ Ошибка при миграции:', error);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`Ошибка в поле ${key}:`, error.errors[key].message);
            });
        }
    } finally {
        // Закрытие соединения
        await mongoose.connection.close();
        console.log('📡 Соединение с базой данных закрыто');
    }
}

migrateData(); 