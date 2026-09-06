const db = require('../config/db');

/**
 * Check if amount requires approval based on role + settings.
 * Returns { needsApproval: boolean, requiredRole: string|null }
 */
async function checkApprovalNeeded(amount, userRole) {
  const { rows } = await db.query(
    `SELECT staff_limit, manager_limit FROM business_settings ORDER BY id LIMIT 1`
  );
  const staffLimit = parseFloat(rows[0]?.staff_limit) || 500000;
  const managerLimit = parseFloat(rows[0]?.manager_limit) || 3000000;

  if (userRole === 'OWNER') return { needsApproval: false, requiredRole: null };

  if (amount > managerLimit) {
    return { needsApproval: true, requiredRole: 'OWNER' };
  }
  if (amount > staffLimit) {
    if (userRole === 'MANAGER') return { needsApproval: false, requiredRole: null };
    return { needsApproval: true, requiredRole: 'MANAGER' };
  }
  // Within staff limit
  if (['SALES', 'MANAGER', 'ACCOUNTANT'].includes(userRole)) {
    return { needsApproval: false, requiredRole: null };
  }
  return { needsApproval: true, requiredRole: 'MANAGER' };
}

/**
 * Create pending approval record
 */
async function createApproval({ entityType, entityId, amount, requestedBy, requiredRole }) {
  const { rows } = await db.query(
    `INSERT INTO approvals (entity_type, entity_id, amount, requested_by, required_role, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     RETURNING id`,
    [entityType, entityId, amount, requestedBy, requiredRole]
  );
  return rows[0].id;
}

module.exports = { checkApprovalNeeded, createApproval };
