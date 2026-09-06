# LAMS v2.0 – MR_LUPEX99

Lupex Agribusiness Management System  
**Control + Intelligence** for Mahindi & Mpunga.

## Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: Next.js 14

## Setup
See `HATUA_ZA_KUFUATA.txt` (Swahili, Windows-friendly).

```bash
# Database
createdb lams_lupex
psql -d lams_lupex -f database/schema.sql

# Backend
cd backend && cp .env.example .env   # edit DB + JWT
npm install && node src/config/seed.js && npm run dev

# Frontend
cd frontend && cp .env.local.example .env.local
npm install && npm run dev
```

Open http://localhost:3000  
Login: **owner** / **Lupex2026!**

## Features

### Dashboards
- Owner (money, stock, KPI snapshot, alerts)
- KPI (growth, margin, collection days)
- Operations (today + approvals)

### Business
- Purchases (lots, approval, stock IN)
- Sales (DEBE/KILO/KOBOA, credit limit, stock OUT)
- Stock + physical count
- Lot traceability
- Debts + Reminders (overdue / due soon)
- Payments
- Expenses
- Farmers & Buyers

### Intelligence
- Cash Flow
- Business Position
- Period reports (week/month/year)
- Daily Close
- Deal Calculator
- Audit log
- Settings (approval limits, price lock)

## Default users (after seed)
| User | Password | Role |
|------|----------|------|
| owner | Lupex2026! | OWNER |
| manager | 1234 | MANAGER |
