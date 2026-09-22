const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'LupexMR99_SuperSecret_Key_2026_fallback';

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token required' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.full_name, u.role_id, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
