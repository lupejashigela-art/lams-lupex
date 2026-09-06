const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/lots
 * All lots with farmer, crop, warehouse, remaining qty
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        l.id, l.lot_code, l.initial_qty_debe, l.current_qty_debe,
        l.avg_cost_per_debe, l.status, l.created_at,
        c.name AS crop_name,
        f.name AS farmer_name, f.phone AS farmer_phone,
        w.code AS warehouse_code, w.name AS warehouse_name,
        p.purchase_code, p.total_cost AS purchase_cost, p.date AS purchase_date
      FROM lots l
      JOIN crops c ON c.id = l.crop_id
      LEFT JOIN farmers f ON f.id = l.farmer_id
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN purchases p ON p.id = l.purchase_id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list lots' });
  }
});

/**
 * GET /api/lots/:id
 * Full traceability for one lot
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const lot = await db.query(`
      SELECT
        l.*,
        c.name AS crop_name,
        f.name AS farmer_name, f.phone AS farmer_phone, f.location AS farmer_location,
        w.code AS warehouse_code, w.name AS warehouse_name,
        p.purchase_code, p.price_per_debe, p.transport_cost, p.loading_cost,
        p.other_cost, p.total_cost, p.date AS purchase_date
      FROM lots l
      JOIN crops c ON c.id = l.crop_id
      LEFT JOIN farmers f ON f.id = l.farmer_id
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN purchases p ON p.id = l.purchase_id
      WHERE l.id = $1
    `, [req.params.id]);

    if (!lot.rows[0]) return res.status(404).json({ error: 'Lot not found' });

    const movements = await db.query(`
      SELECT movement_type, qty_debe, unit_cost, reference_type, notes, created_at
      FROM stock_movements
      WHERE lot_id = $1
      ORDER BY created_at
    `, [req.params.id]);

    const sales = await db.query(`
      SELECT s.sale_code, s.date, s.qty_debe, s.total_amount, s.mode,
             b.name AS buyer_name
      FROM sales s
      JOIN buyers b ON b.id = s.buyer_id
      WHERE s.lot_id = $1
      ORDER BY s.date
    `, [req.params.id]);

    res.json({
      lot: lot.rows[0],
      movements: movements.rows,
      sales: sales.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load lot details' });
  }
});

module.exports = router;
