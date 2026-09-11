const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, phone, location, notes, credit_limit, risk_level, is_active, created_at
       FROM buyers ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list buyers' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'SALES'), async (req, res) => {
  try {
    const { name, phone, location, notes, creditLimit } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      `INSERT INTO buyers (name, phone, location, notes, credit_limit)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, phone || null, location || null, notes || null, creditLimit || 0]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'BUYER_CREATE','buyer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create buyer' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM buyers WHERE id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Buyer not found' });
    const debt = await db.query(
      `SELECT COALESCE(SUM(balance),0) AS debt FROM sales
       WHERE buyer_id=$1 AND balance>0.5 AND status IN ('COMPLETED','APPROVED')`,
      [req.params.id]
    );
    res.json({ ...rows[0], currentDebt: parseFloat(debt.rows[0].debt) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get buyer' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { name, phone, location, notes, creditLimit } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      `UPDATE buyers SET name=$1, phone=$2, location=$3, notes=$4,
        credit_limit=COALESCE($5, credit_limit), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, phone || null, location || null, notes || null, creditLimit ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Buyer not found' });
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'BUYER_UPDATE','buyer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update buyer' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const linked = await db.query(`SELECT COUNT(*)::int AS c FROM sales WHERE buyer_id=$1`, [req.params.id]);
    if (linked.rows[0].c > 0) {
      return res.status(400).json({
        error: `Haiwezi kufutwa: kuna mauzo ${linked.rows[0].c}. Badilisha jina badala yake.`,
      });
    }
    const { rows } = await db.query(`DELETE FROM buyers WHERE id=$1 RETURNING id, name`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Buyer not found' });
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'BUYER_DELETE','buyer',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );
    res.json({ message: 'Buyer deleted', deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete buyer' });
  }
});

module.exports = router;
