const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный или просроченный токен' });
        }
        req.user = user;
        next();
    });
}

// Генерация JWT токена
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

module.exports = { authenticateToken, generateToken };