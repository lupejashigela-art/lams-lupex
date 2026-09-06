const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recordMovement, nextCode } = require('../services/stockService');
const { checkApprovalNeeded, createApproval } = require('../services/approvalService');

const router = express.Router();

/**
 * GET /api/purchases
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, f.name AS farmer_name, c.name AS crop_name, u.username AS created_by_name
      FROM purchases p
      JOIN farmers f ON f.id = p.farmer_id
      JOIN crops c ON c.id = p.crop_id
      JOIN users u ON u.id = p.created_by
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
});

/**
 * POST /api/purchases
 * Body: farmerId, cropId, warehouseId, qtyDebe, pricePerDebe,
 *       transportCost, loadingCost, otherCost, paidAmount, notes
 */
router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'SALES'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      farmerId, cropId, warehouseId,
      qtyDebe, pricePerDebe,
      transportCost = 0, loadingCost = 0, otherCost = 0,
      paidAmount = 0, notes,
    } = req.body;

    if (!farmerId || !cropId || !qtyDebe || !pricePerDebe) {
      return res.status(400).json({ error: 'farmerId, cropId, qtyDebe, pricePerDebe required' });
    }

    const qty = parseFloat(qtyDebe);
    const price = parseFloat(pricePerDebe);
    const transport = parseFloat(transportCost) || 0;
    const loading = parseFloat(loadingCost) || 0;
    const other = parseFloat(otherCost) || 0;
    const cropCost = qty * price;
    const totalCost = cropCost + transport + loading + other;
    const paid = parseFloat(paidAmount) || 0;
    const balance = totalCost - paid;

    // Price lock check
    const lock = await db.query(
      `SELECT min_buy_price, max_buy_price FROM price_locks WHERE crop_id = $1`,
      [cropId]
    );
    if (lock.rows[0]) {
      const { min_buy_price, max_buy_price } = lock.rows[0];
      if (price < parseFloat(min_buy_price) || price > parseFloat(max_buy_price)) {
        return res.status(400).json({
          error: 'Price outside approved range',
          allowed: { min: min_buy_price, max: max_buy_price },
        });
      }
    }

    // Default warehouse
    let whId = warehouseId;
    if (!whId) {
      const wh = await db.query(`SELECT id FROM warehouses WHERE is_active = TRUE ORDER BY id LIMIT 1`);
      whId = wh.rows[0]?.id;
    }

    const code = await nextCode('PUR', 'purchases', 'purchase_code');
    const { needsApproval, requiredRole } = await checkApprovalNeeded(totalCost, req.user.role);

    await client.query('BEGIN');

    // Create lot
    const lotCode = await nextCode('LOT', 'lots', 'lot_code');
    const lotRes = await client.query(
      `INSERT INTO lots (lot_code, crop_id, farmer_id, warehouse_id,
        initial_qty_debe, current_qty_debe, avg_cost_per_debe, status)
       VALUES ($1,$2,$3,$4,$5,$5,$6,'ACTIVE') RETURNING id`,
      [lotCode, cropId, farmerId, whId, qty, totalCost / qty]
    );
    const lotId = lotRes.rows[0].id;

    const status = needsApproval ? 'PENDING' : 'COMPLETED';

    const purchaseRes = await client.query(
      `INSERT INTO purchases (
        purchase_code, farmer_id, crop_id, warehouse_id, lot_id, date,
        qty_debe, price_per_debe, crop_cost, transport_cost, loading_cost, other_cost,
        total_cost, paid_amount, balance, status, created_by, notes
      ) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [code, farmerId, cropId, whId, lotId, qty, price, cropCost,
       transport, loading, other, totalCost, paid, balance, status, req.user.id, notes || null]
    );
    const purchase = purchaseRes.rows[0];

    // Link lot to purchase
    await client.query(`UPDATE lots SET purchase_id = $1 WHERE id = $2`, [purchase.id, lotId]);

    if (needsApproval) {
      await createApproval({
        entityType: 'PURCHASE',
        entityId: purchase.id,
        amount: totalCost,
        requestedBy: req.user.id,
        requiredRole,
      });
    } else {
      // Stock in
      await recordMovement({
        cropId,
        warehouseId: whId,
        lotId,
        movementType: 'PURCHASE',
        qtyDebe: qty,
        unitCost: totalCost / qty,
        referenceType: 'purchase',
        referenceId: purchase.id,
        userId: req.user.id,
        client,
      });
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,$3,'purchase',$4,$5)`,
      [req.user.id, req.user.username,
       needsApproval ? 'PURCHASE_PENDING' : 'PURCHASE_CREATE',
       purchase.id, JSON.stringify(purchase)]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...purchase,
      needsApproval,
      message: needsApproval
        ? 'Purchase created as PENDING – awaiting approval'
        : 'Purchase completed and stock updated',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase' });
  } finally {
    client.release();
  }
});

module.exports = router;
