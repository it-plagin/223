// Глобальные переменные
let currentUser = null;
let events = [];
let editingEventId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadEvents();
});

// Проверка авторизации
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin.html';
        return;
    }
    
    try {
        currentUser = await AdminAPI.getMe();
        document.getElementById('userName').textContent = currentUser.name;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        logout();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Форма добавления/редактирования
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
    
    // Кнопка добавления
    document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
    
    // Кнопка закрытия модального окна
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Закрытие модального окна при клике вне его
    const modal = document.getElementById('eventModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Загрузка событий
async function loadEvents() {
    try {
        events = await AdminAPI.getEvents();
        renderEventsTable();
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        showNotification('Не удалось загрузить мероприятия', 'error');
    }
}

// Отображение таблицы событий
function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    events.forEach(event => {
        const row = tbody.insertRow();
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        row.innerHTML = `
            <td>${escapeHtml(event.title)}</td>
            <td>${startDate.toLocaleString('ru-RU')}</td>
            <td>${endDate.toLocaleString('ru-RU')}</td>
            <td><span class="status-badge status-${event.status}">${event.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-primary" onclick="editEvent('${event.id}')">✏️ Редактировать</button>
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">🗑️ Удалить</button>
            </td>
        `;
    });
}

// Открытие модального окна для добавления/редактирования
function openEventModal(eventId = null) {
    editingEventId = eventId;
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (eventId) {
        // Режим редактирования
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = 'Редактировать мероприятие';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventStart').value = event.start.slice(0, 16);
            document.getElementById('eventEnd').value = event.end.slice(0, 16);
            document.getElementById('eventCategory').value = event.category;
            document.getElementById('eventStatus').value = event.status;
        }
    } else {
        // Режим добавления
        modalTitle.textContent = 'Добавить мероприятие';
        form.reset();
        // Устанавливаем значения по умолчанию
        const now = new Date();
        const defaultStart = new Date(now.getTime() + 3600000);
        const defaultEnd = new Date(now.getTime() + 7200000);
        document.getElementById('eventStart').value = defaultStart.toISOString().slice(0, 16);
        document.getElementById('eventEnd').value = defaultEnd.toISOString().slice(0, 16);
    }
    
    modal.classList.add('show');
}

// Редактирование события (глобальная функция)
window.editEvent = function(id) {
    openEventModal(id);
};

// Удаление события (глобальная функция)
window.deleteEvent = async function(id) {
    if (confirm('Вы уверены, что хотите удалить это мероприятие?')) {
        try {
            await AdminAPI.deleteEvent(id);
            showNotification('Мероприятие успешно удалено', 'success');
            await loadEvents();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            showNotification('Не удалось удалить мероприятие', 'error');
        }
    }
};

// Обработка отправки формы
async function handleEventSubmit(e) {
    e.preventDefault();
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        start: document.getElementById('eventStart').value,
        end: document.getElementById('eventEnd').value,
        category: document.getElementById('eventCategory').value,
        status: document.getElementById('eventStatus').value
    };
    
    // Валидация
    if (new Date(eventData.start) >= new Date(eventData.end)) {
        showNotification('Дата окончания должна быть позже даты начала', 'error');
        return;
    }
    
    try {
        if (editingEventId) {
            // Обновление существующего события
            await AdminAPI.updateEvent(editingEventId, eventData);
            showNotification('Мероприятие успешно обновлено', 'success');
        } else {
            // Создание нового события
            await AdminAPI.createEvent(eventData);
            showNotification('Мероприятие успешно создано', 'success');
        }
        
        closeModal();
        await loadEvents();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Не удалось сохранить мероприятие', 'error');
    }
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('show');
    editingEventId = null;
    document.getElementById('eventForm').reset();
}

// Выход из системы
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/admin.html';
}

// Показ уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}