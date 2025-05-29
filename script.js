let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Функция для создания карточки рецепта
function createRecipeCard(recipe, isFavoritePage = false) {
    const stars = '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating);
    const isInFav = favorites.includes(recipe.id);
    
    let favoriteButton = '';
    if (isFavoritePage) {
        favoriteButton = `<button class="remove-favorite-btn" onclick="event.preventDefault(); event.stopPropagation(); removeFromFavorites('${recipe.id}')"></button>`;
    } else {
        favoriteButton = `<button class="toggle-favorite-btn ${isInFav ? 'remove' : 'add'}" onclick="event.preventDefault(); event.stopPropagation(); toggleCardFavorite(this, '${recipe.id}')"></button>`;
    }

    const customBadge = recipe.isCustom ? '<span class="custom-recipe-badge">⭐</span>' : '';
    
    return `
        <article class="recipe-card" onclick="showRecipeDetails('${recipe.id}')">
            ${customBadge}
            ${favoriteButton}
            <img src="${recipe.image}" alt="${recipe.name}">
            <div class="recipe-card-content">
                <h2>${recipe.name}</h2>
                <div class="recipe-rating">${stars}</div>
                <button class="btn-details">Подробнее</button>
            </div>
        </article>
    `;
}

// Загрузка рецептов из JSON и localStorage
async function loadRecipes() {
    try {
        console.log('Начинаем загрузку рецептов...');
        
        // Загружаем базовые рецепты из JSON
        const response = await fetch('./data.json');
        console.log('Статус ответа:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const baseRecipes = await response.json();
        console.log('Загружено базовых рецептов:', baseRecipes.length);
        
        // Загружаем пользовательские рецепты из localStorage
        const customRecipes = JSON.parse(localStorage.getItem('customRecipes')) || [];
        console.log('Загружено пользовательских рецептов:', customRecipes.length);
        
        // Объединяем рецепты, пользовательские имеют приоритет
        const allRecipes = [...baseRecipes, ...customRecipes];
        
        // Удаляем дубликаты по ID
        const uniqueRecipes = allRecipes.reduce((acc, current) => {
            const x = acc.find(item => item.id === current.id);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        console.log('Всего уникальных рецептов:', uniqueRecipes.length);
        return uniqueRecipes;
    } catch (error) {
        console.error('Ошибка при загрузке рецептов:', error);
        return [];
    }
}

// Отображение рецептов на главной странице
async function displayHomePageRecipes() {
    console.log('Начинаем отображение рецептов на главной странице');
    const recipes = await loadRecipes();
    console.log('Получены рецепты для главной:', recipes.length);
    if (!recipes.length) {
        console.error('Нет рецептов для отображения');
        return;
    }

    // Сортировка рецептов по рейтингу
    const sortedRecipes = [...recipes].sort((a, b) => b.rating - a.rating);
    console.log('Отсортировано рецептов:', sortedRecipes.length);

    // Получаем и отображаем 4 самых популярных рецепта
    const popularRecipes = sortedRecipes.slice(0, 4);
    const popularContainer = document.getElementById('popular-recipes');
    console.log('Популярный контейнер найден:', !!popularContainer);
    if (popularContainer) {
        popularContainer.innerHTML = popularRecipes
            .map(recipe => createRecipeCard(recipe))
            .join('');
        console.log('Добавлено популярных рецептов:', popularRecipes.length);
    }

    // Получаем и отображаем следующие 4 лучших рецепта
    const bestRecipes = sortedRecipes.slice(4, 8);
    const bestContainer = document.getElementById('best-recipes');
    console.log('Лучший контейнер найден:', !!bestContainer);
    if (bestContainer) {
        bestContainer.innerHTML = bestRecipes
            .map(recipe => createRecipeCard(recipe))
            .join('');
        console.log('Добавлено лучших рецептов:', bestRecipes.length);
    }

    // Проверяем URL при загрузке страницы
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('recipe');
    if (recipeId) {
        showRecipeDetails(recipeId);
    }
}

// Отображение рецептов в каталоге
async function displayCatalogRecipes() {
    console.log('Начинаем отображение рецептов в каталоге');
    const recipes = await loadRecipes();
    console.log('Получены рецепты для каталога:', recipes.length);
    const container = document.getElementById('recipes-list');
    console.log('Контейнер каталога найден:', !!container);
    
    if (container && recipes.length) {
        // Добавляем обработчик формы фильтрации
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (event) => {
                event.preventDefault();
                filterRecipes(recipes, container);
            });

            // Добавляем обработчик сброса фильтров
            const resetButton = document.getElementById('reset-filters');
            if (resetButton) {
                resetButton.addEventListener('click', () => {
                    filterForm.reset();
                    container.innerHTML = recipes
                        .map(recipe => createRecipeCard(recipe))
                        .join('');
                });
            }
        }

        // Отображаем все рецепты при первой загрузке
        container.innerHTML = recipes
            .map(recipe => createRecipeCard(recipe))
            .join('');
        console.log('Добавлено рецептов в каталог:', recipes.length);
            
        // Проверяем URL при загрузке страницы
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('recipe');
        if (recipeId) {
            showRecipeDetails(recipeId);
        }
    }
}

function filterRecipes(recipes, container) {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Получаем выбранные рейтинги
    const selectedRatings = Array.from(document.querySelectorAll('input[name="rating"]:checked'))
        .map(checkbox => parseInt(checkbox.value));
    
    // Получаем выбранные типы блюд
    const selectedTypes = Array.from(document.querySelectorAll('input[name="type"]:checked'))
        .map(checkbox => checkbox.value);

    // Фильтруем рецепты
    const filteredRecipes = recipes.filter(recipe => {
        // Проверяем поисковый запрос
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm);
        
        // Проверяем рейтинг
        const matchesRating = selectedRatings.length === 0 || selectedRatings.includes(recipe.rating);
        
        // Проверяем тип блюда
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(recipe.type);

        return matchesSearch && matchesRating && matchesType;
    });

    // Отображаем отфильтрованные рецепты
    container.innerHTML = filteredRecipes.length
        ? filteredRecipes.map(recipe => createRecipeCard(recipe)).join('')
        : '<p class="no-results">По вашему запросу ничего не найдено</p>';
}

