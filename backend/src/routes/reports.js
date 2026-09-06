const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/reports/cash-flow
 */
router.get('/cash-flow', authenticate, async (req, res) => {
  try {
    const sales = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue,
             COALESCE(SUM(received_amount), 0) AS cash_received,
             COALESCE(SUM(balance), 0) AS receivables
      FROM sales WHERE status IN ('COMPLETED', 'APPROVED')
    `);
    const purchases = await db.query(`
      SELECT COALESCE(SUM(total_cost), 0) AS total_purchases,
             COALESCE(SUM(paid_amount), 0) AS cash_paid,
             COALESCE(SUM(balance), 0) AS payables
      FROM purchases WHERE status IN ('COMPLETED', 'APPROVED')
    `);
    const expenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses WHERE status = 'COMPLETED'
    `);
    const paymentsExtra = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_type = 'CUSTOMER' THEN amount ELSE 0 END), 0) AS in_pay,
        COALESCE(SUM(CASE WHEN payment_type = 'SUPPLIER' THEN amount ELSE 0 END), 0) AS out_pay
      FROM payments
    `);

    const revenue = parseFloat(sales.rows[0].revenue);
    const cashReceived = parseFloat(sales.rows[0].cash_received);
    const receivables = parseFloat(sales.rows[0].receivables);
    const totalPurchases = parseFloat(purchases.rows[0].total_purchases);
    const cashPaid = parseFloat(purchases.rows[0].cash_paid);
    const payables = parseFloat(purchases.rows[0].payables);
    const exp = parseFloat(expenses.rows[0].total);
    const netCash = cashReceived - cashPaid - exp;

    res.json({
      revenue,
      cashReceived,
      receivables,
      totalPurchases,
      cashPaid,
      payables,
      expenses: exp,
      netCash,
      note: 'Profit ≠ Cash. Receivables bado hazijalipwa.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load cash flow' });
  }
});

/**
 * GET /api/reports/business-position
 */
router.get('/business-position', authenticate, async (req, res) => {
  try {
    const sales = await db.query(`
      SELECT COALESCE(SUM(received_amount), 0) AS received,
             COALESCE(SUM(balance), 0) AS receivables
      FROM sales WHERE status IN ('COMPLETED', 'APPROVED')
    `);
    const purchases = await db.query(`
      SELECT COALESCE(SUM(paid_amount), 0) AS paid,
             COALESCE(SUM(balance), 0) AS payables
      FROM purchases WHERE status IN ('COMPLETED', 'APPROVED')
    `);
    const expenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE status = 'COMPLETED'
    `);
    const stock = await db.query(`
      SELECT COALESCE(SUM(qty_debe * avg_cost), 0) AS value FROM stock_balances
    `);

    const cashApprox = Math.max(
      0,
      parseFloat(sales.rows[0].received) -
        parseFloat(purchases.rows[0].paid) -
        parseFloat(expenses.rows[0].total)
    );
    const stockValue = parseFloat(stock.rows[0].value);
    const receivables = parseFloat(sales.rows[0].receivables);
    const payables = parseFloat(purchases.rows[0].payables);
    const totalAssets = cashApprox + stockValue + receivables;
    const netValue = totalAssets - payables;

    res.json({
      assets: {
        cashApprox,
        stockValue,
        receivables,
        total: totalAssets,
      },
      liabilities: {
        payables,
        total: payables,
      },
      netBusinessValue: netValue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load business position' });
  }
});

/**
 * POST /api/reports/daily-close
 * Saves today's summary
 */
