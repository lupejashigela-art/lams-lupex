const db = require('../config/db');

/**
 * Record a stock movement and update stock_balances
 * qty_debe: positive = IN, negative = OUT
 */
async function recordMovement({
  cropId,
  warehouseId,
  lotId = null,
  movementType,
  qtyDebe,
  unitCost = 0,
  referenceType = null,
  referenceId = null,
  notes = null,
  userId = null,
  client = null,
}) {
  const q = client ? client.query.bind(client) : db.query;

  await q(
    `INSERT INTO stock_movements
     (crop_id, warehouse_id, lot_id, movement_type, qty_debe, unit_cost,
      reference_type, reference_id, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [cropId, warehouseId, lotId, movementType, qtyDebe, unitCost,
     referenceType, referenceId, notes, userId]
  );

  // Upsert balance
  const bal = await q(
    `SELECT id, qty_debe, avg_cost FROM stock_balances
     WHERE crop_id = $1 AND warehouse_id = $2`,
    [cropId, warehouseId]
  );

  if (bal.rows[0]) {
    const currentQty = parseFloat(bal.rows[0].qty_debe);
    const currentAvg = parseFloat(bal.rows[0].avg_cost) || 0;
    const newQty = currentQty + parseFloat(qtyDebe);

    let newAvg = currentAvg;
    // Weighted average only when stock comes IN
    if (parseFloat(qtyDebe) > 0 && unitCost > 0) {
      const totalValue = currentQty * currentAvg + parseFloat(qtyDebe) * unitCost;
      newAvg = newQty > 0 ? totalValue / newQty : 0;
    }

    await q(
      `UPDATE stock_balances
       SET qty_debe = $1, avg_cost = $2, updated_at = NOW()
       WHERE id = $3`,
      [Math.max(0, newQty), newAvg, bal.rows[0].id]
    );
  } else {
    // First movement for this crop+warehouse
    const initialQty = Math.max(0, parseFloat(qtyDebe));
    await q(
      `INSERT INTO stock_balances (crop_id, warehouse_id, qty_debe, avg_cost)
       VALUES ($1, $2, $3, $4)`,
      [cropId, warehouseId, initialQty, unitCost || 0]
    );
  }
}

/**
 * Get available stock for a crop (all warehouses or one)
 */
async function getAvailableStock(cropId, warehouseId = null) {
  let sql = `
    SELECT COALESCE(SUM(qty_debe), 0) AS qty
    FROM stock_balances WHERE crop_id = $1`;
  const params = [cropId];
  if (warehouseId) {
    sql += ` AND warehouse_id = $2`;
    params.push(warehouseId);
  }
  const { rows } = await db.query(sql, params);
  return parseFloat(rows[0].qty) || 0;
}

/**
 * Generate next code: PUR-2026-0001, SAL-2026-0001, LOT-2026-0001
 */
async function nextCode(prefix, table, column) {
  const year = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT ${column} FROM ${table}
     WHERE ${column} LIKE $1
     ORDER BY ${column} DESC LIMIT 1`,
    [`${prefix}-${year}-%`]
  );
  let seq = 1;
  if (rows[0]) {
    const parts = rows[0][column].split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = {
  recordMovement,
  getAvailableStock,
  nextCode,
};