// Проверка, находится ли рецепт в избранном
function isInFavorites(recipeId) {
    return favorites.includes(recipeId);
}

// Обновление текста кнопки избранного
function updateFavoriteButton(recipeId) {
    const favoriteBtn = document.getElementById('favoriteButton');
    if (favoriteBtn) {
        if (isInFavorites(recipeId)) {
            favoriteBtn.textContent = 'Убрать из избранного';
            favoriteBtn.classList.add('remove-favorite');
        } else {
            favoriteBtn.textContent = 'Добавить в избранное';
            favoriteBtn.classList.remove('remove-favorite');
        }
    }
}

// Переключение избранного
function toggleFavorite() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("recipe");
    
    if (!recipeId) return;

    if (isInFavorites(recipeId)) {
        // Удаляем из избранного
        const index = favorites.indexOf(recipeId);
        favorites.splice(index, 1);
        alert('Рецепт удалён из избранного');
    } else {
        // Добавляем в избранное
        favorites.push(recipeId);
        alert('Рецепт добавлен в избранное');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoriteButton(recipeId);
}

// Функция для отображения деталей рецепта
async function showRecipeDetails(recipeId) {
    console.log('Показываем детали рецепта:', recipeId);
    const recipes = await loadRecipes();
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
        console.error('Рецепт не найден:', recipeId);
        return;
    }

    // Скрываем контейнер с рецептами на соответствующих страницах
    const recipesList = document.getElementById('recipes-list');
    const recipesContainer = document.getElementById('recipes-container');
    
    if (recipesList) {
        recipesList.classList.add('hidden');
        console.log('Скрыт список рецептов');
    }
    
    if (recipesContainer) {
        recipesContainer.classList.add('hidden');
        console.log('Скрыт контейнер рецептов');
    }

    // Показываем детали рецепта
    const recipeDetails = document.getElementById('recipe-details');
    if (recipeDetails) {
        // Прокручиваем страницу к началу
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        document.getElementById('recipe-name').innerText = recipe.name;
        document.getElementById('recipe-img').src = recipe.image;
        document.getElementById('recipe-rating').innerText = '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating);

        const ingredientList = document.getElementById('ingredient-list');
        ingredientList.innerHTML = recipe.ingredients
            .map(ing => `<li>${ing}</li>`)
            .join('');

        const stepsOl = document.getElementById('instruction-steps');
        stepsOl.innerHTML = recipe.steps
            .map(step => {
                const cleanStep = step.replace(/^\d+\.\s*/, '');
                return `<li>${cleanStep}</li>`;
            })
            .join('');

        // Обновляем состояние кнопки избранного
        updateFavoriteButton(recipeId);

        recipeDetails.style.display = 'block';
        // Добавляем небольшую задержку для анимации
        setTimeout(() => {
            recipeDetails.classList.add('visible');
        }, 10);

        // Обновляем URL без перезагрузки страницы
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('recipe', recipeId);
        history.pushState({ recipeId }, '', currentUrl.toString());
        console.log('URL обновлен:', currentUrl.toString());

        // Динамически добавляем блок отзывов, если его нет
        if (!document.querySelector('.reviews-section')) {
            const instructionsSection = recipeDetails.querySelector('.instructions-section');
            if (instructionsSection) {
                const reviewsDiv = document.createElement('div');
                reviewsDiv.className = 'reviews-section';
                reviewsDiv.innerHTML = `
                    <h2>Отзывы</h2>
                    <ul id="reviews-list"></ul>
                    ${localStorage.getItem('token') ? `
                    <form id="review-form">
                        <textarea id="review-text" placeholder="Ваш отзыв" required maxlength="300"></textarea>
                        <button type="submit">Оставить отзыв</button>
                    </form>
                    ` : `
                        <div class="login-to-review">
                            Чтобы оставить отзыв, необходимо <button class="auth-button">войти</button> в аккаунт
                        </div>
                    `}
                `;
                instructionsSection.after(reviewsDiv);

                // Добавляем обработчик для кнопки входа в блоке отзывов
                const loginBtn = reviewsDiv.querySelector('.login-to-review .auth-button');
                if (loginBtn) {
                    loginBtn.addEventListener('click', () => {
                        const modal = document.getElementById('authModal');
                        if (modal) modal.style.display = "block";
                    });
                }
            }
        }
        renderRecipeReviews(recipeId);
        setupReviewForm(recipeId);
    }
}

