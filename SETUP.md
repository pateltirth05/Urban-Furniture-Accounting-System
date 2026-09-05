# Getting Started

This repo is a scaffold for the Urban Furniture Accounting System
described in `README.md`. It's structured, wired, and boots — but most
business-logic controllers are stubs (`501 Not Implemented`) to be
filled in next.

## What's implemented vs. stubbed

**Fully implemented (use as your reference pattern):**
- Full PostgreSQL schema (`server/src/db/schema.sql`) — all 21 tables,
  constraints, indexes, `updated_at` triggers
- Seed script (`server/src/db/seed.sql`) — ADMIN user, base chart of
  accounts, journals, product category
- Auth: register (ACCOUNTANT/CONTACT only), login, `/me`, JWT
  middleware, role middleware
- Contacts module (`contactController.js` + `contactRoutes.js`) — full
  CRUD with SQL-level pagination/search/filter, archive-not-delete
- `withTransaction()` helper for multi-table financial writes
- `nextDocumentNumber()` helper for backend-generated PO/SO/B/INV numbers
- React app shell: routing, `AuthContext`, `ProtectedRoute`, `RoleRoute`,
  `MainLayout`, Login/Signup/ForgotPassword pages, Axios client with
  JWT interceptor

**Stubbed (folder + file exists, returns 501 / placeholder JSX):**
- All other controllers/routes: products, chart of accounts, journals,
  journal entries, purchase orders, vendor bills, sales orders,
  customer invoices, payments, analytic accounts, budgets, reports,
  balance sheet, stock, export, password reset
- All other pages: dashboard, products, accounting, purchases, sales,
  payments, analytics, reports, stock, customer portal

Follow `contactController.js` / `contactRoutes.js` as the pattern for
turning stubs into working modules, in the order suggested by
README section 45 ("Development Order").

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to one)

## 1. Database

```bash
createdb urban_furniture
cd server
cp .env.example .env
# edit .env: set DATABASE_URL and a real JWT_SECRET

npm install
npm run db:schema   # runs schema.sql
npm run db:seed     # runs seed.sql (ADMIN login: admin / Admin@12345)
```

Change the ADMIN password before any real deployment — see
`server/src/utils/hashPassword.js` to generate a new hash.

## 2. Backend

```bash
cd server
npm run dev     # nodemon, http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

## 3. Frontend

```bash
cd client
npm install
npm run dev     # http://localhost:5173, proxies /api to :5000
```

Log in with `admin` / `Admin@12345`, or register as ACCOUNTANT/CONTACT
from the signup page.

## Next steps

Work through README section 45 in order: Chart of Accounts / Journals
UI → Journal Entries → Purchase workflow → Vendor Bills → Payments →
Sales workflow → Customer Invoices → Stock → Analytic Accounts →
Budgets → P&L → Balance Sheet → PDF/Excel export → Customer Portal.

Each business-document confirmation (Vendor Bill, Customer Invoice,
Payment, Budget revision) should use `withTransaction()` and follow
the double-entry rules in README section 12.
