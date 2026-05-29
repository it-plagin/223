// Глобальные переменные
let allEvents = [];
let currentNowEventsPage = 0;
let currentTodayEventsPage = 0;
let currentWeekEventsPage = 0;
let eventsPerPage = 4;
let currentMonth = new Date();
let countdownIntervals = [];

// DOM элементы
let nowContainer, todayContainer, weekContainer;
let nowPagination, todayPagination, weekPagination;
let calendarGrid, currentMonthDisplay, calendarFilters;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    nowContainer = document.getElementById('nowEvents');
    todayContainer = document.getElementById('todayEvents');
    weekContainer = document.getElementById('weekEvents');
    nowPagination = document.getElementById('nowPagination');
    todayPagination = document.getElementById('todayPagination');
    weekPagination = document.getElementById('weekPagination');
    calendarGrid = document.getElementById('calendarGrid');
    currentMonthDisplay = document.getElementById('currentMonth');
    
    // Загружаем события
    loadEvents();
    
    // Настройка календаря
    setupCalendar();
    
    // Настройка фильтров календаря
    setupCalendarFilters();
});

// Загрузка событий с сервера
async function loadEvents() {
    try {
        // Загружаем события за текущий месяц для календаря
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        allEvents = await PublicAPI.getEventsByMonth(monthStr);
        
        // Обновляем все секции
        updateNowColumn();
        updateTodayColumn();
        updateWeekColumn();
        updateCalendar();
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
        showError('Не удалось загрузить мероприятия');
    }
}

// Получение текущего времени
function getCurrentTime() {
    return new Date();
}

// Проверка, идет ли событие сейчас
function isEventNow(event) {
    const now = getCurrentTime();
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start <= now && end >= now;
}

// Проверка, было ли событие сегодня (прошедшее, но не более 4 часов)
function isEventPastToday(event) {
    const now = getCurrentTime();
    const end = new Date(event.end);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    return end < now && end > fourHoursAgo;
}

// Проверка, является ли событие будущим сегодня
function isEventFutureToday(event) {
    const now = getCurrentTime();
    const start = new Date(event.start);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return start > now && start >= todayStart && start < todayEnd;
}

// Проверка, является ли событие сегодняшним
function isEventToday(event) {
    const now = getCurrentTime();
    const eventStart = new Date(event.start);
    return eventStart.getDate() === now.getDate() &&
           eventStart.getMonth() === now.getMonth() &&
           eventStart.getFullYear() === now.getFullYear();
}

// Проверка, входит ли событие в недельный период
function isEventInWeek(event) {
    const now = getCurrentTime();
    const eventStart = new Date(event.start);
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventStart > now && eventStart <= weekLater && !isEventToday(event) && !isEventNow(event);
}

// Форматирование даты и времени
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return {
        date: date.toLocaleDateString('ru-RU'),
        time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
}

// Создание карточки события
function createEventCard(event, type = 'future') {
    const { date, time } = formatDateTime(event.start);
    const { time: endTime } = formatDateTime(event.end);
    
    const card = document.createElement('div');
    card.className = 'event-item';
    
    if (type === 'now') {
        card.classList.add('current');
    } else if (type === 'past') {
        card.classList.add('past');
    }
    
    const categoryClass = `category-${event.category}`;
    
    card.innerHTML = `
        ${type === 'now' ? '<span class="blink-icon"></span>' : ''}
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="datetime">
            <span>📅 ${date}</span>
            <span>⏰ ${time} - ${endTime}</span>
            <span class="${categoryClass}">${event.category}</span>
        </div>
        ${event.description ? `<div class="note">${escapeHtml(event.description)}</div>` : ''}
        ${type === 'future' ? `<div class="countdown" data-start="${event.start}"></div>` : ''}
    `;
    
    return card;
}

// Обновление колонки "Сейчас идёт"
function updateNowColumn() {
    const nowEvents = allEvents.filter(event => isEventNow(event));
    const start = currentNowEventsPage * eventsPerPage;
    const end = start + eventsPerPage;
    const pageEvents = nowEvents.slice(start, end);
    
    // Анимация fade
    nowContainer.style.opacity = '0';
    setTimeout(() => {
        nowContainer.innerHTML = '';
        pageEvents.forEach(event => {
            nowContainer.appendChild(createEventCard(event, 'now'));
        });
        
        // Обновляем пагинацию
        const totalPages = Math.ceil(nowEvents.length / eventsPerPage);
        updatePaginationButtons(nowPagination, currentNowEventsPage, totalPages, 'now');
        
        nowContainer.style.opacity = '1';
    }, 200);
}

