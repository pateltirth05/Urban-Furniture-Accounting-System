# Urban Furniture — Accounting System

A full-stack ERP-style accounting system for an urban furniture business, inspired by the Odoo UI/workflow style and implemented with React, Node.js, Express.js and PostgreSQL.

## 1. Project Purpose

The core workflow is:

**Master Data → Purchase/Sales → Bill/Invoice → Payment → Accounting Entries → Reports**

The application is not just CRUD. Business events create related accounting and stock effects.

- Purchase Order → Vendor Bill
- Confirm Vendor Bill → Payable + accounting entry + stock IN for GOODS
- Sales Order → Customer Invoice
- Confirm Customer Invoice → Receivable + accounting entry + stock OUT for GOODS
- Payment → settles receivable/payable
- Posted journal data → P&L + Balance Sheet
- Invoice/Bill actuals → Budget achievement
- Customer portal → customer sees only own records

## 2. Technology Stack

### Frontend

- React
- Vite
- React Router DOM
- Axios
- Lucide React

### Backend

- Node.js
- Express.js
- PostgreSQL driver: `pg`
- JWT: `jsonwebtoken`
- Password hashing: `bcryptjs`
- `dotenv`
- CORS
- Nodemon

### Database

PostgreSQL.

PostgreSQL is used because accounting needs relational integrity, foreign keys, CHECK/UNIQUE/NOT NULL constraints, transactions, numeric precision, indexes and reliable joins.

### Why `pg` instead of Prisma?

Use direct `pg` SQL because this project benefits from:

- simple architecture
- visible SQL
- easy explanation in review
- direct transaction control
- less ORM abstraction
- faster hackathon implementation

Final intended backend flow:

**Route → Middleware → Controller → PostgreSQL (`pg`)**

Avoid an unnecessary service layer in the final architecture. Older service files may be consolidated into controllers so the final code stays consistent and easy to explain.

---

# 3. Architecture

```text
React
  ↓ HTTP/JSON
Axios
  ↓
Express API
  ↓
Routes
  ↓
Authentication / Role Middleware
  ↓
Controllers
  ↓
PostgreSQL via pg
  ↓
Tables / Constraints / Indexes
```

For financial workflows:

```text
Purchase / Sale
      ↓
Bill / Invoice
      ↓
Accounting Entry
      ↓
Ledger
      ↓
Reports
```

For goods:

```text
Vendor Bill → Stock IN
Customer Invoice → Stock OUT
```

---

# 4. Recommended Folder Structure

```text
urban-furniture/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── routes/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoleRoute.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Signup.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── contacts/
│   │   │   │   ├── Contacts.jsx
│   │   │   │   └── ContactForm.jsx
│   │   │   ├── products/
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── ProductForm.jsx
│   │   │   │   └── ProductCategories.jsx
│   │   │   ├── accounting/
│   │   │   │   ├── ChartOfAccounts.jsx
│   │   │   │   ├── Journals.jsx
│   │   │   │   ├── JournalEntries.jsx
│   │   │   │   └── JournalEntryForm.jsx
│   │   │   ├── purchases/
│   │   │   │   ├── PurchaseOrders.jsx
│   │   │   │   ├── PurchaseOrderForm.jsx
│   │   │   │   ├── VendorBills.jsx
│   │   │   │   └── VendorBillForm.jsx
│   │   │   ├── sales/
│   │   │   │   ├── SalesOrders.jsx
│   │   │   │   ├── SalesOrderForm.jsx
│   │   │   │   ├── CustomerInvoices.jsx
│   │   │   │   ├── CustomerInvoiceForm.jsx
│   │   │   │   └── CustomerInvoiceView.jsx
│   │   │   ├── payments/
│   │   │   │   ├── Payments.jsx
│   │   │   │   └── PaymentForm.jsx
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticAccounts.jsx
│   │   │   │   ├── Budgets.jsx
│   │   │   │   ├── BudgetForm.jsx
│   │   │   │   └── BudgetReport.jsx
│   │   │   ├── reports/
│   │   │   │   ├── ProfitAndLoss.jsx
│   │   │   │   └── BalanceSheet.jsx
│   │   │   ├── stock/
│   │   │   │   └── StockReport.jsx
│   │   │   └── portal/
│   │   │       ├── CustomerPortal.jsx
│   │   │       └── CustomerBillView.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── contactController.js
│   │   │   ├── productCategoryController.js
│   │   │   ├── productController.js
│   │   │   ├── chartOfAccountController.js
│   │   │   ├── journalController.js
│   │   │   ├── journalEntryController.js
│   │   │   ├── purchaseOrderController.js
│   │   │   ├── vendorBillController.js
│   │   │   ├── paymentController.js
│   │   │   ├── analyticAccountController.js
│   │   │   ├── salesOrderController.js
│   │   │   ├── customerInvoiceController.js
│   │   │   ├── budgetController.js
│   │   │   ├── reportController.js
│   │   │   ├── balanceSheetController.js
│   │   │   ├── stockController.js
│   │   │   ├── exportController.js
│   │   │   └── passwordController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── roleMiddleware.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── contactRoutes.js
│   │   │   ├── productCategoryRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── chartOfAccountRoutes.js
│   │   │   ├── journalRoutes.js
│   │   │   ├── journalEntryRoutes.js
│   │   │   ├── purchaseOrderRoutes.js
│   │   │   ├── vendorBillRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── analyticAccountRoutes.js
│   │   │   ├── salesOrderRoutes.js
│   │   │   ├── customerInvoiceRoutes.js
│   │   │   ├── budgetRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   ├── stockRoutes.js
│   │   │   └── exportRoutes.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   ├── package.json
│   └── .gitignore
│
└── README.md
```

