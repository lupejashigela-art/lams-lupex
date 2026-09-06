const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// List farmers
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, phone, location, notes, reliability_score, is_active, created_at
       FROM farmers ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list farmers' });
  }
});

// Create farmer
router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'SALES'), async (req, res) => {
  try {
    const { name, phone, location, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { rows } = await db.query(
      `INSERT INTO farmers (name, phone, location, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone || null, location || null, notes || null]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1, $2, 'FARMER_CREATE', 'farmer', $3, $4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create farmer' });
  }
});

// Get one
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM farmers WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Farmer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get farmer' });
  }
});

module.exports = router;