// Функция для скрытия деталей рецепта
function hideRecipeDetails() {
    console.log('Скрываем детали рецепта');
    const recipesList = document.getElementById('recipes-list');
    const recipesContainer = document.getElementById('recipes-container');
    const recipeDetails = document.getElementById('recipe-details');
    
    if (recipeDetails) {
        recipeDetails.classList.remove('visible');
        setTimeout(() => {
            recipeDetails.style.display = 'none';
            if (recipesList) {
                recipesList.classList.remove('hidden');
                console.log('Показан список рецептов');
            }
            if (recipesContainer) {
                recipesContainer.classList.remove('hidden');
                console.log('Показан контейнер рецептов');
            }
        }, 300);
    }

    // Обновляем URL без перезагрузки страницы
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('recipe');
    history.pushState({}, '', currentUrl.toString());
    console.log('URL обновлен:', currentUrl.toString());
}

// Обработчик изменения истории браузера
window.onpopstate = function(event) {
    if (event.state && event.state.recipeId) {
        showRecipeDetails(event.state.recipeId);
    } else {
        hideRecipeDetails();
    }
};

// Работа с избранным
function addToFavorites() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get("id");

    if (!favorites.includes(recipeId)) {
        favorites.push(recipeId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('Рецепт успешно добавлен в избранное.');
    } else {
        alert('Рецепт уже находится в избранном.');
    }
}

