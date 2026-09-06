const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recordMovement } = require('../services/stockService');

const router = express.Router();

/**
 * GET /api/stock
 * Current balances per crop + warehouse + valuation
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        c.id AS crop_id,
        c.name AS crop,
        w.id AS warehouse_id,
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        COALESCE(sb.qty_debe, 0) AS qty_debe,
        COALESCE(sb.avg_cost, 0) AS avg_cost,
        COALESCE(sb.qty_debe, 0) * COALESCE(sb.avg_cost, 0) AS value
      FROM crops c
      CROSS JOIN warehouses w
      LEFT JOIN stock_balances sb ON sb.crop_id = c.id AND sb.warehouse_id = w.id
      WHERE c.is_active = TRUE AND w.is_active = TRUE
      ORDER BY c.name, w.code
    `);

    // Summary by crop
    const byCrop = {};
    for (const r of rows) {
      if (!byCrop[r.crop]) {
        byCrop[r.crop] = { crop: r.crop, cropId: r.crop_id, qtyDebe: 0, value: 0, warehouses: [] };
      }
      const qty = parseFloat(r.qty_debe);
      const val = parseFloat(r.value);
      byCrop[r.crop].qtyDebe += qty;
      byCrop[r.crop].value += val;
      byCrop[r.crop].warehouses.push({
        warehouseId: r.warehouse_id,
        code: r.warehouse_code,
        name: r.warehouse_name,
        qtyDebe: qty,
        avgCost: parseFloat(r.avg_cost),
        value: val,
      });
    }

    res.json({
      details: rows,
      summary: Object.values(byCrop),
      totalValue: Object.values(byCrop).reduce((s, x) => s + x.value, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stock' });
  }
});

/**
 * POST /api/stock/physical-count
 * Body: cropId, warehouseId, physicalQtyDebe, reason, adjust?: boolean
 */
router.post('/physical-count', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { cropId, warehouseId, physicalQtyDebe, reason, adjust = false } = req.body;
    if (!cropId || physicalQtyDebe == null) {
      return res.status(400).json({ error: 'cropId and physicalQtyDebe required' });
    }

    let whId = warehouseId;
    if (!whId) {
      const wh = await db.query(`SELECT id FROM warehouses WHERE is_active = TRUE ORDER BY id LIMIT 1`);
      whId = wh.rows[0]?.id;
    }

    const bal = await db.query(
      `SELECT qty_debe FROM stock_balances WHERE crop_id = $1 AND warehouse_id = $2`,
      [cropId, whId]
    );
    const systemQty = parseFloat(bal.rows[0]?.qty_debe) || 0;
    const physical = parseFloat(physicalQtyDebe);
    const variance = physical - systemQty;
    const variancePct = systemQty > 0 ? (Math.abs(variance) / systemQty) * 100 : 0;

    // Max loss check
    const settings = await db.query(`SELECT max_loss_pct FROM business_settings ORDER BY id LIMIT 1`);
    const maxLoss = parseFloat(settings.rows[0]?.max_loss_pct) || 5;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO physical_counts
       (crop_id, warehouse_id, system_qty, physical_qty, variance, variance_pct, reason, adjusted, counted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cropId, whId, systemQty, physical, variance, variancePct, reason || null, !!adjust, req.user.id]
    );

    if (adjust && Math.abs(variance) > 0.01) {
      await recordMovement({
        cropId,
        warehouseId: whId,
        movementType: 'ADJUSTMENT',
        qtyDebe: variance,
        unitCost: 0,
        referenceType: 'physical_count',
        referenceId: rows[0].id,
        notes: reason || 'Physical count adjustment',
        userId: req.user.id,
        client,
      });
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'PHYSICAL_COUNT','physical_count',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...rows[0],
      warning: variancePct > maxLoss ? `Variance ${variancePct.toFixed(1)}% exceeds max loss ${maxLoss}%` : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record physical count' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/stock/crops — list crops for forms
 */
router.get('/crops', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, name FROM crops WHERE is_active = TRUE ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list crops' });
  }
});

/**
 * GET /api/stock/warehouses
 */
router.get('/warehouses', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, code, name FROM warehouses WHERE is_active = TRUE ORDER BY code`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list warehouses' });
  }
});

module.exports = router;
