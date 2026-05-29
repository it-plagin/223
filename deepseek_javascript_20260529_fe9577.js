const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const eventsPath = path.join(__dirname, '../data/events.json');

// Вспомогательная функция для чтения событий
function getEvents() {
    const data = fs.readFileSync(eventsPath, 'utf8');
    const events = JSON.parse(data);
    // Возвращаем только опубликованные события
    return events.filter(event => event.status === 'опубликовано');
}

// GET /api/events/public?month=YYYY-MM
router.get('/', (req, res) => {
    try {
        const { month } = req.query;
        let events = getEvents();
        
        if (month) {
            // Парсим месяц из запроса
            const [year, monthNum] = month.split('-');
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Последний день месяца
            
            // Фильтруем события за указанный месяц
            events = events.filter(event => {
                const eventStart = new Date(event.start);
                return eventStart >= startDate && eventStart <= endDate;
            });
        }
        
        res.json(events);
    } catch (error) {
        console.error('Ошибка получения публичных событий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;