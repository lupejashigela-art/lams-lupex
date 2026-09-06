const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*, u.username AS created_by_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      ORDER BY e.expense_date DESC
      LIMIT 200
    `);
    const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
    res.json({ items: rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list expenses' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { category, description, amount, expenseDate } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ error: 'category and amount required' });
    }
    const { rows } = await db.query(
      `INSERT INTO expenses (expense_date, category, description, amount, created_by)
       VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5)
       RETURNING *`,
      [expenseDate || null, category, description || null, parseFloat(amount), req.user.id]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'EXPENSE_CREATE','expense',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

module.exports = router;