---

# 5. Authentication and Roles

There are three database user roles:

```text
ADMIN
ACCOUNTANT
CONTACT
```

## ADMIN

ADMIN is a fixed system/business-owner account.

It must be seeded directly into PostgreSQL/database setup.

Public signup must never create ADMIN.

Example development seed:

```text
loginId: admin
password: Admin@12345
role: ADMIN
```

Use a secure password for any real deployment.

## ACCOUNTANT

Accountants may:

- register
- login
- manage allowed master data
- record transactions
- view reports

## CONTACT / Customer Portal User

A customer portal user is stored as:

```text
users.role = CONTACT
```

and linked to:

```text
contacts.type = CUSTOMER
```

Customer is a contact type, not a user role.

Vendor is represented as:

```text
contacts.type = VENDOR
```

or:

```text
BOTH
```

Public registration should support ACCOUNTANT and CONTACT/customer users only.

---

# 6. Authentication Flow

```text
Signup/Login
   ↓
POST /api/auth/register or /api/auth/login
   ↓
Controller
   ↓
Validate credentials/data
   ↓
bcrypt password verification/hash
   ↓
JWT creation
   ↓
Frontend stores token
   ↓
Axios sends Bearer token
   ↓
authMiddleware verifies JWT
   ↓
req.user populated
```

JWT payload:

```text
userId
role
contactId
```

Authentication asks:

> Who are you?

Authorization asks:

> What are you allowed to do?

Example:

```js
roleMiddleware("ADMIN", "ACCOUNTANT")
```

means only those roles can continue.

Backend authorization is authoritative. Frontend button hiding is only UX.

---

# 7. Registration Requirements

ACCOUNTANT:

```text
User.role = ACCOUNTANT
```

Customer portal:

```text
User.role = CONTACT
Contact.type = CUSTOMER
User.contact_id = Contact.id
```

ADMIN:

```text
Not allowed through public signup
```

Required validation:

- name required
- login ID required
- login ID unique
- valid email
- email unique
- password required
- password policy
- confirm password on frontend
- valid role
- duplicate submission prevented

The backend must validate again even if the frontend validates.

---

# 8. Database Schema

## contacts

```text
id BIGSERIAL PRIMARY KEY
name VARCHAR
type CHECK(CUSTOMER, VENDOR, BOTH)
email UNIQUE
mobile
street
city
state
pincode
profile_image
is_active DEFAULT TRUE
created_at
updated_at
```

## users

```text
id BIGSERIAL PRIMARY KEY
name
login_id UNIQUE
email UNIQUE
password_hash
role CHECK(ADMIN, ACCOUNTANT, CONTACT)
contact_id UNIQUE FK contacts(id)
is_active DEFAULT TRUE
created_at
updated_at
```

## product_categories

```text
id BIGSERIAL PRIMARY KEY
name UNIQUE
created_at
updated_at
```

## products

```text
id BIGSERIAL PRIMARY KEY
name
category_id FK product_categories
product_type CHECK(GOODS, SERVICE, COMBO)
sales_price NUMERIC(15,2)
cost_price NUMERIC(15,2)
image
is_active
created_at
updated_at
```

## analytic_accounts

```text
id BIGSERIAL PRIMARY KEY
name UNIQUE
type CHECK(INCOME, EXPENSE)
is_active
created_at
updated_at
```

## chart_of_accounts

