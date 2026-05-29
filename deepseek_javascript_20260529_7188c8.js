const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { generateToken, authenticateToken } = require('../auth');

const router = express.Router();
const usersPath = path.join(__dirname, '../data/users.json');

// Вспомогательная функция для чтения пользователей
function getUsers() {
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
}

// POST /api/auth/login - вход в систему
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Валидация входных данных
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }
        
        const users = getUsers();
        const user = users.find(u => u.email === email);
        
        // Проверка существования пользователя и пароля
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Генерация токена
        const token = generateToken(user);
        
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// GET /api/auth/me - получение информации о текущем пользователе
router.get('/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

module.exports = router;