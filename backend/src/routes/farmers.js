const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

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

router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'SALES'), async (req, res) => {
  try {
    const { name, phone, location, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      `INSERT INTO farmers (name, phone, location, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, phone || null, location || null, notes || null]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'FARMER_CREATE','farmer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create farmer' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM farmers WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Farmer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get farmer' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { name, phone, location, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      `UPDATE farmers SET name=$1, phone=$2, location=$3, notes=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, phone || null, location || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Farmer not found' });
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'FARMER_UPDATE','farmer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update farmer' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const linked = await db.query(`SELECT COUNT(*)::int AS c FROM purchases WHERE farmer_id=$1`, [req.params.id]);
    if (linked.rows[0].c > 0) {
      return res.status(400).json({
        error: `Haiwezi kufutwa: kuna manunuzi ${linked.rows[0].c}. Badilisha jina badala yake.`,
      });
    }
    const { rows } = await db.query(`DELETE FROM farmers WHERE id=$1 RETURNING id, name`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Farmer not found' });
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'FARMER_DELETE','farmer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.json({ message: 'Farmer deleted', deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete farmer' });
  }
});

module.exports = router;