// Обновление колонки "Сегодня запланировано"
function updateTodayColumn() {
    const todayEvents = allEvents.filter(event => isEventToday(event));
    const pastEvents = todayEvents.filter(event => isEventPastToday(event));
    const futureEvents = todayEvents.filter(event => isEventFutureToday(event));
    
    // Сортируем и комбинируем
    const sortedEvents = [...pastEvents, ...futureEvents].sort((a, b) => 
        new Date(a.start) - new Date(b.start)
    );
    
    const start = currentTodayEventsPage * eventsPerPage;
    const end = start + eventsPerPage;
    const pageEvents = sortedEvents.slice(start, end);
    
    todayContainer.style.opacity = '0';
    setTimeout(() => {
        todayContainer.innerHTML = '';
        pageEvents.forEach(event => {
            const type = isEventPastToday(event) ? 'past' : 'future';
            todayContainer.appendChild(createEventCard(event, type));
        });
        
        const totalPages = Math.ceil(sortedEvents.length / eventsPerPage);
        updatePaginationButtons(todayPagination, currentTodayEventsPage, totalPages, 'today');
        
        todayContainer.style.opacity = '1';
        updateCountdowns();
    }, 200);
}

// Обновление колонки "На неделе"
function updateWeekColumn() {
    const weekEvents = allEvents.filter(event => isEventInWeek(event));
    const start = currentWeekEventsPage * eventsPerPage;
    const end = start + eventsPerPage;
    const pageEvents = weekEvents.slice(start, end);
    
    weekContainer.style.opacity = '0';
    setTimeout(() => {
        weekContainer.innerHTML = '';
        pageEvents.forEach(event => {
            weekContainer.appendChild(createEventCard(event, 'future'));
        });
        
        const totalPages = Math.ceil(weekEvents.length / eventsPerPage);
        updatePaginationButtons(weekPagination, currentWeekEventsPage, totalPages, 'week');
        
        weekContainer.style.opacity = '1';
        updateCountdowns();
    }, 200);
}

