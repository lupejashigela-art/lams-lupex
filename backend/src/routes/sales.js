const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recordMovement, getAvailableStock, nextCode } = require('../services/stockService');
const { checkApprovalNeeded, createApproval } = require('../services/approvalService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, b.name AS buyer_name, c.name AS crop_name, u.username AS created_by_name
      FROM sales s
      JOIN buyers b ON b.id = s.buyer_id
      JOIN crops c ON c.id = s.crop_id
      JOIN users u ON u.id = s.created_by
      ORDER BY s.date DESC, s.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list sales' });
  }
});

/**
 * POST /api/sales
 * mode: DEBE | KILO | KOBOA
 */
router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'SALES'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      buyerId, cropId, warehouseId,
      mode = 'DEBE',
      qtyDebe, totalKg = 0, pricePerUnit,
      millingCostPerKg = 0,
      receivedAmount = 0,
      dueDays = 7,
      notes,
    } = req.body;

    if (!buyerId || !cropId || !qtyDebe || !pricePerUnit) {
      return res.status(400).json({ error: 'buyerId, cropId, qtyDebe, pricePerUnit required' });
    }

    const qty = parseFloat(qtyDebe);
    const price = parseFloat(pricePerUnit);
    const kg = parseFloat(totalKg) || 0;
    const millPerKg = parseFloat(millingCostPerKg) || 0;

    // Stock check
    let whId = warehouseId;
    if (!whId) {
      const wh = await db.query(`SELECT id FROM warehouses WHERE is_active = TRUE ORDER BY id LIMIT 1`);
      whId = wh.rows[0]?.id;
    }
    const available = await getAvailableStock(cropId, whId);
    if (qty > available) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available,
        requested: qty,
      });
    }

    // Calculate amounts
    let grossAmount, millingTotal, totalAmount;
    if (mode === 'KOBOA') {
      grossAmount = kg * price;
      millingTotal = kg * millPerKg;
      totalAmount = grossAmount - millingTotal;
    } else if (mode === 'KILO') {
      grossAmount = kg * price;
      millingTotal = 0;
      totalAmount = grossAmount;
    } else {
      // DEBE
      grossAmount = qty * price;
      millingTotal = 0;
      totalAmount = grossAmount;
    }

    const received = parseFloat(receivedAmount) || 0;
    const balance = totalAmount - received;

    // Credit limit check
    if (balance > 0.5) {
      const buyer = await db.query(`SELECT credit_limit FROM buyers WHERE id = $1`, [buyerId]);
      const limit = parseFloat(buyer.rows[0]?.credit_limit) || 0;
      if (limit > 0) {
        const debtRes = await db.query(
          `SELECT COALESCE(SUM(balance), 0) AS debt FROM sales
           WHERE buyer_id = $1 AND balance > 0.5 AND status IN ('COMPLETED','APPROVED')`,
          [buyerId]
        );
        const currentDebt = parseFloat(debtRes.rows[0].debt);
        if (currentDebt + balance > limit) {
          return res.status(400).json({
            error: 'Credit limit exceeded',
            creditLimit: limit,
            currentDebt,
            thisSale: balance,
          });
        }
      }
    }

    const code = await nextCode('SAL', 'sales', 'sale_code');
    const { needsApproval, requiredRole } = await checkApprovalNeeded(totalAmount, req.user.role);

    let dueDate = null;
    if (balance > 0.5) {
      const d = new Date();
      d.setDate(d.getDate() + (parseInt(dueDays, 10) || 7));
      dueDate = d.toISOString().slice(0, 10);
    }

    await client.query('BEGIN');

    const status = needsApproval ? 'PENDING' : 'COMPLETED';
    const saleRes = await client.query(
      `INSERT INTO sales (
        sale_code, buyer_id, crop_id, warehouse_id, date, mode,
        qty_debe, total_kg, price_per_unit, milling_cost_per_kg, milling_total,
        gross_amount, total_amount, received_amount, balance, due_date,
        status, created_by, notes
      ) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [code, buyerId, cropId, whId, mode, qty, kg, price, millPerKg, millingTotal,
       grossAmount, totalAmount, received, balance, dueDate, status, req.user.id, notes || null]
    );
    const sale = saleRes.rows[0];

    if (needsApproval) {
      await createApproval({
        entityType: 'SALE',
        entityId: sale.id,
        amount: totalAmount,
        requestedBy: req.user.id,
        requiredRole,
      });
    } else {
      // Stock out
      await recordMovement({
        cropId,
        warehouseId: whId,
        movementType: 'SALE',
        qtyDebe: -qty,
        unitCost: 0,
        referenceType: 'sale',
        referenceId: sale.id,
        userId: req.user.id,
        client,
      });
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,$3,'sale',$4,$5)`,
      [req.user.id, req.user.username,
       needsApproval ? 'SALE_PENDING' : 'SALE_CREATE',
       sale.id, JSON.stringify(sale)]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...sale,
      needsApproval,
      message: needsApproval
        ? 'Sale created as PENDING – awaiting approval'
        : 'Sale completed and stock updated',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    client.release();
  }
});

module.exports = router;
