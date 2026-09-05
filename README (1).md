# Urban Furniture — Accounting System

A full-stack accounting system designed from the Urban Furniture hackathon requirements and the provided Excalidraw prototype.

## 1. Project Goal

The system connects the complete accounting workflow:

```text
Master Data
    ↓
Purchase / Sales
    ↓
Bill / Invoice
    ↓
Payment
    ↓
Automatic Journal Entry
    ↓
Ledger / Accounts
    ↓
Reports
```

The core goal is not just CRUD. The important part is keeping business transactions, payments, double-entry accounting, budgets, and reports connected and consistent.

The requirement document explicitly describes Contacts, Products, Chart of Accounts, Budgets, Journals, sales, purchases, payments, accounting entries, and Balance Sheet / P&L / Budget reporting. The prototype adds detailed UI behavior and validation rules.

---

# 2. Tech Stack

```text
Frontend     → React
Backend      → Node.js + Express.js
Database     → PostgreSQL
DB Driver    → pg
Authentication → JWT + bcrypt
```

## Why React?

React is suitable for this application because the UI contains many interactive business screens:

- Dashboard
- List views
- Kanban views
- Form views
- Sales/Purchase workflows
- Invoice/Bill screens
- Payment dialogs
- Accounting screens
- Reports

React lets us build reusable components such as tables, forms, modals, cards, filters and report sections.

## Why Node.js?

Node.js is a good fit for the backend because the application is API-driven and has many CRUD and transaction workflows.

It also lets the team use JavaScript across the frontend and backend, reducing context switching during a 24-hour hackathon.

## Why Express.js?

Express gives us a lightweight HTTP/API layer.

We can keep responsibilities separated:

```text
Route
  ↓
Controller
  ↓
Service / Business Logic
  ↓
PostgreSQL
```

This is especially important for accounting because business rules should not be mixed directly into route definitions.

## Why PostgreSQL?

PostgreSQL is the most important architectural choice for this project.

Accounting data is highly relational:

```text
Contact
   ├── Sales Order
   ├── Customer Invoice
   ├── Purchase Order
   ├── Vendor Bill
   └── Payment

Product
   ├── Sales Order Line
   └── Purchase Order Line

Chart of Account
   └── Journal Entry Lines

Analytic Account
   └── Transaction Lines
   └── Budget Lines
```

PostgreSQL gives us:

- Foreign keys
- Unique constraints
- Check constraints
- Transactions
- Numeric/decimal types for money
- Strong relational consistency
- Reliable aggregation for accounting reports

For accounting, database consistency is more important than simply having a fast CRUD database.

---

# 3. High-Level Architecture

```text
                         React Frontend
                              │
                              │ HTTP / JSON
                              ▼
                       Express.js API
                              │
              ┌───────────────┼────────────────┐
              │               │                │
           Routes         Middleware       Controllers
                              │
                     Authentication / RBAC
                              │
                              ▼
                         Services
                     Business Logic
                              │
                              ▼
                       PostgreSQL
                              │
              ┌───────────────┼────────────────┐
              │               │                │
          Master Data     Transactions      Accounting
              │               │                │
              └───────────────┼────────────────┘
                              │
                              ▼
                           Reports
```

## Backend responsibility

The backend is responsible for:

- Validation
- Authentication
- Role-based authorization
- Transaction processing
- Invoice/Bill calculations
- Payment processing
- Automatic journal creation
- Debit/credit validation
- Budget calculations
- Report calculations

The frontend should display and collect data; critical accounting rules belong on the backend.

---

# 4. Proposed Backend Structure

```text
server/
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── contact.controller.js
│   │   ├── product.controller.js
│   │   ├── account.controller.js
│   │   ├── journal.controller.js
│   │   ├── purchase.controller.js
│   │   ├── sales.controller.js
│   │   ├── payment.controller.js
│   │   ├── budget.controller.js
│   │   └── report.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── contact.routes.js
│   │   ├── product.routes.js
│   │   ├── account.routes.js
│   │   ├── journal.routes.js
│   │   ├── purchase.routes.js
│   │   ├── sales.routes.js
│   │   ├── payment.routes.js
│   │   ├── budget.routes.js
│   │   └── report.routes.js
│   │
│   ├── services/
│   │   ├── accounting.service.js
│   │   ├── payment.service.js
│   │   ├── invoice.service.js
│   │   ├── bill.service.js
│   │   ├── budget.service.js
│   │   └── report.service.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── package.json
└── .gitignore
```

