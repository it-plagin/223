const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth');
const publicEventsRoutes = require('./routes/events-public');
const adminEventsRoutes = require('./routes/events-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Инициализация файлов данных при первом запуске
function initDataFiles() {
    const dataDir = path.join(__dirname, 'data');
    
    // Создаем директорию data если её нет
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Инициализируем users.json
    const usersPath = path.join(dataDir, 'users.json');
    if (!fs.existsSync(usersPath)) {
        // Хэшируем пароль "password123"
        const hashedPassword = bcrypt.hashSync('password123', 10);
        const defaultUsers = [
            {
                id: '1',
                email: 'admin@example.com',
                password: hashedPassword,
                name: 'Администратор'
            }
        ];
        fs.writeFileSync(usersPath, JSON.stringify(defaultUsers, null, 2));
        console.log('✅ Создан users.json с пользователем admin@example.com / password123');
    }
    
    // Инициализируем events.json с тестовыми данными
    const eventsPath = path.join(dataDir, 'events.json');
    if (!fs.existsSync(eventsPath)) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const testEvents = [
            {
                id: '1',
                title: 'Еженедельная планёрка',
                description: 'Обсуждение задач на неделю',
                start: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(), // через 2 часа
                end: new Date(today.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                category: 'встреча',
                status: 'опубликовано'
            },
            {
                id: '2',
                title: 'Вебинар по TypeScript',
                description: 'Введение в TypeScript для начинающих',
                start: new Date(today.getTime() + 5 * 60 * 60 * 1000).toISOString(), // через 5 часов
                end: new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                category: 'вебинар',
                status: 'опубликовано'
            },
            {
                id: '3',
                title: 'Конференция разработчиков',
                description: 'Ежегодная конференция',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0).toISOString(),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 18, 0).toISOString(),
                category: 'конференция',
                status: 'опубликовано'
            },
            {
                id: '4',
                title: 'Бронь переговорной',
                description: 'Встреча с клиентом',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0).toISOString(),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 0).toISOString(),
                category: 'бронь',
                status: 'опубликовано'
            },
            {
                id: '5',
                title: 'Code Review',
                description: 'Ревью кода проекта',
                start: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 часа назад
                end: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                category: 'встреча',
                status: 'опубликовано'
            },
            {
                id: '6',
                title: 'Черновик мероприятия',
                description: 'Это мероприятие в черновике',
                start: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                end: new Date(today.getTime() + 25 * 60 * 60 * 1000).toISOString(),
                category: 'вебинар',
                status: 'черновик'
            }
        ];
        fs.writeFileSync(eventsPath, JSON.stringify(testEvents, null, 2));
        console.log('✅ Создан events.json с тестовыми данными');
    }
}

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/events/public', publicEventsRoutes);
app.use('/api/admin/events', adminEventsRoutes);

// Отдача HTML страниц
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Инициализация и запуск сервера
initDataFiles();

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📅 Публичная страница: http://localhost:${PORT}`);
    console.log(`🔐 Админ панель: http://localhost:${PORT}/admin`);
});