```text
id BIGSERIAL PRIMARY KEY
name UNIQUE
account_type CHECK(ASSET, LIABILITY, CAPITAL, INCOME, EXPENSE)
account_subtype
is_active
created_at
updated_at
```

## journals

```text
id BIGSERIAL PRIMARY KEY
name UNIQUE
journal_type CHECK(SALES, PURCHASE, BANK, CASH, GENERAL)
default_account_id FK chart_of_accounts
is_active
created_at
updated_at
```

## journal_entries

```text
id BIGSERIAL PRIMARY KEY
journal_id FK journals
entry_date
reference
partner_id FK contacts
status CHECK(DRAFT, POSTED, CANCELLED)
created_at
updated_at
```

## journal_entry_lines

```text
id BIGSERIAL PRIMARY KEY
journal_entry_id FK journal_entries
account_id FK chart_of_accounts
partner_id FK contacts
analytic_account_id FK analytic_accounts
debit NUMERIC(15,2)
credit NUMERIC(15,2)
```

Constraint:

```text
exactly one of debit/credit is positive
```

## purchase_orders

```text
id BIGSERIAL PRIMARY KEY
po_number UNIQUE
vendor_id FK contacts
po_date
payment_terms
status
subtotal
tax_amount
total_amount
```

## purchase_order_lines

```text
id BIGSERIAL PRIMARY KEY
purchase_order_id FK purchase_orders
product_id FK products
analytic_account_id FK analytic_accounts
quantity
unit_price
tax_amount
line_total
```

## vendor_bills

```text
id BIGSERIAL PRIMARY KEY
bill_number UNIQUE
purchase_order_id FK nullable
vendor_id FK contacts
bill_reference
bill_date
due_date
status
subtotal
tax_amount
total_amount
amount_paid
amount_due
```

## vendor_bill_lines

```text
id BIGSERIAL PRIMARY KEY
vendor_bill_id FK vendor_bills
product_id FK products
account_id FK chart_of_accounts
analytic_account_id FK analytic_accounts
quantity
unit_price
tax_amount
line_total
```

## sales_orders

```text
id BIGSERIAL PRIMARY KEY
so_number UNIQUE
customer_id FK contacts
so_date
payment_terms
status
subtotal
tax_amount
total_amount
```

## sales_order_lines

```text
id BIGSERIAL PRIMARY KEY
sales_order_id FK sales_orders
product_id FK products
analytic_account_id FK analytic_accounts
quantity
unit_price
tax_rate
tax_amount
line_total
```

## customer_invoices

```text
id BIGSERIAL PRIMARY KEY
invoice_number UNIQUE
sales_order_id FK nullable
customer_id FK contacts
invoice_reference
invoice_date
due_date
status
subtotal
tax_amount
total_amount
amount_paid
amount_due
```

## customer_invoice_lines

```text
id BIGSERIAL PRIMARY KEY
invoice_id FK customer_invoices
product_id FK products
account_id FK chart_of_accounts
analytic_account_id FK analytic_accounts
quantity
unit_price
tax_rate
tax_amount
line_total
```

## payments

```text
id BIGSERIAL PRIMARY KEY
payment_number UNIQUE
payment_type CHECK(RECEIVE, SEND)
partner_id FK contacts
customer_invoice_id FK nullable
vendor_bill_id FK nullable
amount
payment_date
payment_method CHECK(CASH, BANK)
reference
note
status
```

Constraint:

```text
exactly one of customer_invoice_id or vendor_bill_id is non-null
```

## budgets

```text
id BIGSERIAL PRIMARY KEY
name
start_date
end_date
responsible_id FK contacts
status
revision_of_id FK budgets nullable
created_at
updated_at
```

## budget_lines

```text
id BIGSERIAL PRIMARY KEY
budget_id FK budgets
analytic_account_id FK analytic_accounts
type CHECK(INCOME, EXPENSE)
committed_amount
created_at
```

## stock_movements

```text
id BIGSERIAL PRIMARY KEY
product_id FK products
movement_type CHECK(IN, OUT)
quantity
reference_type CHECK(VENDOR_BILL, CUSTOMER_INVOICE)
reference_id
movement_date
created_at
```

---

# 9. IDs and Document Numbers

Users must never manually enter database primary IDs.

Use PostgreSQL-generated IDs:

```text
BIGSERIAL / identity
```

Examples:

```text
products.id
contacts.id
customer_invoices.id
```

are generated automatically.

Users also should not type invoice/order numbers.

Examples:

```text
PO00001
SO00001
B00001
INV00001
```

are generated by backend/database logic.

The frontend sends business data, not database IDs or generated document numbers.

Never trust client-supplied IDs for authorization or financial operations.

---

