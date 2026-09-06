const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recordMovement } = require('../services/stockService');

const router = express.Router();

/**
 * GET /api/approvals/pending
 */
router.get('/pending', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, u.username AS requested_by_name
      FROM approvals a
      JOIN users u ON u.id = a.requested_by
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list pending approvals' });
  }
});

/**
 * POST /api/approvals/:id/decide
 * Body: { decision: 'APPROVED' | 'REJECTED', reason?: string }
 */
router.post('/:id/decide', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { decision, reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
    }

    const { rows } = await db.query(
      `SELECT * FROM approvals WHERE id = $1 AND status = 'PENDING'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pending approval not found' });

    const approval = rows[0];

    // Role check against required_role
    if (approval.required_role === 'OWNER' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only OWNER can approve this amount' });
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE approvals SET status = $1, decided_by = $2, decided_at = NOW(), reason = $3
       WHERE id = $4`,
      [decision, req.user.id, reason || null, approval.id]
    );

    if (decision === 'APPROVED') {
      if (approval.entity_type === 'PURCHASE') {
        const p = await client.query(`SELECT * FROM purchases WHERE id = $1`, [approval.entity_id]);
        if (p.rows[0] && p.rows[0].status === 'PENDING') {
          await client.query(
            `UPDATE purchases SET status = 'COMPLETED', approved_by = $1, approved_at = NOW()
             WHERE id = $2`,
            [req.user.id, approval.entity_id]
          );
          const purchase = p.rows[0];
          await recordMovement({
            cropId: purchase.crop_id,
            warehouseId: purchase.warehouse_id,
            lotId: purchase.lot_id,
            movementType: 'PURCHASE',
            qtyDebe: parseFloat(purchase.qty_debe),
            unitCost: parseFloat(purchase.total_cost) / parseFloat(purchase.qty_debe),
            referenceType: 'purchase',
            referenceId: purchase.id,
            userId: req.user.id,
            client,
          });
        }
      } else if (approval.entity_type === 'SALE') {
        const s = await client.query(`SELECT * FROM sales WHERE id = $1`, [approval.entity_id]);
        if (s.rows[0] && s.rows[0].status === 'PENDING') {
          await client.query(
            `UPDATE sales SET status = 'COMPLETED', approved_by = $1, approved_at = NOW()
             WHERE id = $2`,
            [req.user.id, approval.entity_id]
          );
          const sale = s.rows[0];
          await recordMovement({
            cropId: sale.crop_id,
            warehouseId: sale.warehouse_id,
            movementType: 'SALE',
            qtyDebe: -parseFloat(sale.qty_debe),
            unitCost: 0,
            referenceType: 'sale',
            referenceId: sale.id,
            userId: req.user.id,
            client,
          });
        }
      }
    } else {
      // REJECTED
      if (approval.entity_type === 'PURCHASE') {
        await client.query(
          `UPDATE purchases SET status = 'REJECTED' WHERE id = $1`,
          [approval.entity_id]
        );
      } else if (approval.entity_type === 'SALE') {
        await client.query(
          `UPDATE sales SET status = 'REJECTED' WHERE id = $1`,
          [approval.entity_id]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [req.user.id, req.user.username, `APPROVAL_${decision}`,
       approval.entity_type, approval.entity_id,
       JSON.stringify({ decision, reason })]
    );

    await client.query('COMMIT');
    res.json({ message: `Transaction ${decision}`, approvalId: approval.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to process approval' });
  } finally {
    client.release();
  }
});

module.exports = router;