---

# 5. Database Architecture

The following is the proposed relational model based on the requirements + prototype.

## Authentication

### users

```text
id
name
login_id UNIQUE
email UNIQUE
password_hash
role
contact_id FK → contacts.id (nullable)
created_at
updated_at
```

Roles:

```text
ADMIN
ACCOUNTANT
CONTACT
```

The prototype uses the terms Admin, Accountant/Invoicing User, and User/Contact.

The System is not a human login role. It represents automatic application behavior.

---

# 6. Master Data Tables

## contacts

```text
id
name
type
email UNIQUE
phone
street
city
state
country
pincode
image
created_at
updated_at
```

Contact type:

```text
CUSTOMER
VENDOR
BOTH
```

## product_categories

```text
id
name UNIQUE
created_at
```

The prototype allows categories to be created from the Product form.

## products

```text
id
name
category_id FK
product_type
sales_price
cost_price
image
created_at
updated_at
```

Product type:

```text
GOODS
SERVICE
COMBO
```

## analytic_accounts

```text
id
name
type
created_at
updated_at
```

Type:

```text
INCOME
EXPENSE
```

---

# 7. Accounting Tables

## chart_of_accounts

```text
id
name
account_type
account_subtype
is_active
created_at
updated_at
```

Main account types:

```text
ASSET
LIABILITY
CAPITAL
INCOME
EXPENSE
```

The prototype also distinguishes accounts such as:

```text
Bank
Cash
Debtors
Creditors
Sales Income
Purchase Expense
Other Expense
Capital
```

Therefore `account_type` and `account_subtype` should be kept separate rather than putting everything into one field.

Example:

```text
Cash
account_type = ASSET
account_subtype = CASH
```

```text
Sales Income
account_type = INCOME
account_subtype = SALES
```

This makes reporting easier.

## journals

```text
id
name
journal_type
default_account_id FK → chart_of_accounts.id
created_at
updated_at
```

Examples:

```text
Sales
Purchase
Bank
Cash
```

## journal_entries

```text
id
journal_id FK
reference
accounting_date
partner_id FK → contacts.id
status
created_at
updated_at
```

Status:

```text
DRAFT
POSTED
CANCELLED
```

## journal_entry_lines

```text
id
journal_entry_id FK
account_id FK
partner_id FK
analytic_account_id FK
debit
credit
```

Accounting rule:

```text
Total Debit = Total Credit
```

A journal entry cannot be posted when it is unbalanced.

---

# 8. Purchase Tables

## purchase_orders

```text
id
po_number UNIQUE
vendor_id FK → contacts.id
po_date
payment_terms
status
created_at
updated_at
```

## purchase_order_lines

```text
id
purchase_order_id FK
product_id FK
analytic_account_id FK
quantity
unit_price
total
```

Flow:

```text
Purchase Order
      ↓
Vendor Bill
      ↓
Payment
      ↓
Purchase Journal Entry
```

---

# 9. Vendor Bill Tables

## vendor_bills

```text
id
bill_number UNIQUE
purchase_order_id FK (nullable)
vendor_id FK
bill_reference
bill_date
due_date
status
total_amount
amount_paid
amount_due
created_at
updated_at
```

## vendor_bill_lines

```text
id
vendor_bill_id FK
product_id FK
account_id FK
analytic_account_id FK
quantity
unit_price
total
```

If the bill is created from a Purchase Order, the relevant vendor/product/price/quantity data is fetched from the PO.

---

# 10. Sales Tables

## sales_orders

```text
id
so_number UNIQUE
customer_id FK → contacts.id
so_date
status
created_at
updated_at
```

## sales_order_lines