router.post('/daily-close', authenticate, authorize('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const purchases = await db.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(total_cost), 0) AS total
      FROM purchases WHERE date = $1 AND status != 'REJECTED'`, [today]);
    const sales = await db.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total,
             COALESCE(SUM(received_amount), 0) AS received
      FROM sales WHERE date = $1 AND status != 'REJECTED'`, [today]);
    const paid = await db.query(`
      SELECT COALESCE(SUM(paid_amount), 0) AS total
      FROM purchases WHERE date = $1`, [today]);
    const exp = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date = $1`, [today]);
    const stock = await db.query(`
      SELECT c.name, COALESCE(SUM(sb.qty_debe), 0) AS qty
      FROM crops c
      LEFT JOIN stock_balances sb ON sb.crop_id = c.id
      GROUP BY c.name
    `);

    const stockSnapshot = {};
    stock.rows.forEach((r) => { stockSnapshot[r.name] = parseFloat(r.qty); });

    const cashReceived = parseFloat(sales.rows[0].received);
    const cashPaid = parseFloat(paid.rows[0].total);
    const expenses = parseFloat(exp.rows[0].total);
    const netCash = cashReceived - cashPaid - expenses;

    const { rows } = await db.query(`
      INSERT INTO daily_closes (
        close_date, total_purchases, total_sales, cash_received, cash_paid,
        expenses, net_cash, stock_snapshot, closed_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (close_date) DO UPDATE SET
        total_purchases = EXCLUDED.total_purchases,
        total_sales = EXCLUDED.total_sales,
        cash_received = EXCLUDED.cash_received,
        cash_paid = EXCLUDED.cash_paid,
        expenses = EXCLUDED.expenses,
        net_cash = EXCLUDED.net_cash,
        stock_snapshot = EXCLUDED.stock_snapshot,
        closed_by = EXCLUDED.closed_by
      RETURNING *`,
      [
        today,
        parseFloat(purchases.rows[0].total),
        parseFloat(sales.rows[0].total),
        cashReceived,
        cashPaid,
        expenses,
        netCash,
        JSON.stringify(stockSnapshot),
        req.user.id,
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, after_data)
       VALUES ($1, $2, 'DAILY_CLOSE', $3)`,
      [req.user.id, req.user.username, JSON.stringify(rows[0])]
    );

    res.json({
      message: 'Daily close saved',
      summary: {
        date: today,
        purchasesCount: parseInt(purchases.rows[0].cnt, 10),
        purchasesTotal: parseFloat(purchases.rows[0].total),
        salesCount: parseInt(sales.rows[0].cnt, 10),
        salesTotal: parseFloat(sales.rows[0].total),
        cashReceived,
        cashPaid,
        expenses,
        netCash,
        stock: stockSnapshot,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save daily close' });
  }
});

/**
 * GET /api/reports/daily-close/latest
 */
router.get('/daily-close/latest', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM daily_closes ORDER BY close_date DESC LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load daily closes' });
  }
});



/**
 * GET /api/reports/period?type=week|month|year
 */
router.get('/period', authenticate, async (req, res) => {
  try {
    const type = req.query.type || 'month';
    let dateFilterPurchases = '';
    let dateFilterSales = '';
    let dateFilterExp = '';

    if (type === 'week') {
      dateFilterPurchases = `AND date >= CURRENT_DATE - INTERVAL '7 days'`;
      dateFilterSales = `AND date >= CURRENT_DATE - INTERVAL '7 days'`;
      dateFilterExp = `AND expense_date >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (type === 'year') {
      dateFilterPurchases = `AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
      dateFilterSales = `AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
      dateFilterExp = `AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    } else {
      // month
      dateFilterPurchases = `AND date >= date_trunc('month', CURRENT_DATE)`;
      dateFilterSales = `AND date >= date_trunc('month', CURRENT_DATE)`;
      dateFilterExp = `AND expense_date >= date_trunc('month', CURRENT_DATE)`;
    }

    const purchases = await db.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(total_cost), 0) AS total
      FROM purchases WHERE status IN ('COMPLETED','APPROVED') ${dateFilterPurchases}
    `);
    const sales = await db.query(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total
      FROM sales WHERE status IN ('COMPLETED','APPROVED') ${dateFilterSales}
    `);
    const expenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses WHERE status = 'COMPLETED' ${dateFilterExp}
    `);
    const byCrop = await db.query(`
      SELECT c.name,
        COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN s.total_amount ELSE 0 END), 0) AS sales,
        COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN p.total_cost ELSE 0 END), 0) AS purchases
      FROM crops c
      LEFT JOIN sales s ON s.crop_id = c.id AND s.status IN ('COMPLETED','APPROVED')
      LEFT JOIN purchases p ON p.crop_id = c.id AND p.status IN ('COMPLETED','APPROVED')
      GROUP BY c.name
    `);

    const totSales = parseFloat(sales.rows[0].total);
    const totPurchases = parseFloat(purchases.rows[0].total);
    const totExp = parseFloat(expenses.rows[0].total);

    res.json({
      period: type,
      purchases: { count: parseInt(purchases.rows[0].cnt, 10), total: totPurchases },
      sales: { count: parseInt(sales.rows[0].cnt, 10), total: totSales },
      expenses: totExp,
      profitApprox: totSales - totPurchases - totExp,
      byCrop: byCrop.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load period report' });
  }
});




/**
 * GET /api/reports/upcoming-payments
 * Buyer debts due within 7 days or overdue
 */
router.get('/upcoming-payments', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.sale_code, s.date, s.balance, s.due_date,
             b.name AS buyer_name, b.phone,
             c.name AS crop_name,
             CASE
               WHEN s.due_date IS NULL THEN 'NO_DUE_DATE'
               WHEN s.due_date < CURRENT_DATE THEN 'OVERDUE'
               WHEN s.due_date = CURRENT_DATE THEN 'TODAY'
               WHEN s.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'SOON'
               WHEN s.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'THIS_WEEK'
               ELSE 'LATER'
             END AS urgency,
             CASE
               WHEN s.due_date IS NULL THEN NULL
               ELSE (s.due_date - CURRENT_DATE)
             END AS days_until
      FROM sales s
      JOIN buyers b ON b.id = s.buyer_id
      JOIN crops c ON c.id = s.crop_id
      WHERE s.balance > 0.5
        AND s.status IN ('COMPLETED', 'APPROVED')
        AND (s.due_date IS NULL OR s.due_date <= CURRENT_DATE + INTERVAL '7 days')
      ORDER BY
        CASE
          WHEN s.due_date IS NULL THEN 3
          WHEN s.due_date < CURRENT_DATE THEN 0
          WHEN s.due_date = CURRENT_DATE THEN 1
          ELSE 2
        END,
        s.due_date NULLS LAST
    `);

    const total = rows.reduce((s, r) => s + parseFloat(r.balance), 0);
    const overdue = rows.filter((r) => r.urgency === 'OVERDUE');

    res.json({
      total,
      count: rows.length,
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((s, r) => s + parseFloat(r.balance), 0),
      items: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load upcoming payments' });
  }
});