// Обновление кнопок пагинации
function updatePaginationButtons(container, currentPage, totalPages, type) {
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <button onclick="changePage('${type}', ${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>← Назад</button>
        <span>Страница ${currentPage + 1} из ${totalPages}</span>
        <button onclick="changePage('${type}', ${currentPage + 1})" ${currentPage === totalPages - 1 ? 'disabled' : ''}>Следующие →</button>
    `;
}

// Смена страницы пагинации
window.changePage = function(type, newPage) {
    switch(type) {
        case 'now':
            currentNowEventsPage = newPage;
            updateNowColumn();
            break;
        case 'today':
            currentTodayEventsPage = newPage;
            updateTodayColumn();
            break;
        case 'week':
            currentWeekEventsPage = newPage;
            updateWeekColumn();
            break;
    }
};

// Обновление обратных отсчетов
function updateCountdowns() {
    // Очищаем старые интервалы
    countdownIntervals.forEach(interval => clearInterval(interval));
    countdownIntervals = [];
    
    const countdowns = document.querySelectorAll('.countdown');
    
    function updateAllCountdowns() {
        countdowns.forEach(element => {
            const startTime = new Date(element.dataset.start);
            const now = getCurrentTime();
            const diff = startTime - now;
            
            if (diff <= 0) {
                element.textContent = '🚀 Началось!';
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                element.textContent = `⏰ Начнется через ${hours} ч ${minutes} мин`;
            } else {
                element.textContent = `⏰ Начнется через ${minutes} мин`;
            }
        });
    }
    
    // Обновляем каждую секунду
    const interval = setInterval(updateAllCountdowns, 1000);
    countdownIntervals.push(interval);
    updateAllCountdowns();
}

// Настройка календаря
function setupCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        updateCalendar();
        loadEvents();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        updateCalendar();
        loadEvents();
    });
}

// Настройка фильтров календаря
function setupCalendarFilters() {
    calendarFilters = document.querySelectorAll('.calendar-filters input');
    calendarFilters.forEach(filter => {
        filter.addEventListener('change', () => updateCalendar());
    });
}

// Обновление календаря
function updateCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    currentMonthDisplay.textContent = currentMonth.toLocaleDateString('ru-RU', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Приводим к понедельнику как первому дню
    
    let calendarHTML = '<tr>';
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(day => {
        calendarHTML += `<th>${day}</th>`;
    });
    calendarHTML += '</tr><tr>';
    
    // Заполняем пустые ячейки
    for (let i = 1; i < startDay; i++) {
        calendarHTML += '<td class="calendar-day-empty"></td>';
    }
    
    // Заполняем дни месяца
    const activeFilters = Array.from(calendarFilters)
        .filter(filter => filter.checked)
        .map(filter => filter.value);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const currentDate = new Date(year, month, day);
        const dayEvents = allEvents.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getDate() === day && 
                   eventDate.getMonth() === month && 
                   eventDate.getFullYear() === year;
        });
        
        // Фильтруем события по выбранным фильтрам
        const filteredEvents = dayEvents.filter(event => {
            if (activeFilters.includes('all') || activeFilters.length === 0) return true;
            if (activeFilters.includes('current') && isEventNow(event)) return true;
            if (activeFilters.includes('today') && isEventToday(event)) return true;
            if (activeFilters.includes('week') && isEventInWeek(event)) return true;
            return false;
        });
        
        calendarHTML += `<td onclick="showDayEvents(${day})">`;
        calendarHTML += `<div class="calendar-day-number">${day}</div>`;
        
        if (filteredEvents.length > 0) {
            calendarHTML += '<div class="event-dots">';
            filteredEvents.forEach(event => {
                let dotClass = 'event-dot';
                if (isEventNow(event)) dotClass += ' current';
                if (isEventToday(event)) dotClass += ' today';
                if (isEventInWeek(event)) dotClass += ' week';
                calendarHTML += `<div class="${dotClass}" title="${escapeHtml(event.title)}"></div>`;
            });
            calendarHTML += '</div>';
        }
        
        calendarHTML += '</td>';
        
        if ((startDay + day - 1) % 7 === 0) {
            calendarHTML += '</tr><tr>';
        }
    }
    
    // Заполняем оставшиеся ячейки
    const remainingCells = 42 - (startDay - 1 + lastDay.getDate());
    for (let i = 0; i < remainingCells; i++) {
        calendarHTML += '<td class="calendar-day-empty"></td>';
    }
    
    calendarHTML += '</tr>';
    calendarGrid.innerHTML = calendarHTML;
}

// Показ событий дня в модальном окне
window.showDayEvents = function(day) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const currentDate = new Date(year, month, day);
    
    const dayEvents = allEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getDate() === day && 
               eventDate.getMonth() === month && 
               eventDate.getFullYear() === year;
    });
    
    const modal = document.getElementById('dayEventsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `События на ${currentDate.toLocaleDateString('ru-RU')}`;
    
    if (dayEvents.length === 0) {
        modalBody.innerHTML = '<p class="no-events">Нет мероприятий на этот день</p>';
    } else {
        modalBody.innerHTML = '';
        dayEvents.forEach(event => {
            const { date, time } = formatDateTime(event.start);
            const { time: endTime } = formatDateTime(event.end);
            const categoryClass = `category-${event.category}`;
            
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event-item';
            eventDiv.innerHTML = `
                <div class="event-title">${escapeHtml(event.title)}</div>
                <div class="datetime">
                    <span>📅 ${date}</span>
                    <span>⏰ ${time} - ${endTime}</span>
                    <span class="${categoryClass}">${event.category}</span>
                </div>
                ${event.description ? `<div class="note">${escapeHtml(event.description)}</div>` : ''}
            `;
            modalBody.appendChild(eventDiv);
        });
    }
    
    modal.classList.add('show');
};

// Закрытие модального окна
window.closeModal = function() {
    const modal = document.getElementById('dayEventsModal');
    modal.classList.remove('show');
};

// Закрытие модального окна при клике вне его
document.addEventListener('click', (e) => {
    const modal = document.getElementById('dayEventsModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Вспомогательная функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показ ошибки
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}