# 10. Database Integrity

Use:

- primary keys
- foreign keys
- unique constraints
- NOT NULL
- CHECK constraints
- numeric precision
- status constraints
- date constraints

Examples:

```text
quantity > 0
price >= 0
tax_rate BETWEEN 0 AND 100
amount_paid <= total_amount
end_date >= start_date
```

Database constraints are the final integrity layer.

---

# 11. Transactions

Use PostgreSQL transactions when one business action changes multiple tables.

Example:

```text
BEGIN
  lock bill
  create journal entry
  create journal lines
  update bill
  create stock movement
COMMIT
```

If anything fails:

```text
ROLLBACK
```

This prevents half-completed financial workflows.

Use this for:

- journal entry posting
- vendor bill confirmation
- customer invoice confirmation
- payments
- budget revisions

---

# 12. Double-Entry Accounting

Every posted journal entry must satisfy:

```text
Total Debit = Total Credit
```

Example customer credit sale:

```text
Debtors       Dr 10,000
Sales Income  Cr 10,000
```

Customer payment:

```text
Bank/Cash     Dr 10,000
Debtors       Cr 10,000
```

Vendor bill:

```text
Purchases Expense  Dr 30,000
Creditors          Cr 30,000
```

Vendor payment:

```text
Creditors     Dr 30,000
Bank          Cr 30,000
```

A Journal is the book/category.

A Journal Entry is the actual transaction.

Journal Entry Lines are the debit/credit rows.

---

# 13. Purchase Workflow

```text
Vendor
 ↓
Purchase Order
 ↓
Vendor Bill
 ↓
Confirm
 ↓
Accounting Entry
 ↓
Stock IN for GOODS
 ↓
Vendor Payment
```

Vendor bill confirmation:

```text
Dr Purchases Expense
Cr Creditors
```

Payment:

```text
Dr Creditors
Cr Bank/Cash
```

Prevent payment greater than amount due.

---

# 14. Sales Workflow

```text
Customer
 ↓
Sales Order
 ↓
Customer Invoice
 ↓
Confirm
 ↓
Accounting Entry
 ↓
Stock OUT for GOODS
 ↓
Customer Payment
```

Invoice confirmation:

```text
Dr Debtors
Cr Sales Income
```

Payment:

```text
Dr Bank/Cash
Cr Debtors
```

Prevent payment greater than amount due.

---

# 15. Stock

Stock is a movement ledger.

```text
Vendor Bill + GOODS → IN
Customer Invoice + GOODS → OUT
```

Current quantity:

```text
SUM(IN) - SUM(OUT)
```

Services normally do not create physical stock movements.

Stock report must support:

- search
- filters
- pagination
- movement history

---

# 16. Budget

Budget contains:

- name
- period
- responsible person/contact
- status
- revision

Budget lines contain:

- analytic account
- income/expense type
- committed/planned amount

Report:

```text
Committed
Achieved
Achievement %
Amount To Achieve
```

Example:

```text
Planned = 500,000
Achieved = 350,000
Achievement = 70%
Remaining = 150,000
```

Actuals must be calculated from relevant confirmed financial transactions, not blindly typed by the user.

---

# 17. Reports

## Profit and Loss

Uses posted journal entries.

Income:

```text
credit - debit
```

Expense:

```text
debit - credit
```

Net profit:

```text
Income - Expense
```

## Balance Sheet

Includes:

```text
Assets
Liabilities
Capital/Equity
```

Core relationship:

```text
Assets = Liabilities + Equity
```

Reports must be generated from actual posted ledger data.

---

# 18. Search

Search must work against PostgreSQL, not only the currently loaded React array.

Example:

```text
GET /api/products?search=chair
```

Use parameterized SQL:

```sql
WHERE name ILIKE '%' || $1 || '%'
```

Never concatenate raw search input into SQL.

Search should be available on major lists:

- contacts
- products
- orders
- bills
- invoices
- payments
- journal entries
- budgets
- stock

---

# 19. Filtering

Filters must affect the backend query.

Examples:

Contacts:

```text
type
active
city
```

Products:

```text
category
productType
active
```

Invoices:

```text
customer
status
date
```

Bills:

```text
vendor
status
date
```

Payments:

```text
paymentType
paymentMethod
date
```

Reports:

```text
startDate
endDate
```

---

# 20. Pagination

Pagination is mandatory.

Example:

```text
GET /api/products?page=2&limit=20
```

Backend:

```text
offset = (page - 1) * limit
```

SQL:

```sql
LIMIT $1 OFFSET $2
```

Response should contain:

```json
{
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 200,
    "totalPages": 10
  }
}
```