function removeFromFavorites(recipeId) {
    const index = favorites.indexOf(recipeId);
    if (index >= 0) {
        favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('Рецепт удалён из избранного.');
        loadFavoriteRecipes();
    }
}

async function loadFavoriteRecipes() {
    const recipes = await loadRecipes();
    const favoriteRecipes = recipes.filter(recipe => favorites.includes(recipe.id));
    const container = document.getElementById('recipes-list');
    if (container) {
        container.innerHTML = favoriteRecipes
            .map(recipe => createRecipeCard(recipe, true))
            .join('');

        // Проверяем URL при загрузке страницы
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('recipe');
        if (recipeId) {
            showRecipeDetails(recipeId);
        }
    }
}

// Функция переключения избранного на карточке
function toggleCardFavorite(button, recipeId) {
    const isCurrentlyFavorite = favorites.includes(recipeId);
    
    if (isCurrentlyFavorite) {
        // Удаляем из избранного
        const index = favorites.indexOf(recipeId);
        favorites.splice(index, 1);
        button.classList.remove('remove');
        button.classList.add('add');
    } else {
        // Добавляем в избранное
        favorites.push(recipeId);
        button.classList.remove('add');
        button.classList.add('remove');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Обработка добавления нового рецепта
async function handleAddRecipe(event) {
    console.log('Начало обработки добавления рецепта');
    event.preventDefault();
    
    const form = event.target;
    console.log('Форма получена:', !!form);
    
    // Получаем значения полей
    const name = form.querySelector('#recipe-name').value;
    const imageFile = form.querySelector('#recipe-image').files[0];
    const ingredients = form.querySelector('#recipe-ingredients').value
        .split('\n')
        .filter(i => i.trim())
        .map(i => i.replace(/^\d+\.\s*/, '')); // Удаляем цифры с точкой в начале

    const steps = form.querySelector('#recipe-steps').value
        .split('\n')
        .filter(s => s.trim())
        .map(s => s.replace(/^\d+\.\s*/, '')); // Удаляем цифры с точкой в начале
    
    console.log('Получены данные:', {
        name,
        hasImage: !!imageFile,
        ingredientsCount: ingredients.length,
        stepsCount: steps.length
    });
    
    // Генерируем случайный рейтинг от 1 до 5
    const rating = Math.floor(Math.random() * 5) + 1;

    // Проверяем наличие изображения
    if (!imageFile) {
        alert('Пожалуйста, добавьте фотографию блюда');
        form.querySelector('#recipe-image').focus();
        return;
    }

    // Проверяем тип файла
    if (!imageFile.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения');
        form.querySelector('#recipe-image').value = '';
        form.querySelector('#recipe-image').focus();
        return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        alert('Размер изображения не должен превышать 5MB');
        form.querySelector('#recipe-image').value = '';
        form.querySelector('#recipe-image').focus();
        return;
    }

    try {
        console.log('Начинаем обработку изображения');
        // Создаем временный URL для изображения
        const imageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                console.log('Изображение успешно прочитано');
                resolve(reader.result);
            };
            reader.onerror = (error) => {
                console.error('Ошибка чтения изображения:', error);
                reject(new Error('Ошибка при чтении файла'));
            };
            reader.readAsDataURL(imageFile);
        });

        // Создаем новый рецепт
        const newRecipe = {
            id: String(Date.now()),
            name,
            image: imageUrl,
            ingredients,
            steps,
            rating,
            reviews: [],
            isCustom: true
        };

        console.log('Создан объект рецепта:', {
            id: newRecipe.id,
            name: newRecipe.name,
            hasImage: !!newRecipe.image,
            ingredientsCount: newRecipe.ingredients.length,
            stepsCount: newRecipe.steps.length
        });

        // Получаем существующие пользовательские рецепты
        const customRecipes = JSON.parse(localStorage.getItem('customRecipes')) || [];
        console.log('Текущее количество рецептов:', customRecipes.length);
        
        // Добавляем новый рецепт
        customRecipes.push(newRecipe);
        
        // Сохраняем обновленный список пользовательских рецептов
        localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
        console.log('Рецепт сохранен в localStorage');

        // Показываем сообщение об успехе
        alert('Рецепт успешно добавлен!');
        
        // Перенаправляем на страницу каталога с параметром рецепта
        console.log('Перенаправляем на страницу каталога:', newRecipe.id);
        window.location.href = `catalog.html?recipe=${newRecipe.id}`;
    } catch (error) {
        console.error('Ошибка при добавлении рецепта:', error);
        alert('Произошла ошибка при добавлении рецепта. Пожалуйста, попробуйте еще раз.');
    }
}