```text
id
sales_order_id FK
product_id FK
analytic_account_id FK
quantity
unit_price
tax_amount
total
```

Flow:

```text
Sales Order
      ↓
Customer Invoice
      ↓
Payment
      ↓
Sales Journal Entry
```

---

# 11. Customer Invoice Tables

## customer_invoices

```text
id
invoice_number UNIQUE
sales_order_id FK (nullable)
customer_id FK
invoice_reference
invoice_date
due_date
status
subtotal
tax_amount
total_amount
amount_paid
amount_due
created_at
updated_at
```

## customer_invoice_lines

```text
id
invoice_id FK
product_id FK
account_id FK
analytic_account_id FK
quantity
unit_price
tax_amount
total
```

---

# 12. Payments

A payment should be a separate entity because the same payment workflow is used for bills and invoices.

## payments

```text
id
payment_type
partner_id FK → contacts.id
invoice_id FK (nullable)
bill_id FK (nullable)
amount
payment_date
payment_via
note
status
created_at
```

Payment type:

```text
SEND
RECEIVE
```

Payment method:

```text
CASH
BANK
```

Important rule:

```text
Amount Due = Total Amount - Amount Paid
```

A payment must not exceed the remaining payable amount.

---

# 13. Budgets

## budgets

```text
id
name
start_date
end_date
responsible_id FK → contacts.id
status
revision_of_id FK → budgets.id (nullable)
created_at
updated_at
```

Status:

```text
DRAFT
CONFIRMED
REVISED
CANCELLED
```

## budget_lines

```text
id
budget_id FK
analytic_account_id FK
type
committed_amount
```

Type:

```text
INCOME
EXPENSE
```

Calculated values should be derived from actual transactions:

```text
Achieved Amount
Achieved %
Amount To Achieve
```

Formula:

```text
Achieved % =
(Achieved Amount / Committed Amount) × 100
```

```text
Amount To Achieve =
Committed Amount - Achieved Amount
```

For expense budgets, achieved amounts come from relevant Vendor Bills.

For income budgets, achieved amounts come from relevant Customer Invoices.

Budget revisions create a new budget and keep a link to the original budget.

---

# 14. Accounting Automation

This is one of the most important parts of the project.

## Vendor Bill

When a confirmed Vendor Bill is posted:

```text
Purchase Expense A/c     DEBIT
        ↓
Creditor A/c             CREDIT
```

Example:

```text
Purchase A/c       Debit   10,000
Creditor A/c       Credit  10,000
```

## Customer Invoice

When a confirmed Customer Invoice is posted:

```text
Debtor A/c          DEBIT
        ↓
Sales Income A/c    CREDIT
```

Example:

```text
Debtor A/c          Debit   10,000
Sales A/c           Credit  10,000
```

The prototype explicitly requires these entries to be balanced.

---

# 15. Why Database Transactions Matter

Accounting operations should be atomic.

For example, confirming a Vendor Bill may require:

```text
1. Update bill status
2. Create journal entry
3. Create journal entry lines
4. Update payment/accounting information
```

If step 3 fails, we should not leave step 1 committed.

Therefore:

```text
BEGIN TRANSACTION

Create/Update Bill
Create Journal Entry
Create Debit Line
Create Credit Line

COMMIT
```

If anything fails:

```text
ROLLBACK
```

This is a major reason PostgreSQL is a strong choice for this system.

---

# 16. Reports

## Profit & Loss

```text
Total Income
    -
Total Expenses
    =
Net Income
```

The prototype describes:

```text
Income
Income from Sales

Expenses
Purchase Expense
Other Expense

Net Income
```

## Balance Sheet

Main categories:

```text
Assets
 ├── Bank
 ├── Cash
 ├── Debtors
 └── Other Assets

Liabilities
 ├── Creditors
 └── Other Liabilities

Capital
 └── Capital Account
```

The accounting equation should remain:

```text
Assets = Liabilities + Capital
```

## Budget Report

Shows:

```text
Budget
Start Date
End Date
Status
Committed Amount
Achieved Amount
Achieved %
Amount To Achieve
```