Frontend must provide:

- Previous
- Next
- current page
- total pages
- optional page size

Do not fetch all 200+ rows into React and paginate locally.

---

# 21. Minimum 200 Test Records

Seed at least **200 realistic relational records** for demonstration/testing.

The dataset should make these visible:

- pagination
- search
- filtering
- realistic tables
- report calculations

Records must be relationally valid.

Do not create orphan records.

Examples:

```text
products → valid category
orders → valid customer/vendor
order lines → valid products
invoices → valid customers
bills → valid vendors
payments → valid invoice/bill
journal lines → valid accounts
stock → valid products/documents
```

---

# 22. Query Efficiency

The application must avoid unnecessary database queries.

Rules:

- paginate in SQL
- search in SQL
- filter in SQL
- avoid N+1 queries
- use joins for related list data
- select only required columns
- avoid fetching the same data repeatedly
- use indexes on important search/join/filter columns
- use transactions for multi-write workflows
- calculate aggregates in SQL where appropriate

Bad:

```text
Get 20 invoices
→ query customer for invoice 1
→ query customer for invoice 2
→ ...
```

Better:

```sql
SELECT i.*, c.name AS customer_name
FROM customer_invoices i
JOIN contacts c ON c.id = i.customer_id
LIMIT $1 OFFSET $2;
```

"Minimum queries" means efficient, purposeful queries, not literally forcing every feature into one query.

---

# 23. Indexes

Useful indexes include:

```text
users.login_id
users.email
users.role
contacts.type
contacts.is_active
products.category_id
products.product_type
products.is_active
journal_entries.journal_id
journal_entries.entry_date
journal_entries.status
journal_entry_lines.account_id
customer_invoices.customer_id
customer_invoices.status
customer_invoices.invoice_date
vendor_bills.vendor_id
vendor_bills.status
vendor_bills.bill_date
payments.payment_date
payments.payment_type
stock_movements.product_id
stock_movements.movement_date
```

Indexes improve lookup/filter/join performance but add storage and write overhead, so use them intentionally.

---

# 24. Archive vs Delete

Historical master data should normally be archived.

Example:

```text
products.is_active = false
```

rather than physically deleting a product that appears in old invoices.

This protects historical reporting.

---

# 25. Frontend UI

The UI should look like a professional Odoo-inspired ERP:

```text
+--------------------------------------------------+
| Top Header                                       |
+-------------+------------------------------------+
| Sidebar     | Workspace                          |
|             |                                    |
| Dashboard   | Page Header                        |
| Contacts    | Search / Filters / Actions         |
| Products    |                                    |
| Sales       | Table / Kanban                     |
| Purchases   |                                    |
| Accounting  | Pagination                         |
| Reports     |                                    |
+-------------+------------------------------------+
```

Design:

- Odoo-inspired purple primary
- light gray workspace
- white cards/forms
- left sidebar
- top header
- tables
- status badges
- responsive layout
- consistent spacing
- clear primary/secondary/danger actions

Existing HTML/CSS should be treated as the visual source of truth.

Do not recreate the UI from scratch if an existing page already defines the intended design.

---

# 26. CSS Rules

Use camelCase class names:

```text
pageLayout
sideBar
mainContent
topHeader
pageWorkspace
pageHeader
btnPrimary
formControl
dataTable
statusBadge
```

Do not use hyphenated class names.

Do not use inline styles.

Do not use internal `<style>` blocks inside React components.

Use reusable CSS classes for visual states.

---

# 27. List Page Standard

Every important list page should include:

```text
Page Title
Create button
Search bar
Filters
Table/Kanban
Status badges
Pagination
Loading state
Empty state
Error state
Export button
```

Example:

```text
Products

[ Search products... ]

[ Category ] [ Type ] [ Active ] [ Export ]

Name          Category       Type       Price
------------------------------------------------
Chair         Chairs         Goods      8000
Table         Tables         Goods      15000

< Previous    Page 2 of 10    Next >
```

---

# 28. Loading, Empty and Error States

Every API-driven page must handle:

### Loading

```text
Loading...
```

### Empty

```text
No records found.
```

### Error

```text
Unable to load data.
[Retry]
```

Never leave a blank screen after an API failure.

---

# 29. Button/Status Rules

Document actions depend on status.

Draft:

```text
Edit
Confirm
Cancel
```

Confirmed:

```text
View
Payment
PDF
```

Paid:

```text
View
PDF
```

Cancelled:

```text
View
```

Backend must enforce status rules even if the frontend hides buttons.

---

# 30. Customer Portal Security

