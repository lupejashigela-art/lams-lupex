const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log('Login attempt for:', username);

    const result = await db.query(
      `SELECT u.id, u.username, u.password_hash, u.full_name, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.username = $1`,
      [username]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'LupexMR99_fallback_secret_2026';
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error('LOGIN ERROR FULL:', err);
    return res.status(500).json({ 
      error: 'Login failed', 
      detail: String(err.message || err),
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