// Функция обновления часов
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Функция для управления активными посетителями
function handleActiveVisitors() {
    // Генерируем уникальный ID для текущей сессии, если его еще нет
    if (!sessionStorage.getItem('visitorSessionId')) {
        sessionStorage.setItem('visitorSessionId', Date.now().toString());
    }
    const currentSessionId = sessionStorage.getItem('visitorSessionId');

    // Получаем текущий список активных сессий
    let activeSessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    
    // Удаляем устаревшие сессии (старше 1 минуты)
    const now = Date.now();
    activeSessions = activeSessions.filter(session => {
        return (now - session.lastActive) < 60000; // 60 секунд
    });

    // Обновляем или добавляем текущую сессию
    const sessionIndex = activeSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex === -1) {
        activeSessions.push({
            id: currentSessionId,
            lastActive: now
        });
    } else {
        activeSessions[sessionIndex].lastActive = now;
    }

    // Сохраняем обновленный список сессий
    localStorage.setItem('activeSessions', JSON.stringify(activeSessions));

    // Обновляем счетчик
    const counterElement = document.getElementById('visitor-counter');
    if (counterElement) {
        counterElement.textContent = `Онлайн: ${activeSessions.length}`;
    }

    // Периодически обновляем активность и счетчик
    setInterval(() => {
        let sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
        const currentTime = Date.now();
        
        // Обновляем время активности текущей сессии
        sessions = sessions.filter(session => {
            return (currentTime - session.lastActive) < 60000;
        });
        
        const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        if (currentSessionIndex !== -1) {
            sessions[currentSessionIndex].lastActive = currentTime;
        }
        
        localStorage.setItem('activeSessions', JSON.stringify(sessions));
        
        if (counterElement) {
            counterElement.textContent = `Онлайн: ${sessions.length}`;
        }
    }, 30000); // Обновляем каждые 30 секунд
}

// Функционал кнопки "наверх"
document.addEventListener('DOMContentLoaded', function() {
    const scrollToTopButton = document.querySelector('.scroll-to-top');
    
    // Показываем/скрываем кнопку при прокрутке
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopButton.classList.add('visible');
        } else {
            scrollToTopButton.classList.remove('visible');
        }
    });

    // Плавная прокрутка наверх при клике
    scrollToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

// Функционал режима доступности
document.addEventListener('DOMContentLoaded', function() {
    const accessibilityToggle = document.querySelector('.accessibility-toggle');
    
    // Проверяем сохраненное состояние режима доступности
    const isAccessibilityMode = localStorage.getItem('accessibilityMode') === 'true';
    if (isAccessibilityMode) {
        document.body.classList.add('accessibility-mode');
        accessibilityToggle.setAttribute('aria-pressed', 'true');
    }
    
    // Обработчик клика по кнопке
    accessibilityToggle.addEventListener('click', function() {
        const isEnabled = document.body.classList.toggle('accessibility-mode');
        localStorage.setItem('accessibilityMode', isEnabled);
        this.setAttribute('aria-pressed', isEnabled);
        
        // Показываем уведомление
        const message = isEnabled ? 'Режим для слабовидящих включен' : 'Режим для слабовидящих выключен';
        alert(message);
    });
});