A CONTACT user may only see their own customer data.

Use authenticated:

```text
req.user.contactId
```

Backend filtering must enforce ownership.

Do not rely on:

```text
/customer-invoices/123
```

alone.

A customer must not be able to change the URL ID and access another customer's invoice.

---

# 31. PDF Generation

PDF export is required for:

- Customer Invoice
- Vendor Bill
- Sales Order
- Purchase Order
- Journal Entry
- P&L
- Balance Sheet
- Budget Report
- Stock Report

PDFs should use authoritative backend/database data.

The client should request the export endpoint and receive a file.

---

# 32. Excel Export

Useful Excel exports:

- Contacts
- Products
- Purchase Orders
- Vendor Bills
- Sales Orders
- Customer Invoices
- Payments
- Budgets
- Stock
- P&L
- Balance Sheet

Exports should respect filters/date ranges where applicable.

---

# 33. API Design

Examples:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PUT    /api/contacts/:id
DELETE /api/contacts/:id

GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
```

Workflow actions:

```text
POST /api/purchase-orders/:id/confirm
POST /api/purchase-orders/:id/cancel

POST /api/vendor-bills/:id/confirm
POST /api/vendor-bills/:id/cancel

POST /api/sales-orders/:id/confirm
POST /api/sales-orders/:id/cancel

POST /api/customer-invoices/:id/confirm
POST /api/customer-invoices/:id/cancel