/**
 * GET /api/reports/kpi
 * Simple owner KPIs
 */
router.get('/kpi', authenticate, async (req, res) => {
  try {
    // This month vs last month sales
    const thisMonth = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS cnt
      FROM sales
      WHERE status IN ('COMPLETED','APPROVED')
        AND date >= date_trunc('month', CURRENT_DATE)
    `);
    const lastMonth = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM sales
      WHERE status IN ('COMPLETED','APPROVED')
        AND date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        AND date < date_trunc('month', CURRENT_DATE)
    `);
    const purchases = await db.query(`
      SELECT COALESCE(SUM(total_cost), 0) AS total
      FROM purchases
      WHERE status IN ('COMPLETED','APPROVED')
        AND date >= date_trunc('month', CURRENT_DATE)
    `);
    const expenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE status = 'COMPLETED'
        AND expense_date >= date_trunc('month', CURRENT_DATE)
    `);
    const receivables = await db.query(`
      SELECT COALESCE(SUM(balance), 0) AS total,
             COALESCE(AVG(CURRENT_DATE - date), 0) AS avg_days
      FROM sales
      WHERE balance > 0.5 AND status IN ('COMPLETED','APPROVED')
    `);
    const payables = await db.query(`
      SELECT COALESCE(SUM(balance), 0) AS total
      FROM purchases
      WHERE balance > 0.5 AND status IN ('COMPLETED','APPROVED')
    `);
    const stock = await db.query(`
      SELECT COALESCE(SUM(qty_debe * avg_cost), 0) AS value,
             COALESCE(SUM(qty_debe), 0) AS qty
      FROM stock_balances
    `);

    const salesThis = parseFloat(thisMonth.rows[0].total);
    const salesLast = parseFloat(lastMonth.rows[0].total);
    const growth = salesLast > 0 ? ((salesThis - salesLast) / salesLast) * 100 : null;
    const purch = parseFloat(purchases.rows[0].total);
    const exp = parseFloat(expenses.rows[0].total);
    const grossMargin = salesThis > 0 ? ((salesThis - purch) / salesThis) * 100 : null;
    const netProfit = salesThis - purch - exp;

    res.json({
      salesThisMonth: salesThis,
      salesLastMonth: salesLast,
      salesGrowthPct: growth,
      purchasesThisMonth: purch,
      expensesThisMonth: exp,
      netProfitThisMonth: netProfit,
      grossMarginPct: grossMargin,
      receivables: parseFloat(receivables.rows[0].total),
      avgCollectionDays: Math.round(parseFloat(receivables.rows[0].avg_days) || 0),
      payables: parseFloat(payables.rows[0].total),
      stockValue: parseFloat(stock.rows[0].value),
      stockQtyDebe: parseFloat(stock.rows[0].qty),
      salesCountThisMonth: parseInt(thisMonth.rows[0].cnt, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load KPIs' });
  }
});


module.exports = router;