// Функция отправки формы обратной связи
async function sendEmail(event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;

    try {
        // Отключаем кнопку и меняем текст
        submitButton.disabled = true;
        submitButton.textContent = 'Отправка...';

        // Получаем данные формы
        const formData = new FormData(form);
        const templateParams = {
            to_name: "Cook's Manuscript",
            from_name: formData.get('name'),
            from_email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            reply_to: formData.get('email'),
            sender: 'info_cooks_manuscript@mail.ru'
        };

        // Отправляем письмо на почту сайта
        await emailjs.send(
            'service_9g2nx39',
            'template_lpsvodh',
            {
                ...templateParams,
                recipient: 'info_cooks_manuscript@mail.ru'
            }
        );

        // Отправляем автоответ пользователю
        await emailjs.send(
            'service_9g2nx39',
            'template_7jm4y26',
            {
                ...templateParams,
                recipient: formData.get('email')
            }
        );

        // Очищаем форму
        form.reset();

        // Показываем сообщение об успехе
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Спасибо! Ваше сообщение успешно отправлено.';
        form.appendChild(successMessage);

        // Удаляем сообщение через 5 секунд
        setTimeout(() => {
            successMessage.remove();
        }, 5000);

    } catch (error) {
        console.error('Ошибка при отправке:', error);
        alert('Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте позже.');
    } finally {
        // Возвращаем кнопку в исходное состояние
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Функция инициализации модального окна авторизации
function initAuthModal() {
    console.log('Инициализация модального окна авторизации');
    const modal = document.getElementById('authModal');
    if (!modal) {
        console.error('Модальное окно не найдено');
        return;
    }

    // Добавляем обработчик для открытия модального окна
    const authButton = document.querySelector('.auth-button');
    if (authButton) {
        authButton.addEventListener('click', () => {
            console.log('Клик по кнопке авторизации');
            modal.style.display = "block";
        });
    }

    const closeBtn = modal.querySelector('.close');
    const tabButtons = modal.querySelectorAll('.tab-button');
    const authForms = modal.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    console.log('Найдены элементы:', {
        closeBtn: !!closeBtn,
        tabButtons: tabButtons.length,
        authForms: authForms.length,
        loginForm: !!loginForm,
        registerForm: !!registerForm
    });

    // Закрытие модального окна
    if (closeBtn) {
        closeBtn.onclick = function() {
            console.log('Закрытие модального окна');
            modal.style.display = "none";
        }
    }

    // Закрытие при клике вне модального окна
    window.onclick = function(event) {
        if (event.target == modal) {
            console.log('Закрытие модального окна при клике вне его');
            modal.style.display = "none";
        }
    }

    // Переключение вкладок
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            console.log('Переключение на вкладку:', tab);
            
            // Сначала деактивируем все вкладки и формы
            tabButtons.forEach(btn => btn.classList.remove('active'));
            authForms.forEach(form => {
                form.style.display = 'none';
                form.classList.remove('active');
            });
            
            // Активируем нужную вкладку и форму
            button.classList.add('active');
            const targetForm = document.getElementById(`${tab}Form`);
            if (targetForm) {
                targetForm.style.display = 'block';
                targetForm.classList.add('active');
            }
        });
    });

    // Активируем первую вкладку по умолчанию
    const defaultTab = tabButtons[0];
    if (defaultTab) {
        defaultTab.click();
    }

    // Обработка формы входа
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Предотвращаем перезагрузку страницы
            console.log('Отправка формы входа');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('Ответ сервера при входе:', data);

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showNotification('Вы успешно вошли в систему');
                    updateAuthUI();
                    modal.style.display = 'none';
                    loginForm.reset();
                } else {
                    showNotification(data.message || 'Ошибка при входе', 'error');
                }
            } catch (error) {
                console.error('Ошибка при входе:', error);
                showNotification('Произошла ошибка при входе', 'error');
            }
        });
    }

    // Обработка формы регистрации
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Отправка формы регистрации');
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;

            console.log('Данные для регистрации:', { name, email });

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                console.log('Ответ сервера при регистрации:', data);

                if (response.ok) {
                    showNotification('Регистрация успешна! Теперь вы можете войти');
                    registerForm.reset();
                    // Переключаемся на форму входа
                    const loginTab = modal.querySelector('[data-tab="login"]');
                    if (loginTab) {
                        loginTab.click();
                    }
                } else {
                    showNotification(data.message || 'Ошибка при регистрации', 'error');
                }
            } catch (error) {
                console.error('Ошибка при регистрации:', error);
                showNotification('Произошла ошибка при регистрации', 'error');
            }
        });
    }
}