POST /api/journal-entries/:id/post
POST /api/journal-entries/:id/cancel
```

---

# 34. Required Controllers

### authController

- register
- login
- current user
- profile update
- password reset

### contactController

- create
- list
- get
- update
- archive

### productCategoryController

- create
- list
- get
- update
- safe delete

### productController

- create
- list
- get
- update
- archive

### chartOfAccountController

- create
- list
- get
- update
- archive

### journalController

- create
- list
- get
- update
- archive

### journalEntryController

- create draft
- list
- get
- post
- cancel
- validate balance

### purchaseOrderController

- create
- list
- get
- update draft
- confirm
- cancel

### vendorBillController

- create
- list
- get
- update draft
- confirm
- cancel
- create accounting
- create stock IN

### paymentController

- create
- list
- get
- validate outstanding amount
- create accounting
- update document balance

### analyticAccountController

- CRUD/archive

### salesOrderController

- create
- list
- get
- update draft
- confirm
- cancel

### customerInvoiceController

- create
- list
- get
- update draft
- confirm
- cancel
- create accounting
- create stock OUT

### budgetController

- create
- list
- get
- confirm
- revise
- cancel
- achievement calculation

### reportController

- P&L

### balanceSheetController

- Balance Sheet

### stockController

- stock report
- movements

### exportController

- PDF
- Excel

---

# 35. Main Pages Required

Authentication:

```text
Login.jsx
Signup.jsx
ForgotPassword.jsx
```

Dashboard:

```text
Dashboard.jsx
```

Contacts:

```text
Contacts.jsx
ContactForm.jsx
```

Products:

```text
Products.jsx
ProductForm.jsx
ProductCategories.jsx
```

Accounting:

```text
ChartOfAccounts.jsx
Journals.jsx
JournalEntries.jsx
JournalEntryForm.jsx
```

Purchases:

```text
PurchaseOrders.jsx
PurchaseOrderForm.jsx
VendorBills.jsx
VendorBillForm.jsx
```

Sales:

```text
SalesOrders.jsx
SalesOrderForm.jsx
CustomerInvoices.jsx
CustomerInvoiceForm.jsx
CustomerInvoiceView.jsx
```

Payments:

```text
Payments.jsx
PaymentForm.jsx
```

Analytics/Budget:

```text
AnalyticAccounts.jsx
Budgets.jsx
BudgetForm.jsx
BudgetReport.jsx
```

Reports:

```text
ProfitAndLoss.jsx
BalanceSheet.jsx
```

Stock:

```text
StockReport.jsx
```

Portal:

```text
CustomerPortal.jsx
CustomerBillView.jsx
```

---

# 36. Frontend Routing

Public:

```text
/login
/signup
/forgot-password
```

Root:

```text
/
→ /login when unauthenticated
→ appropriate dashboard/portal when authenticated
```

Internal protected routes:

```text
/dashboard
/contacts
/products
/product-categories
/accounts
/journals
/journal-entries
/purchase-orders
/vendor-bills
/sales-orders
/customer-invoices
/payments
/analytic-accounts
/budgets
/reports/profit-and-loss
/reports/balance-sheet
/stock
```

CONTACT:

```text
/customer-portal
```

Use:

```text
ProtectedRoute
```

for authentication.

Use:

```text
RoleRoute
```

for role-specific pages.

CONTACT must not access internal accounting pages.

---

# 37. API Client

`client/src/services/api.js` should:

- configure Axios base URL
- attach JWT automatically
- expose API functions
- handle 401 logout/redirect
- support JSON requests
- support PDF/Excel blob downloads

Example:

```text
API.post('/auth/login', data)
API.post('/auth/register', data)
API.get('/contacts')
API.get('/products')
```

Keep API calls centralized instead of scattering Axios calls through every component.

---

# 38. Validation

Frontend validation:

- required fields
- email
- dates
- quantity
- price
- tax
- password
- password confirmation

Backend validation:

- repeat all important validation
- validate role
- validate ownership
- validate document status
- validate IDs
- validate relationships
- recalculate totals
- prevent overpayment
- validate debit/credit balance

Frontend validation is for UX.

Backend/database validation is for security and integrity.

---

# 39. Financial Total Calculation

The frontend can calculate totals for immediate display:

```text
quantity × unit price
```

But the backend must recalculate:

```text
subtotal
tax
total
```

Never trust:

```text
total_amount
```

sent by the browser.

---

# 40. Important Terminology

### Contact

Customer/vendor/business partner.

### Product

Goods, service or combo.

### Chart of Accounts

Master list of financial accounts.

### Journal

Accounting book/category such as Sales or Purchase.

### Journal Entry

Actual accounting transaction.

### Journal Entry Line

Individual debit/credit row.

### Debtors

Money customers owe the business.

### Creditors

Money business owes vendors.

### Invoice

Customer financial document.

### Vendor Bill

Vendor financial/payable document.

### Payment

Settlement of receivable/payable.

### Analytic Account

Management analysis category.

### Budget

Planned amount for a period/analytic account.

---

# 41. Final Reviewer Explanation

> Urban Furniture is an integrated accounting ERP system where master data is connected to real purchase and sales workflows. Purchase orders become vendor bills, sales orders become customer invoices, confirmation automatically creates double-entry accounting and stock movements for goods, payments settle receivables or payables, and posted ledger data feeds P&L, Balance Sheet and budget reports. PostgreSQL provides relational and accounting integrity, Express provides the API/business logic, and React provides the Odoo-inspired ERP interface.

---

# 42. Reviewer Questions to Be Ready For

### Why PostgreSQL?

Because the system is relational and accounting needs ACID transactions, foreign keys, constraints, numeric precision and reliable joins.

### Why React?

For interactive forms, tables, dashboards, routing, state management and reusable components.

### Why Express?

Simple Node.js HTTP/API framework for routes, middleware and controllers.

### Why `pg`?

Direct SQL is simple, visible and easy to explain; it also gives direct control over PostgreSQL transactions.

### Why double-entry?

Every financial transaction has two accounting effects and total debit must equal total credit.

### Why Journal vs Journal Entry?

Journal is the book/category. Journal Entry is the actual transaction inside that journal.

### Why archive?

To preserve historical references and accounting records.

### Why backend validation if frontend already validates?

The browser can be modified or bypassed. Backend validation is authoritative.

### Why pagination?

To avoid loading large datasets into the browser and to keep queries/UI efficient.

### Why indexes?

To improve search, filtering, joins and sorting on frequently accessed columns.

### How do you prevent overpayment?

Backend locks the financial document, checks the outstanding amount and rejects payments above the balance.

### How does customer portal security work?

The JWT contains `contactId`; backend queries filter records using the authenticated contact rather than trusting a URL ID.

### How does stock work?

Confirmed vendor bills create IN movements for goods; confirmed customer invoices create OUT movements. Current stock is IN minus OUT.

---

# 43. Full End-to-End Demo Flow

```text
ADMIN LOGIN
 ↓
Dashboard
 ↓
Contacts
 ↓
Create Customer/Vendor
 ↓
Products
 ↓
Sales Order
 ↓
Customer Invoice
 ↓
Confirm Invoice
 ↓
Accounting Entry
 ↓
Stock OUT
 ↓
Customer Payment
 ↓
Invoice PAID
 ↓
Purchase Order
 ↓
Vendor Bill
 ↓
Confirm Bill
 ↓
Accounting Entry
 ↓
Stock IN
 ↓
Vendor Payment
 ↓
Bill PAID
 ↓
P&L
 ↓
Balance Sheet
 ↓
Budget Report
 ↓
Stock Report
 ↓
PDF / Excel
 ↓
Logout
 ↓
CONTACT LOGIN
 ↓
Customer Portal
 ↓
