const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/owner
 * Owner Dashboard - Money, Stock Value, Debts, Alerts
 */
router.get('/owner', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    // Revenue & COGS approximation (will be refined with proper stock costing)
    const salesRes = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue,
             COALESCE(SUM(balance), 0) AS receivables
      FROM sales WHERE status IN ('COMPLETED', 'APPROVED')
    `);

    const purchasesRes = await db.query(`
      SELECT COALESCE(SUM(total_cost), 0) AS total_purchases,
             COALESCE(SUM(balance), 0) AS payables
      FROM purchases WHERE status IN ('COMPLETED', 'APPROVED')
    `);

    const expensesRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses WHERE status = 'COMPLETED'
    `);

    const stockRes = await db.query(`
      SELECT c.name, COALESCE(SUM(sb.qty_debe), 0) AS qty_debe,
             COALESCE(AVG(sb.avg_cost), 0) AS avg_cost
      FROM crops c
      LEFT JOIN stock_balances sb ON sb.crop_id = c.id
      GROUP BY c.id, c.name
    `);

    let stockValue = 0;
    const stock = stockRes.rows.map((r) => {
      const value = parseFloat(r.qty_debe) * parseFloat(r.avg_cost);
      stockValue += value;
      return {
        crop: r.name,
        qtyDebe: parseFloat(r.qty_debe),
        avgCost: parseFloat(r.avg_cost),
        value,
      };
    });

    const revenue = parseFloat(salesRes.rows[0].revenue);
    const receivables = parseFloat(salesRes.rows[0].receivables);
    const payables = parseFloat(purchasesRes.rows[0].payables);
    const expenses = parseFloat(expensesRes.rows[0].total_expenses);
    // Simple net profit approximation (will improve with proper COGS)
    const netProfit = revenue - parseFloat(purchasesRes.rows[0].total_purchases) - expenses;

    // Pending approvals count
    const pendingRes = await db.query(
      `SELECT COUNT(*) AS cnt FROM approvals WHERE status = 'PENDING'`
    );

    res.json({
      business: process.env.BUSINESS_NAME || 'MR_LUPEX99',
      money: {
        revenue,
        expenses,
        netProfit,
        receivables,
        payables,
      },
      stock: {
        items: stock,
        totalValue: stockValue,
      },
      alerts: {
        pendingApprovals: parseInt(pendingRes.rows[0].cnt, 10),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load owner dashboard' });
  }
});

/**
 * GET /api/dashboard/operations
 * Operations Dashboard - today's activity
 */
router.get('/operations', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const purchasesToday = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_cost), 0) AS total
       FROM purchases WHERE date = $1 AND status != 'REJECTED'`,
      [today]
    );

    const salesToday = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total
       FROM sales WHERE date = $1 AND status != 'REJECTED'`,
      [today]
    );

    res.json({
      date: today,
      purchases: {
        count: parseInt(purchasesToday.rows[0].cnt, 10),
        total: parseFloat(purchasesToday.rows[0].total),
      },
      sales: {
        count: parseInt(salesToday.rows[0].cnt, 10),
        total: parseFloat(salesToday.rows[0].total),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load operations dashboard' });
  }
});

module.exports = router;