// Функция для инициализации профиля после загрузки навигации
function initializeAfterNavLoad() {
    updateAuthUI();
    initializeProfile();
}

// Функция для загрузки навигации
function loadNavigation() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) {
        fetch('nav.html')
            .then(response => response.text())
            .then(data => {
                navPlaceholder.innerHTML = data;
                initializeAfterNavLoad();
            });
    } else {
        // Если нет плейсхолдера, значит навигация уже встроена в HTML
        initializeAfterNavLoad();
    }
}

// Инициализируем навигацию при загрузке страницы
document.addEventListener('DOMContentLoaded', loadNavigation);

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена');
    
    // Загружаем модальное окно авторизации
    const authContainer = document.getElementById('auth-modal-container');
    if (authContainer) {
        try {
            const response = await fetch('auth-modal.html');
            const html = await response.text();
            authContainer.innerHTML = html;
            // Инициализируем модальное окно после загрузки
            initAuthModal();
        } catch (error) {
            console.error('Ошибка загрузки модального окна:', error);
        }
    }

    // Остальной код инициализации страницы...
    const path = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Текущий путь:', path);
    
    // Обновляем часы каждую секунду
    updateClock();
    setInterval(updateClock, 1000);

    // Инициализируем систему подсчета посетителей
    handleActiveVisitors();
    
    // --- Тёмная тема ---
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        // Установить тему и эмодзи при загрузке
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '☀︎';
        } else {
            themeToggle.innerHTML = '⏾';
        }
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.innerHTML = isDark ? '☀︎' : '⏾';
        });
    }

    // Инициализация формы обратной связи
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', sendEmail);
    }
    
    switch (path) {
        case 'index.html':
        case '':
            await displayHomePageRecipes();
            break;
        case 'catalog.html':
            await displayCatalogRecipes();
            break;
        case 'recipe.html':
            const urlParams = new URLSearchParams(window.location.search);
            const recipeId = urlParams.get('recipe');
            if (recipeId) {
                showRecipeDetails(recipeId);
            }
            break;
        case 'favorite.html':
            await loadFavoriteRecipes();
            break;
        case 'add-recipe.html':
            console.log('Страница добавления рецепта');
            const form = document.getElementById('recipe-form');
            console.log('Найдена форма:', !!form);
            if (form) {
                console.log('Добавляем обработчик события submit');
                form.addEventListener('submit', (event) => {
                    console.log('Форма отправлена');
                    handleAddRecipe(event);
                });
            }
            break;
    }

    // --- Обработка формы регистрации ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Регистрация успешна! Теперь вы можете войти.');
                    // Переключаемся на вкладку входа
                    document.querySelector('.tab-button[data-tab="login"]').click();
                    registerForm.reset();
                } else {
                    alert(data.message || 'Ошибка регистрации');
                }
            } catch (err) {
                alert('Ошибка сети или сервера. Попробуйте позже.');
            }
            });
    }
});

function adjustBodyPadding() {
    const appBar = document.querySelector('.app-bar');
    if (appBar) {
        document.body.style.paddingTop = appBar.offsetHeight + 'px';
    }
}

window.addEventListener('DOMContentLoaded', adjustBodyPadding);
window.addEventListener('resize', adjustBodyPadding);