Only own records visible
```

---

# 44. Final Acceptance Checklist

## Authentication

- [ ] Fixed ADMIN exists directly in database
- [ ] ADMIN cannot be publicly registered
- [ ] ACCOUNTANT signup works
- [ ] Customer/CONTACT signup works
- [ ] Login works
- [ ] Logout works
- [ ] Forgot password works
- [ ] Passwords hashed
- [ ] JWT works
- [ ] Protected routes work
- [ ] Role restrictions work

## Master Data

- [ ] Contacts
- [ ] Products
- [ ] Categories
- [ ] Chart of Accounts
- [ ] Journals
- [ ] Analytic Accounts

## Sales

- [ ] Sales Order
- [ ] Customer Invoice
- [ ] Confirmation
- [ ] Journal Entry
- [ ] Stock OUT
- [ ] Customer Payment
- [ ] Correct status

## Purchases

- [ ] Purchase Order
- [ ] Vendor Bill
- [ ] Confirmation
- [ ] Journal Entry
- [ ] Stock IN
- [ ] Vendor Payment
- [ ] Correct status

## Accounting

- [ ] Debit/credit validation
- [ ] Balanced posting
- [ ] Transaction/rollback
- [ ] P&L
- [ ] Balance Sheet

## Budget

- [ ] Create
- [ ] Confirm
- [ ] Revise
- [ ] Achieved
- [ ] Percentage
- [ ] Amount to achieve
- [ ] Report

## Stock

- [ ] IN
- [ ] OUT
- [ ] Current stock
- [ ] Movement history

## Data / Performance

- [ ] 200+ realistic records
- [ ] Search works
- [ ] Filters work
- [ ] Pagination works
- [ ] SQL-level pagination
- [ ] SQL-level search/filter
- [ ] No N+1 queries
- [ ] Appropriate indexes
- [ ] No orphan records
- [ ] Database-generated IDs
- [ ] Backend-generated document numbers

## UI

- [ ] Odoo-inspired design
- [ ] Existing visual design preserved
- [ ] Responsive
- [ ] Search bars
- [ ] Filters
- [ ] Pagination
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Toasts
- [ ] Status-aware buttons
- [ ] No inline styles
- [ ] No hyphenated CSS classes

## Export

- [ ] Invoice PDF
- [ ] Vendor Bill PDF
- [ ] Sales Order PDF
- [ ] Purchase Order PDF
- [ ] Journal Entry PDF
- [ ] P&L PDF
- [ ] Balance Sheet PDF
- [ ] Budget PDF
- [ ] Stock PDF
- [ ] Excel exports

---

# 45. Development Order

```text
1. PostgreSQL schema
2. Constraints
3. Indexes
4. Timestamp triggers
5. Seed ADMIN
6. Seed 200+ realistic records
7. PostgreSQL connection
8. Express server
9. Auth
10. Role middleware
11. Master data
12. CoA/Journals
13. Journal Entries
14. Purchase workflow
15. Vendor Bills
16. Payments
17. Sales workflow
18. Customer Invoices
19. Stock
20. Analytic Accounts
21. Budgets
22. P&L
23. Balance Sheet
24. PDF
25. Excel
26. React auth
27. Protected routing
28. Main layout
29. Dashboard
30. Master data pages
31. Purchase pages
32. Sales pages
33. Payments
34. Accounting
35. Budgets
36. Reports
37. Stock
38. Customer Portal
39. Search
40. Filters
41. Pagination
42. Loading/empty/error states
43. Full end-to-end testing
```

---

# 46. Golden Rules

1. Frontend is UX; backend is business truth.
2. Never trust frontend totals.
3. Never trust frontend roles.
4. Never trust frontend permissions.
5. Never let users manually enter database primary IDs.
6. Generate document numbers in backend/database logic.
7. Use PostgreSQL constraints.
8. Use transactions for multi-table financial operations.
9. Every posted journal entry must balance.
10. Customer portal must enforce ownership on the backend.
11. Search/filter/pagination must work against PostgreSQL.
12. Do not load all records just to paginate in React.
13. Avoid N+1 queries.
14. Archive important master records.
15. Keep controllers simple and explainable.
16. Use reusable React components.
17. Preserve the existing Odoo-inspired HTML/CSS design.
18. No inline styles.
19. No hyphenated CSS class names.
20. Every important button must perform a real operation.
21. Financial status transitions must be enforced by the backend.
22. PDF/Excel must use authoritative backend data.
23. Show loading/empty/error states.
24. Prevent duplicate submissions.
25. Test complete business workflows, not only CRUD endpoints.