---

# 17. Role-Based Access

| Feature | Admin | Accountant | Contact |
|---|---:|---:|---:|
| Master Data | Full | Create/Manage | No |
| Sales | Full | Yes | No |
| Purchase | Full | Yes | No |
| Payments | Full | Yes | Own dues |
| Journal Entries | Full | Yes | No |
| Budgets | Full | Yes | No |
| Reports | Yes | Yes | No |
| Own Invoices/Bills | Yes | Yes | Yes |
| Other Contacts' Invoices | Yes | Yes | No |

The Contact portal must enforce ownership on the backend, not merely hide records in React.

---

# 18. Security

Authentication:

```text
Password
   ↓
bcrypt hash
   ↓
PostgreSQL
```

Login:

```text
Login ID + Password
       ↓
Verify credentials
       ↓
JWT
       ↓
Authenticated API requests
```

Authorization:

```text
JWT
 ↓
Authenticate Middleware
 ↓
Role Middleware
 ↓
Controller
```

Example:

```text
POST /api/budgets

Admin       → allowed
Accountant  → allowed
Contact     → forbidden
```

---

# 19. API Design

Example API organization:

```text
/api/auth
/api/contacts
/api/products
/api/accounts
/api/journals
/api/journal-entries
/api/purchases
/api/vendor-bills
/api/sales
/api/customer-invoices
/api/payments
/api/analytics
/api/budgets
/api/reports
```

Example:

```text
GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PUT    /api/contacts/:id
DELETE /api/contacts/:id
```

The actual API should be implemented module-by-module rather than creating every endpoint before testing anything.

---

# 20. Important Design Decisions

## Money

Use PostgreSQL `NUMERIC`, not floating point.

Example:

```sql
NUMERIC(15,2)
```

Money should not be calculated using JavaScript floating-point values where precision matters.

## IDs

Use database-generated IDs for internal relationships.

Human-readable numbers are separate:

```text
PO00001
BILL/2026/0001
INV/2026/0001
```

This keeps internal references stable while allowing business sequences.

## Soft Archive

Master records such as products, contacts, accounts and journals should preferably use an active/archive flag instead of physically deleting records that may already be referenced by transactions.

---

# 21. Prototype → Backend Mapping

```text
Prototype Screen             Backend Module

Login                         Auth
Create User                   Auth
Dashboard                     Dashboard / Reports
Contacts                      Contacts
Products                      Products
Analyticals                   Analytic Accounts
Budget                        Budgets
Chart of Accounts             Accounts
Journals                      Journals
Journal Entries               Accounting
Purchase Order                Purchases
Vendor Bill                   Vendor Bills
Bill Payment                  Payments
Sales Order                   Sales
Customer Invoice              Customer Invoices
Invoice Payment               Payments
Contact Portal                Portal / Invoices
P&L                           Reports
Balance Sheet                 Reports
Budget Report                 Reports
```

---

# 22. What I Would Explain to a Reviewer

## "Why PostgreSQL?"

> "Because this is an accounting application with strongly related entities and financial consistency requirements. PostgreSQL gives us foreign keys, constraints, numeric types and ACID transactions. More importantly, when a bill is confirmed and its journal entry is created, we can make the whole operation atomic."

## "Why Node.js and Express?"

> "The application is API-driven with CRUD operations plus business workflows. Node and Express give us a lightweight backend where routes, controllers, services and accounting logic can be separated cleanly. It also lets us use JavaScript on both frontend and backend, which is efficient within the hackathon time limit."

## "Why React?"

> "The prototype contains many interactive business screens—forms, lists, Kanban views, dashboards, payment dialogs and reports. React is well suited for reusable components and state-driven UI."

## "Why didn't you use Prisma?"

> "For this hackathon we chose direct PostgreSQL access through `pg`. It gives us direct control over SQL and PostgreSQL transactions, while avoiding ORM setup overhead. For accounting queries and reporting, explicit SQL also makes the database behavior easy to reason about."

## "How do you guarantee double-entry accounting?"

