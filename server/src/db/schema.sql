-- ============================================================
-- Urban Furniture — Accounting System
-- PostgreSQL schema
-- ============================================================
-- Run order: this file is idempotent-ish (DROP ... IF EXISTS)
-- for local dev re-seeding. Do NOT run DROP block in production.
-- ============================================================

BEGIN;

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for future UUID/hash needs

-- ---------- Drop (dev only) ----------
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS budget_lines CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS customer_invoice_lines CASCADE;
DROP TABLE IF EXISTS customer_invoices CASCADE;
DROP TABLE IF EXISTS sales_order_lines CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS vendor_bill_lines CASCADE;
DROP TABLE IF EXISTS vendor_bills CASCADE;
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS journals CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS analytic_accounts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- ---------- Trigger function: updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE contacts (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('CUSTOMER','VENDOR','BOTH')),
  email           VARCHAR(150) UNIQUE,
  mobile          VARCHAR(20),
  street          VARCHAR(200),
  city            VARCHAR(100),
  state           VARCHAR(100),
  pincode         VARCHAR(15),
  profile_image   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);

CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  login_id        VARCHAR(100) NOT NULL UNIQUE,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN','ACCOUNTANT','CONTACT')),
  contact_id      BIGINT UNIQUE REFERENCES contacts(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_contact_role_pairing CHECK (
    (role = 'CONTACT' AND contact_id IS NOT NULL) OR
    (role IN ('ADMIN','ACCOUNTANT'))
  )
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE product_categories (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_product_categories_updated BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE products (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  category_id     BIGINT REFERENCES product_categories(id),
  product_type    VARCHAR(10) NOT NULL CHECK (product_type IN ('GOODS','SERVICE','COMBO')),
  sales_price     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
  cost_price      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  image           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE analytic_accounts (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL UNIQUE,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_analytic_accounts_updated BEFORE UPDATE ON analytic_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE chart_of_accounts (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL UNIQUE,
  account_type    VARCHAR(15) NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','CAPITAL','INCOME','EXPENSE')),
  account_subtype VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_coa_updated BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- ============================================================
-- ACCOUNTING CORE
-- ============================================================

CREATE TABLE journals (
  id                  BIGSERIAL PRIMARY KEY,
  name                VARCHAR(150) NOT NULL UNIQUE,
  journal_type        VARCHAR(10) NOT NULL CHECK (journal_type IN ('SALES','PURCHASE','BANK','CASH','GENERAL')),
  default_account_id  BIGINT REFERENCES chart_of_accounts(id),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_journals_updated BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE journal_entries (
  id              BIGSERIAL PRIMARY KEY,
  entry_number    VARCHAR(30) UNIQUE, -- backend-generated, e.g. JE00001
  journal_id      BIGINT NOT NULL REFERENCES journals(id),
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  reference       VARCHAR(150),
  partner_id      BIGINT REFERENCES contacts(id),
  status          VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_je_updated BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_je_journal ON journal_entries(journal_id);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_date ON journal_entries(entry_date);

CREATE TABLE journal_entry_lines (
  id                      BIGSERIAL PRIMARY KEY,
  journal_entry_id        BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id              BIGINT NOT NULL REFERENCES chart_of_accounts(id),
  partner_id              BIGINT REFERENCES contacts(id),
  analytic_account_id     BIGINT REFERENCES analytic_accounts(id),
  debit                   NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit                  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CONSTRAINT chk_debit_xor_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);
CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE purchase_orders (
  id              BIGSERIAL PRIMARY KEY,
  po_number       VARCHAR(30) UNIQUE, -- backend-generated, e.g. PO00001
  vendor_id       BIGINT NOT NULL REFERENCES contacts(id),
  po_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_terms   VARCHAR(100),
  status          VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','BILLED','CANCELLED')),
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

CREATE TABLE purchase_order_lines (
  id                    BIGSERIAL PRIMARY KEY,
  purchase_order_id     BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id            BIGINT NOT NULL REFERENCES products(id),
  analytic_account_id   BIGINT REFERENCES analytic_accounts(id),
  quantity              NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX idx_pol_po ON purchase_order_lines(purchase_order_id);

CREATE TABLE vendor_bills (
  id                  BIGSERIAL PRIMARY KEY,
  bill_number         VARCHAR(30) UNIQUE, -- backend-generated, e.g. B00001
  purchase_order_id   BIGINT REFERENCES purchase_orders(id),
  vendor_id           BIGINT NOT NULL REFERENCES contacts(id),
  bill_reference      VARCHAR(150),
  bill_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  status              VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','PAID','PARTIALLY_PAID','CANCELLED')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_due          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_bill_paid_le_total CHECK (amount_paid <= total_amount),
  CONSTRAINT chk_bill_due_after_bill CHECK (due_date IS NULL OR due_date >= bill_date)
);
CREATE TRIGGER trg_vb_updated BEFORE UPDATE ON vendor_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_vb_vendor ON vendor_bills(vendor_id);
CREATE INDEX idx_vb_status ON vendor_bills(status);
CREATE INDEX idx_vb_po ON vendor_bills(purchase_order_id);

CREATE TABLE vendor_bill_lines (
  id                    BIGSERIAL PRIMARY KEY,
  vendor_bill_id        BIGINT NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  product_id            BIGINT NOT NULL REFERENCES products(id),
  account_id            BIGINT REFERENCES chart_of_accounts(id),
  analytic_account_id   BIGINT REFERENCES analytic_accounts(id),
  quantity              NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX idx_vbl_bill ON vendor_bill_lines(vendor_bill_id);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales_orders (
  id              BIGSERIAL PRIMARY KEY,
  so_number       VARCHAR(30) UNIQUE, -- backend-generated, e.g. SO00001
  customer_id     BIGINT NOT NULL REFERENCES contacts(id),
  so_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_terms   VARCHAR(100),
  status          VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','INVOICED','CANCELLED')),
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);

CREATE TABLE sales_order_lines (
  id                    BIGSERIAL PRIMARY KEY,
  sales_order_id        BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id            BIGINT NOT NULL REFERENCES products(id),
  analytic_account_id   BIGINT REFERENCES analytic_accounts(id),
  quantity              NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX idx_sol_so ON sales_order_lines(sales_order_id);

CREATE TABLE customer_invoices (
  id                  BIGSERIAL PRIMARY KEY,
  invoice_number      VARCHAR(30) UNIQUE, -- backend-generated, e.g. INV00001
  sales_order_id      BIGINT REFERENCES sales_orders(id),
  customer_id         BIGINT NOT NULL REFERENCES contacts(id),
  invoice_reference   VARCHAR(150),
  invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  status              VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','PAID','PARTIALLY_PAID','CANCELLED')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_due          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_inv_paid_le_total CHECK (amount_paid <= total_amount),
  CONSTRAINT chk_inv_due_after_invoice CHECK (due_date IS NULL OR due_date >= invoice_date)
);
CREATE TRIGGER trg_ci_updated BEFORE UPDATE ON customer_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_ci_customer ON customer_invoices(customer_id);
CREATE INDEX idx_ci_status ON customer_invoices(status);
CREATE INDEX idx_ci_so ON customer_invoices(sales_order_id);

CREATE TABLE customer_invoice_lines (
  id                    BIGSERIAL PRIMARY KEY,
  invoice_id            BIGINT NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
  product_id            BIGINT NOT NULL REFERENCES products(id),
  account_id            BIGINT REFERENCES chart_of_accounts(id),
  analytic_account_id   BIGINT REFERENCES analytic_accounts(id),
  quantity              NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX idx_cil_invoice ON customer_invoice_lines(invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id                    BIGSERIAL PRIMARY KEY,
  payment_number        VARCHAR(30) UNIQUE, -- backend-generated, e.g. PMT00001
  payment_type          VARCHAR(10) NOT NULL CHECK (payment_type IN ('RECEIVE','SEND')),
  partner_id            BIGINT NOT NULL REFERENCES contacts(id),
  customer_invoice_id   BIGINT REFERENCES customer_invoices(id),
  vendor_bill_id        BIGINT REFERENCES vendor_bills(id),
  amount                NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method        VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH','BANK')),
  reference             VARCHAR(150),
  note                  TEXT,
  status                VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_target_xor CHECK (
    (customer_invoice_id IS NOT NULL AND vendor_bill_id IS NULL) OR
    (vendor_bill_id IS NOT NULL AND customer_invoice_id IS NULL)
  )
);
CREATE INDEX idx_payments_partner ON payments(partner_id);
CREATE INDEX idx_payments_invoice ON payments(customer_invoice_id);
CREATE INDEX idx_payments_bill ON payments(vendor_bill_id);

-- ============================================================
-- BUDGETS
-- ============================================================

CREATE TABLE budgets (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  responsible_id  BIGINT REFERENCES contacts(id),
  status          VARCHAR(15) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','REVISED','CLOSED')),
  revision_of_id  BIGINT REFERENCES budgets(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_budget_dates CHECK (end_date >= start_date)
);
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE budget_lines (
  id                    BIGSERIAL PRIMARY KEY,
  budget_id             BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  analytic_account_id   BIGINT NOT NULL REFERENCES analytic_accounts(id),
  type                  VARCHAR(10) NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
  committed_amount      NUMERIC(15,2) NOT NULL CHECK (committed_amount >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);

-- ============================================================
-- STOCK
-- ============================================================

CREATE TABLE stock_movements (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL REFERENCES products(id),
  movement_type   VARCHAR(3) NOT NULL CHECK (movement_type IN ('IN','OUT')),
  quantity        NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  reference_type  VARCHAR(20) NOT NULL CHECK (reference_type IN ('VENDOR_BILL','CUSTOMER_INVOICE')),
  reference_id    BIGINT NOT NULL,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_product ON stock_movements(product_id);
CREATE INDEX idx_stock_reference ON stock_movements(reference_type, reference_id);

COMMIT;
