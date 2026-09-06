const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/audit
 * Recent audit trail (OWNER / MANAGER only)
 */
router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const { rows } = await db.query(`
      SELECT id, username, action, entity_type, entity_id,
             before_data, after_data, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

module.exports = router;