> "Every posted journal entry has journal lines with debit and credit values. Before posting, the backend validates that total debit equals total credit. The journal entry and related transaction update are performed inside a PostgreSQL transaction."

## "How does an invoice affect accounting?"

> "When a customer invoice is confirmed, the system creates a balanced journal entry: Debit Debtor and Credit Sales Income. When the invoice is paid, the payment is recorded against the invoice and the appropriate cash or bank accounting is updated."

## "How do Contacts only see their own invoices?"

> "The frontend only displays their invoices, but that is not our security boundary. The backend identifies the authenticated contact from the JWT and filters the invoice query by that contact ID. So a contact cannot simply change an invoice ID and access somebody else's invoice."

## "How does Budget Achieved Amount work?"

> "The budget is connected to an analytic account and a period. We calculate achieved income from relevant customer invoices and achieved expenses from relevant vendor bills within that period. Then Achieved Percentage and Amount To Achieve are calculated from those values."

---

# 23. 30-Second Project Explanation

> "Urban Furniture is a full-stack accounting system that models a real business accounting workflow. Users first create master data such as contacts, products, chart of accounts, journals and analytic accounts. They can then create purchase orders and sales orders, convert them into bills and invoices, record payments, and automatically generate balanced double-entry journal entries. PostgreSQL stores the relational financial data and provides transactional consistency, Node/Express exposes the business APIs, and React provides the interactive dashboard and accounting screens. Finally, the system derives P&L, Balance Sheet and Budget reports from the accounting data."

---

# 24. End-to-End Example

### Purchase

```text
Vendor
  ↓
Purchase Order
  ↓
Vendor Bill
  ↓
Confirm Bill
  ↓
Journal Entry
  ├── Debit Purchase Expense
  └── Credit Creditor
  ↓
Payment
  ↓
Cash / Bank
```

### Sale

```text
Customer
  ↓
Sales Order
  ↓
Customer Invoice
  ↓
Confirm Invoice
  ↓
Journal Entry
  ├── Debit Debtor
  └── Credit Sales Income
  ↓
Payment
  ↓
Cash / Bank
```

### Reporting

```text
Transactions
     ↓
Journal Entries
     ↓
Accounts / Ledger
     ↓
┌───────────────┬────────────────┬─────────────────┐
│ Profit & Loss │ Balance Sheet  │ Budget Report   │
└───────────────┴────────────────┴─────────────────┘
```

---

# 25. Requirement Gaps / Things to Verify

The main requirement mentions automated financial **and stock** reports. The provided prototype focuses heavily on accounting and does not clearly define a separate stock/inventory report or stock movement workflow.

Therefore this should be explicitly checked before final submission rather than silently assuming it is covered.

The main requirement also mentions tax computation on sales. The prototype shows tax-related fields/behavior less prominently than the accounting workflow, so the exact tax rules should be implemented according to the requirement rather than inventing a complex tax engine.

These are areas to confirm during final requirement verification.

---

# 26. Development Principle

We are following:

```text
Requirement
    ↓
Database Model
    ↓
Backend Business Logic
    ↓
API
    ↓
Frontend
    ↓
Integration Test
```

Not:

```text
Build UI first
    ↓
Figure out accounting later
```

For this project, the accounting model is the foundation.

---

## Current Development Order

```text
1. PostgreSQL connection
2. Database schema
3. Authentication + RBAC
4. Contacts
5. Products + Categories
6. Chart of Accounts
7. Journals
8. Analytic Accounts
9. Budgets
10. Purchase Orders
11. Vendor Bills
12. Sales Orders
13. Customer Invoices
14. Payments
15. Automatic Journal Entries
16. Reports
17. React Dashboard/UI
18. Full integration testing
```

The objective is to satisfy the requirements completely while keeping the architecture understandable enough that every major design decision can be defended during the hackathon review.



contacts
   │
   │ vendor_id
   ▼
purchase_orders
   │
   ├── purchase_order_lines
   │       ├── product
   │       └── analytic account
   │
   ▼
vendor_bills
   │
   └── vendor_bill_lines
           ├── product
           ├── account
           └── analytic account