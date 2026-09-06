-- =====================================================
-- LAMS v2.0 - MR_LUPEX99
-- Lupex Agribusiness Management System
-- PostgreSQL Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USERS, ROLES & PERMISSIONS
-- =====================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,  -- OWNER, MANAGER, SALES, ACCOUNTANT
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(80) UNIQUE NOT NULL,  -- e.g. purchase.create, sale.approve
    description     TEXT
);

CREATE TABLE role_permissions (
    role_id         INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(120) UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    phone           VARCHAR(30),
    role_id         INT NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BUSINESS SETTINGS
-- =====================================================

CREATE TABLE business_settings (
    id              SERIAL PRIMARY KEY,
    business_name   VARCHAR(150) NOT NULL DEFAULT 'MR_LUPEX99',
    phone           VARCHAR(30),
    location        VARCHAR(200),
    currency        VARCHAR(10) DEFAULT 'TZS',
    staff_limit     NUMERIC(15,2) DEFAULT 500000,      -- below this → staff can approve
    manager_limit   NUMERIC(15,2) DEFAULT 3000000,     -- above this → owner only
    max_loss_pct    NUMERIC(5,2) DEFAULT 5.00,
    debe_per_gunia  INT DEFAULT 6,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CROPS & PRICE LOCKS
-- =====================================================

CREATE TABLE crops (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,  -- Mahindi, Mpunga
    unit_base       VARCHAR(20) DEFAULT 'DEBE',    -- base unit
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_locks (
    id              SERIAL PRIMARY KEY,
    crop_id         INT NOT NULL REFERENCES crops(id),
    min_buy_price   NUMERIC(15,2) NOT NULL,
    max_buy_price   NUMERIC(15,2) NOT NULL,
    min_sell_price  NUMERIC(15,2) NOT NULL,
    max_sell_price  NUMERIC(15,2) NOT NULL,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (crop_id)
);

-- =====================================================
-- 4. WAREHOUSES
-- =====================================================

CREATE TABLE warehouses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,  -- WH-A, WH-B, MILL
    name            VARCHAR(100) NOT NULL,
    location        VARCHAR(200),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. FARMERS (SUPPLIERS) & BUYERS (CUSTOMERS)
-- =====================================================

CREATE TABLE farmers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(30),
    location        VARCHAR(200),
    notes           TEXT,
    reliability_score NUMERIC(5,2) DEFAULT 0,  -- 0-100
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE buyers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(30),
    location        VARCHAR(200),
    notes           TEXT,
    credit_limit    NUMERIC(15,2) DEFAULT 0,   -- 0 = no limit
    risk_level      VARCHAR(20) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. LOTS / BATCHES (Traceability)
-- =====================================================

CREATE TABLE lots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_code        VARCHAR(40) UNIQUE NOT NULL,  -- LOT-2026-00125
    crop_id         INT NOT NULL REFERENCES crops(id),
    farmer_id       UUID REFERENCES farmers(id),
    purchase_id     UUID,                         -- linked later
    warehouse_id    INT REFERENCES warehouses(id),
    initial_qty_debe NUMERIC(12,2) NOT NULL,
    current_qty_debe NUMERIC(12,2) NOT NULL,
    avg_cost_per_debe NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, SOLD
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. PURCHASES
-- =====================================================

CREATE TABLE purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_code   VARCHAR(30) UNIQUE NOT NULL,  -- PUR-2026-0001
    farmer_id       UUID NOT NULL REFERENCES farmers(id),
    crop_id         INT NOT NULL REFERENCES crops(id),
    warehouse_id    INT REFERENCES warehouses(id),
    lot_id          UUID REFERENCES lots(id),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    qty_debe        NUMERIC(12,2) NOT NULL,
    price_per_debe  NUMERIC(15,2) NOT NULL,
    crop_cost       NUMERIC(15,2) NOT NULL,
    transport_cost  NUMERIC(15,2) DEFAULT 0,
    loading_cost    NUMERIC(15,2) DEFAULT 0,
    other_cost      NUMERIC(15,2) DEFAULT 0,
    total_cost      NUMERIC(15,2) NOT NULL,
    paid_amount     NUMERIC(15,2) DEFAULT 0,
    balance         NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'COMPLETED', -- PENDING, APPROVED, COMPLETED, REJECTED, VOID
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. SALES
-- =====================================================

CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_code       VARCHAR(30) UNIQUE NOT NULL,  -- SAL-2026-0001
    buyer_id        UUID NOT NULL REFERENCES buyers(id),
    crop_id         INT NOT NULL REFERENCES crops(id),
    warehouse_id    INT REFERENCES warehouses(id),
    lot_id          UUID REFERENCES lots(id),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    mode            VARCHAR(20) NOT NULL,         -- DEBE, KILO, KOBOA
    qty_debe        NUMERIC(12,2) NOT NULL,
    total_kg        NUMERIC(12,2) DEFAULT 0,
    kg_per_gunia    NUMERIC(10,2) DEFAULT 0,
    kg_per_debe     NUMERIC(10,2) DEFAULT 0,
    price_per_unit  NUMERIC(15,2) NOT NULL,
    milling_cost_per_kg NUMERIC(15,2) DEFAULT 0,
    milling_total   NUMERIC(15,2) DEFAULT 0,
    gross_amount    NUMERIC(15,2) NOT NULL,
    total_amount    NUMERIC(15,2) NOT NULL,
    received_amount NUMERIC(15,2) DEFAULT 0,
    balance         NUMERIC(15,2) DEFAULT 0,
    due_date        DATE,
    status          VARCHAR(30) DEFAULT 'COMPLETED',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. STOCK MOVEMENTS (Ledger)
-- =====================================================

CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id         INT NOT NULL REFERENCES crops(id),
    warehouse_id    INT REFERENCES warehouses(id),
    lot_id          UUID REFERENCES lots(id),
    movement_type   VARCHAR(30) NOT NULL,  -- PURCHASE, SALE, TRANSFER, ADJUSTMENT, LOSS
    qty_debe        NUMERIC(12,2) NOT NULL, -- positive = in, negative = out
    unit_cost       NUMERIC(15,2) DEFAULT 0,
    reference_type  VARCHAR(30),           -- purchase, sale, physical_count
    reference_id    UUID,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Current stock view can be derived from movements, but we also keep snapshot
CREATE TABLE stock_balances (
    id              SERIAL PRIMARY KEY,
    crop_id         INT NOT NULL REFERENCES crops(id),
    warehouse_id    INT NOT NULL REFERENCES warehouses(id),
    qty_debe        NUMERIC(12,2) NOT NULL DEFAULT 0,
    avg_cost        NUMERIC(15,2) DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (crop_id, warehouse_id)
);

-- =====================================================
-- 10. PAYMENTS
-- =====================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_code    VARCHAR(30) UNIQUE NOT NULL,
    payment_type    VARCHAR(20) NOT NULL,  -- SUPPLIER (to farmer), CUSTOMER (from buyer)
    farmer_id       UUID REFERENCES farmers(id),
    buyer_id        UUID REFERENCES buyers(id),
    purchase_id     UUID REFERENCES purchases(id),
    sale_id         UUID REFERENCES sales(id),
    amount          NUMERIC(15,2) NOT NULL,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    method          VARCHAR(30) DEFAULT 'CASH', -- CASH, BANK, MOBILE
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. EXPENSES
-- =====================================================

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    category        VARCHAR(50) NOT NULL,  -- Usafiri, Maghala, Mizigo, Mafuta, Mengineyo
    description     TEXT,
    amount          NUMERIC(15,2) NOT NULL,
    status          VARCHAR(30) DEFAULT 'COMPLETED',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. APPROVALS
-- =====================================================

CREATE TABLE approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(30) NOT NULL,  -- PURCHASE, SALE, EXPENSE
    entity_id       UUID NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    requested_by    UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    required_role   VARCHAR(30),           -- MANAGER, OWNER
    decided_by      UUID REFERENCES users(id),
    decided_at      TIMESTAMPTZ,
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. PHYSICAL COUNTS & VARIANCES
-- =====================================================

CREATE TABLE physical_counts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id         INT NOT NULL REFERENCES crops(id),
    warehouse_id    INT REFERENCES warehouses(id),
    count_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    system_qty      NUMERIC(12,2) NOT NULL,
    physical_qty    NUMERIC(12,2) NOT NULL,
    variance        NUMERIC(12,2) NOT NULL,
    variance_pct    NUMERIC(8,2),
    reason          TEXT,
    adjusted        BOOLEAN DEFAULT FALSE,
    counted_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. AUDIT LOG
-- =====================================================

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    username        VARCHAR(50),
    action          VARCHAR(80) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    before_data     JSONB,
    after_data      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- =====================================================
-- 15. DAILY CLOSES
-- =====================================================

CREATE TABLE daily_closes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    close_date      DATE UNIQUE NOT NULL,
    total_purchases NUMERIC(15,2) DEFAULT 0,
    total_sales     NUMERIC(15,2) DEFAULT 0,
    cash_received   NUMERIC(15,2) DEFAULT 0,
    cash_paid       NUMERIC(15,2) DEFAULT 0,
    expenses        NUMERIC(15,2) DEFAULT 0,
    net_cash        NUMERIC(15,2) DEFAULT 0,
    stock_snapshot  JSONB,                 -- {Mahindi: 120, Mpunga: 80}
    notes           TEXT,
    closed_by       UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SEED DATA
-- =====================================================

INSERT INTO roles (name, description) VALUES
('OWNER',   'Full access - business owner'),
('MANAGER', 'Sales, purchases, reports, approvals (within limit)'),
('SALES',   'Create sales, view stock & customers'),
('ACCOUNTANT', 'Payments, expenses, reports');

INSERT INTO crops (name) VALUES ('Mahindi'), ('Mpunga');

INSERT INTO warehouses (code, name, location) VALUES
('WH-MAIN', 'Main Warehouse', 'Primary store'),
('WH-MILL', 'Milling Point', 'Processing area');

INSERT INTO business_settings (business_name, phone, location) VALUES
('MR_LUPEX99', '', '');

-- Default permissions (examples)
INSERT INTO permissions (code, description) VALUES
('purchase.create', 'Create purchase'),
('purchase.approve', 'Approve purchase'),
('sale.create', 'Create sale'),
('sale.approve', 'Approve sale'),
('stock.view', 'View stock'),
('stock.adjust', 'Adjust stock'),
('report.view', 'View reports'),
('settings.manage', 'Manage settings'),
('user.manage', 'Manage users'),
('approval.decide', 'Approve/Reject pending items');

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchases_farmer ON purchases(farmer_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_buyer ON sales(buyer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_stock_movements_crop ON stock_movements(crop_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_lots_code ON lots(lot_code);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
