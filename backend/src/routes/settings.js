const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await db.query(`SELECT * FROM business_settings ORDER BY id LIMIT 1`);
    const locks = await db.query(`
      SELECT pl.*, c.name AS crop_name
      FROM price_locks pl
      JOIN crops c ON c.id = pl.crop_id
    `);
    res.json({
      business: settings.rows[0] || {},
      priceLocks: locks.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/settings/limits
 * Body: staffLimit, managerLimit, maxLossPct
 */
router.put('/limits', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { staffLimit, managerLimit, maxLossPct } = req.body;
    await db.query(
      `UPDATE business_settings SET
        staff_limit = COALESCE($1, staff_limit),
        manager_limit = COALESCE($2, manager_limit),
        max_loss_pct = COALESCE($3, max_loss_pct),
        updated_at = NOW()
       WHERE id = (SELECT id FROM business_settings ORDER BY id LIMIT 1)`,
      [staffLimit ?? null, managerLimit ?? null, maxLossPct ?? null]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, after_data)
       VALUES ($1, $2, 'SETTINGS_LIMITS', $3)`,
      [req.user.id, req.user.username, JSON.stringify(req.body)]
    );
    res.json({ message: 'Limits updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update limits' });
  }
});

/**
 * PUT /api/settings/price-lock
 * Body: cropId, minBuyPrice, maxBuyPrice, minSellPrice, maxSellPrice
 */
router.put('/price-lock', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { cropId, minBuyPrice, maxBuyPrice, minSellPrice, maxSellPrice } = req.body;
    if (!cropId) return res.status(400).json({ error: 'cropId required' });

    await db.query(
      `INSERT INTO price_locks (crop_id, min_buy_price, max_buy_price, min_sell_price, max_sell_price, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (crop_id) DO UPDATE SET
         min_buy_price = EXCLUDED.min_buy_price,
         max_buy_price = EXCLUDED.max_buy_price,
         min_sell_price = EXCLUDED.min_sell_price,
         max_sell_price = EXCLUDED.max_sell_price,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [cropId, minBuyPrice, maxBuyPrice, minSellPrice, maxSellPrice, req.user.id]
    );

    res.json({ message: 'Price lock saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save price lock' });
  }
});

module.exports = router;