// --- ОТЗЫВЫ ДЛЯ РЕЦЕПТА ---
function getRecipeReviews(recipeId) {
    const allReviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');
    return allReviews[recipeId] || [];
}

function saveRecipeReview(recipeId, review) {
    const allReviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');
    if (!allReviews[recipeId]) allReviews[recipeId] = [];
    allReviews[recipeId].push(review);
    localStorage.setItem('recipeReviews', JSON.stringify(allReviews));
}

function renderRecipeReviews(recipeId) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    const reviews = getRecipeReviews(recipeId);
    reviewsList.innerHTML = reviews.length
        ? reviews.map(r => `<li><b>${r.author}</b>: ${r.text}</li>`).join('')
        : '<li>Пока нет отзывов. Будьте первым!</li>';
}

function setupReviewForm(recipeId) {
    const form = document.getElementById('review-form');
    if (!form) return;

    form.onsubmit = function(e) {
        e.preventDefault();

        // Проверяем авторизацию
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!token || !user) {
            showNotification('Необходимо войти в аккаунт для отправки отзыва', 'error');
            return;
        }

        const text = form.querySelector('#review-text').value.trim();
        if (!text) return;

        saveRecipeReview(recipeId, { 
            author: user.username, 
            text: text 
        });
        
        form.reset();
        renderRecipeReviews(recipeId);
        showNotification('Отзыв успешно добавлен', 'success');
    };
}

// Обновляем стили для блока отзывов
const style = document.createElement('style');
style.textContent = `
    .login-to-review {
        text-align: center;
        padding: 15px;
        background-color: #f8f8f8;
        border-radius: 4px;
        margin-top: 15px;
    }

    .login-to-review .auth-button {
        background: none;
        border: none;
        color: #4CAF50;
        cursor: pointer;
        font-weight: 500;
        padding: 0;
        margin: 0;
        font-size: inherit;
    }

    .login-to-review .auth-button:hover {
        text-decoration: underline;
    }

    .dark-mode .login-to-review {
        background-color: #333;
        color: #fff;
    }

    .dark-mode .login-to-review .auth-button {
        color: #FFD500;
    }
`;
document.head.appendChild(style);

// Функция для обновления UI после авторизации
function updateAuthUI() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    const authButton = document.querySelector('.auth-button');
    const userProfile = document.querySelector('.user-profile');
    
    if (token && user) {
        // Пользователь авторизован
        if (authButton) authButton.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'block';
            const avatar = userProfile.querySelector('.avatar');
            const username = userProfile.querySelector('.username');
            if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
            if (username) username.textContent = user.username;
        }
    } else {
        // Пользователь не авторизован
        if (authButton) authButton.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
}

    // Диспатчим событие для обновления UI
    window.dispatchEvent(new Event('userAuthChanged'));
}

// Инициализация профиля
function initializeProfile() {
    const profileButton = document.querySelector('.profile-button');
    const profileMenu = document.querySelector('.profile-menu');
    
    if (profileButton && profileMenu) {
        // Удаляем старые обработчики
        profileButton.removeEventListener('click', handleProfileClick);
        document.removeEventListener('click', handleDocumentClick);

        // Добавляем новые обработчики
        profileButton.addEventListener('click', handleProfileClick);
        document.addEventListener('click', handleDocumentClick);
    }
}

// Обработчик клика по кнопке профиля
function handleProfileClick(e) {
    e.stopPropagation();
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.classList.toggle('active');
    }
}

// Обработчик клика по документу для закрытия меню
function handleDocumentClick(e) {
    const profileButton = document.querySelector('.profile-button');
    const profileMenu = document.querySelector('.profile-menu');
    
    if (profileMenu && profileButton && 
        !profileMenu.contains(e.target) && 
        !profileButton.contains(e.target)) {
        profileMenu.classList.remove('active');
    }
}

// Функция выхода из системы
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showNotification('Вы успешно вышли из системы');
}

// Вызываем функции при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initializeProfile();
});
