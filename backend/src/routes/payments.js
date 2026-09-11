const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { nextCode } = require('../services/stockService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*,
             f.name AS farmer_name,
             b.name AS buyer_name,
             u.username AS created_by_name
      FROM payments p
      LEFT JOIN farmers f ON f.id = p.farmer_id
      LEFT JOIN buyers b ON b.id = p.buyer_id
      LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    let {
      paymentType,
      farmerId,
      buyerId,
      purchaseId,
      saleId,
      amount,
      method = 'CASH',
      notes,
    } = req.body;

    if (!paymentType || !amount || amount <= 0) {
      return res.status(400).json({ error: 'paymentType and positive amount required' });
    }
    if (paymentType === 'SUPPLIER' && !farmerId && !purchaseId) {
      return res.status(400).json({ error: 'farmerId or purchaseId required for SUPPLIER payment' });
    }
    if (paymentType === 'CUSTOMER' && !buyerId && !saleId) {
      return res.status(400).json({ error: 'buyerId or saleId required for CUSTOMER payment' });
    }

    const amt = parseFloat(amount);
    const code = await nextCode('PAY', 'payments', 'payment_code');

    await client.query('BEGIN');

    // Chukua farmer_id kutoka purchase
    if (paymentType === 'SUPPLIER' && purchaseId) {
      const p = await client.query(
        `SELECT balance, paid_amount, farmer_id FROM purchases WHERE id = $1`,
        [purchaseId]
      );
      if (!p.rows[0]) throw new Error('Purchase not found');
      if (!farmerId) farmerId = p.rows[0].farmer_id;

      const bal = parseFloat(p.rows[0].balance);
      const pay = Math.min(amt, bal);
      await client.query(
        `UPDATE purchases SET paid_amount = paid_amount + $1, balance = balance - $1,
          status = CASE WHEN balance - $1 <= 0.5 THEN 'COMPLETED' ELSE status END,
          updated_at = NOW()
         WHERE id = $2`,
        [pay, purchaseId]
      );
    }

    // Chukua buyer_id kutoka sale
    if (paymentType === 'CUSTOMER' && saleId) {
      const s = await client.query(
        `SELECT balance, received_amount, buyer_id FROM sales WHERE id = $1`,
        [saleId]
      );
      if (!s.rows[0]) throw new Error('Sale not found');
      if (!buyerId) buyerId = s.rows[0].buyer_id;

      const bal = parseFloat(s.rows[0].balance);
      const rec = Math.min(amt, bal);
      await client.query(
        `UPDATE sales SET received_amount = received_amount + $1, balance = balance - $1,
          status = CASE WHEN balance - $1 <= 0.5 THEN 'COMPLETED' ELSE status END,
          updated_at = NOW()
         WHERE id = $2`,
        [rec, saleId]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO payments (
        payment_code, payment_type, farmer_id, buyer_id, purchase_id, sale_id,
        amount, payment_date, method, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9,$10)
      RETURNING *`,
      [
        code,
        paymentType,
        farmerId || null,
        buyerId || null,
        purchaseId || null,
        saleId || null,
        amt,
        method,
        notes || null,
        req.user.id,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_data)
       VALUES ($1,$2,'PAYMENT_CREATE','payment',$3,$4)`,
      [req.user.id, req.user.username, rows[0].id, JSON.stringify(rows[0])]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to record payment' });
  } finally {
    client.release();
  }
});

module.exports = router;
