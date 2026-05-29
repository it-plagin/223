const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../auth');

const router = express.Router();
const eventsPath = path.join(__dirname, '../data/events.json');

// Применяем middleware аутентификации ко всем маршрутам
router.use(authenticateToken);

// Вспомогательные функции
function getEvents() {
    const data = fs.readFileSync(eventsPath, 'utf8');
    return JSON.parse(data);
}

function saveEvents(events) {
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
}

// Генерация уникального ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// GET /api/admin/events - получить все события (включая черновики)
router.get('/', (req, res) => {
    try {
        const events = getEvents();
        res.json(events);
    } catch (error) {
        console.error('Ошибка получения событий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// POST /api/admin/events - создать новое событие
router.post('/', (req, res) => {
    try {
        const { title, description, start, end, category, status } = req.body;
        
        // Валидация
        if (!title || !start || !end || !category) {
            return res.status(400).json({ error: 'Название, дата начала, дата окончания и категория обязательны' });
        }
        
        const events = getEvents();
        const newEvent = {
            id: generateId(),
            title,
            description: description || '',
            start,
            end,
            category,
            status: status || 'черновик'
        };
        
        events.push(newEvent);
        saveEvents(events);
        
        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Ошибка создания события:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// PUT /api/admin/events/:id - обновить событие
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, start, end, category, status } = req.body;
        
        const events = getEvents();
        const eventIndex = events.findIndex(e => e.id === id);
        
        if (eventIndex === -1) {
            return res.status(404).json({ error: 'Событие не найдено' });
        }
        
        // Обновляем событие
        events[eventIndex] = {
            ...events[eventIndex],
            title: title || events[eventIndex].title,
            description: description !== undefined ? description : events[eventIndex].description,
            start: start || events[eventIndex].start,
            end: end || events[eventIndex].end,
            category: category || events[eventIndex].category,
            status: status || events[eventIndex].status
        };
        
        saveEvents(events);
        res.json(events[eventIndex]);
    } catch (error) {
        console.error('Ошибка обновления события:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// DELETE /api/admin/events/:id - удалить событие
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        let events = getEvents();
        const eventExists = events.some(e => e.id === id);
        
        if (!eventExists) {
            return res.status(404).json({ error: 'Событие не найдено' });
        }
        
        events = events.filter(e => e.id !== id);
        saveEvents(events);
        
        res.status(204).send();
    } catch (error) {
        console.error('Ошибка удаления события:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;