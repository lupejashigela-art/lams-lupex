# LAMS v2.0 – Setup Guide (MR_LUPEX99)

## Requirements
- Node.js 18+
- PostgreSQL 14+

## 1. Database

```bash
# Create user and database (example)
sudo -u postgres createuser lams -P
sudo -u postgres createdb lams_lupex -O lams

# Run schema
psql -U lams -d lams_lupex -f database/schema.sql
```

## 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lams_lupex
DB_USER=lams
DB_PASSWORD=your_password
JWT_SECRET=put_a_long_random_string_here
BUSINESS_NAME=MR_LUPEX99
PORT=4000
```

```bash
npm install
node src/config/seed.js    # creates OWNER user
npm run dev
```

API base: `http://localhost:4000`

### Default login
- Username: `owner`
- Password: `Lupex2026!`
**Change after first login.**

## 3. API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/dashboard/owner | Owner dashboard |
| GET | /api/dashboard/operations | Ops dashboard |
| GET/POST | /api/farmers | List / Create farmers |
| GET/POST | /api/buyers | List / Create buyers |
| GET/POST | /api/purchases | List / Create purchases |
| GET/POST | /api/sales | List / Create sales |
| GET | /api/approvals/pending | Pending approvals |
| POST | /api/approvals/:id/decide | Approve / Reject |

## 4. Example: Create Purchase

```bash
curl -X POST http://localhost:4000/api/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "uuid-of-farmer",
    "cropId": 1,
    "qtyDebe": 60,
    "pricePerDebe": 20000,
    "transportCost": 50000,
    "loadingCost": 10000,
    "paidAmount": 0
  }'
```

## Next
- Frontend (Next.js Owner + Operations dashboards)
- Payments API
- Stock view API
- Physical count API

## Additional Endpoints (added)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/payments | List / Record payments |
| GET | /api/stock | Stock balances + valuation |
| POST | /api/stock/physical-count | Physical count + variance |
| GET | /api/stock/crops | List crops |
| GET | /api/stock/warehouses | List warehouses |

## Frontend pages

| Path | Page |
|------|------|
| /login | Login |
| /dashboard | Owner Dashboard |
| /operations | Operations + Approvals |
| /purchases | List + Create purchases |
| /sales | List + Create sales |
| /stock | Stock view + Physical count |
