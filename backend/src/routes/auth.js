const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.password_hash, u.full_name, u.role_id, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.username = $1 AND u.is_active = TRUE`,
      [username]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    } catch (e) {
      console.warn('Failed to update last_login:', e.message);
    }

    const secret = process.env.JWT_SECRET || 'LupexMR99_SuperSecret_Key_2026_fallback';
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, username, action) VALUES ($1, $2, 'LOGIN')`,
        [user.id, user.username]
      );
    } catch (e) {
      console.warn('Audit log failed:', e.message);
    }

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
