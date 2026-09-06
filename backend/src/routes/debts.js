const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/debts
 * Supplier debts (we owe farmers) + Customer debts (buyers owe us)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const supplierDebts = await db.query(`
      SELECT p.id, p.purchase_code, p.date, p.total_cost, p.paid_amount, p.balance,
             f.name AS person_name, f.phone, c.name AS crop_name
      FROM purchases p
      JOIN farmers f ON f.id = p.farmer_id
      JOIN crops c ON c.id = p.crop_id
      WHERE p.balance > 0.5 AND p.status IN ('COMPLETED', 'APPROVED')
      ORDER BY p.date
    `);

    const customerDebts = await db.query(`
      SELECT s.id, s.sale_code, s.date, s.total_amount, s.received_amount, s.balance,
             s.due_date, b.name AS person_name, b.phone, c.name AS crop_name
      FROM sales s
      JOIN buyers b ON b.id = s.buyer_id
      JOIN crops c ON c.id = s.crop_id
      WHERE s.balance > 0.5 AND s.status IN ('COMPLETED', 'APPROVED')
      ORDER BY s.due_date NULLS LAST, s.date
    `);

    const sumSup = supplierDebts.rows.reduce((a, r) => a + parseFloat(r.balance), 0);
    const sumCust = customerDebts.rows.reduce((a, r) => a + parseFloat(r.balance), 0);

    // Overdue customers
    const today = new Date().toISOString().slice(0, 10);
    const overdue = customerDebts.rows.filter(
      (r) => r.due_date && r.due_date < today
    );

    res.json({
      weOweFarmers: {
        total: sumSup,
        count: supplierDebts.rows.length,
        items: supplierDebts.rows,
      },
      buyersOweUs: {
        total: sumCust,
        count: customerDebts.rows.length,
        items: customerDebts.rows,
        overdueCount: overdue.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load debts' });
  }
});

module.exports = router;
