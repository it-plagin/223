// Базовый URL API
const API_BASE_URL = 'http://localhost:3000/api';

// Вспомогательная функция для запросов с авторизацией
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Неавторизован - перенаправляем на страницу входа
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = '/admin.html';
        }
        throw new Error('Сессия истекла');
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Ошибка запроса' }));
        throw new Error(error.error || 'Ошибка запроса');
    }
    
    if (response.status === 204) {
        return null;
    }
    
    return response.json();
}

// Публичные API
const PublicAPI = {
    // Получить события за месяц
    getEventsByMonth: (month) => {
        const url = month ? `/events/public?month=${month}` : '/events/public';
        return apiRequest(url);
    }
};

// Админские API
const AdminAPI = {
    // Логин
    login: (email, password) => {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    // Получить текущего пользователя
    getMe: () => {
        return apiRequest('/auth/me');
    },
    
    // Получить все события
    getEvents: () => {
        return apiRequest('/admin/events');
    },
    
    // Создать событие
    createEvent: (eventData) => {
        return apiRequest('/admin/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    },
    
    // Обновить событие
    updateEvent: (id, eventData) => {
        return apiRequest(`/admin/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
    },
    
    // Удалить событие
    deleteEvent: (id) => {
        return apiRequest(`/admin/events/${id}`, {
            method: 'DELETE'
        });
    }
};