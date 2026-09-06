# LAMS v2.0 – MR_LUPEX99
## Architecture & Project Overview

**Business:** MR_LUPEX99  
**System:** Lupex Agribusiness Management System  
**Version:** 2.0  
**Stack:** Node.js + Express + PostgreSQL + Next.js

---

## Goals

LAMS is **not** a data-entry tool.  
It is a **control + intelligence** system for the owner.

Owner (anywhere in the world) should open the dashboard and within 1 minute know:

- How much money the business has
- How much stock (and its value)
- Who owes us / whom we owe
- Profit / loss
- What went wrong
- Who did what
- What decision is needed now

---

## Architecture

```
                    OWNER / MANAGER / STAFF
                              │
                    ┌─────────┴─────────┐
                    │   NEXT.JS FRONTEND │
                    │  (Owner Dashboard  │
                    │   Ops Dashboard)   │
                    └─────────┬─────────┘
                              │ REST API (JWT)
                    ┌─────────┴─────────┐
                    │  NODE.JS + EXPRESS │
                    │  Control Engine    │
                    │  - Auth & Roles    │
                    │  - Approvals       │
                    │  - Audit           │
                    │  - Business Logic  │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │   POSTGRESQL       │
                    │   - Users/Roles    │
                    │   - Purchases/Sales│
                    │   - Lots/Stock     │
                    │   - Payments       │
                    │   - Audit Logs     │
                    └───────────────────┘
```

---

## Roles

| Role | Access |
|------|--------|
| **OWNER** | Everything + Settings + Approvals (all amounts) |
| **MANAGER** | Purchases, Sales, Reports, Approvals (within limit) |
| **SALES** | Create sales, view stock & buyers |
| **ACCOUNTANT** | Payments, Expenses, Reports |

Approval limits (configurable):
- ≤ Staff limit → SALES can complete
- ≤ Manager limit → MANAGER can approve
- Above → OWNER only

---

## Core Modules (Phase 1)

1. **Auth** – Login, JWT, roles
2. **Farmers & Buyers**
3. **Purchases** (with modes, costs, approval)
4. **Sales** (DEBE / KILO / KOBOA, credit limit, due date)
5. **Stock** (movements ledger + balances + warehouses)
6. **Payments & Debts**
7. **Approvals**
8. **Audit Log**
9. **Owner Dashboard** + **Operations Dashboard**

---

## Phase Roadmap

### Phase 1 – Protect the Money (Current)
- Schema + Auth + Users
- Farmers / Buyers
- Purchases / Sales
- Payments
- Basic COGS + Dashboards
- Approval workflow
- Audit trail

### Phase 2 – Protect the Stock
- Multi-warehouse
- Lot / Batch tracking (full traceability)
- Physical count + variance
- Stock valuation (weighted average)
- Price Lock

### Phase 3 – Control People & Operations
- Deal Calculator
- Daily Close
- Staff activity
- Operations Dashboard polish

### Phase 4 – Intelligence
- KPIs
- Cash Flow & Business Position
- Supplier / Buyer scoring
- Alerts
- Period comparison
- Basic “Why?” analysis

---

## Folder Structure

```
lams-v2/
├── database/
│   └── schema.sql
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── config/db.js
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   └── dashboard.js
│       └── server.js
├── frontend/          (Next.js – next)
└── docs/
    └── ARCHITECTURE.md
```

---

## Next Immediate Steps

1. Install PostgreSQL and create database `lams_lupex`
2. Run `schema.sql`
3. Create first OWNER user (seed)
4. `npm install` in backend and start API
5. Build Next.js frontend (Owner + Ops dashboards)
6. Implement Purchases & Sales APIs

---

**Business name in system:** MR_LUPEX99  
**Default currency:** TZS
