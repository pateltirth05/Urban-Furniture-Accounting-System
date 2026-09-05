# 🪑 Urban Furniture Accounting System

A full-stack web-based accounting and business management system designed for **Urban Furniture**. The system manages master data, purchase and sales workflows, invoices and bills, payments, accounting journal entries, budgets, and financial reports.

---

## 📌 Table of Contents

- [Project Overview](#-project-overview)
- [Problem Statement](#-problem-statement)
- [Key Objectives](#-key-objectives)
- [Technology Stack](#-technology-stack)
- [System Users and Roles](#-system-users-and-roles)
- [Core Modules](#-core-modules)
- [System Workflow](#-system-workflow)
- [Master Data Modules](#-master-data-modules)
- [Transaction Modules](#-transaction-modules)
- [Accounting and Journal Entries](#-accounting-and-journal-entries)
- [Budget Management](#-budget-management)
- [Reports](#-reports)
- [Project Architecture](#-project-architecture)
- [Suggested Folder Structure](#-suggested-folder-structure)
- [Database Overview](#-database-overview)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Demo Workflow](#-demo-workflow)
- [Business Rules](#-business-rules)
- [Future Improvements](#-future-improvements)

---

# 📖 Project Overview

**Urban Furniture Accounting System** is a web application designed to manage the financial and business operations of a furniture company.

The application supports the complete business workflow:

```text
Master Data
     ↓
Purchase / Sales Transactions
     ↓
Vendor Bills / Customer Invoices
     ↓
Payments
     ↓
Journal Entries
     ↓
Financial Reports
```

The system is designed to provide a centralized platform where authorized users can manage contacts, products, accounting accounts, journals, transactions, budgets, and reports.

---

# 🎯 Problem Statement

Urban Furniture requires an accounting system that enables users to:

- Enter and manage core master data.
- Manage Contacts and Products.
- Maintain a Chart of Accounts.
- Manage Journals and Journal Entries.
- Record purchases and sales.
- Create Purchase Orders and Sales Orders.
- Generate Vendor Bills and Customer Invoices.
- Register payments through Cash or Bank.
- Maintain accounting records using debit and credit entries.
- Manage Analytic Accounts and Budgets.
- Generate financial reports such as:
  - Balance Sheet
  - Profit & Loss Report
  - Budget Report

The system represents a complete end-to-end accounting workflow rather than simply an invoice-generation application.

---

# 🎯 Key Objectives

The main objectives of the system are:

1. Centralize business and accounting data.
2. Simplify purchase and sales workflows.
3. Maintain accurate financial transaction records.
4. Support double-entry accounting principles.
5. Track payments against invoices and bills.
6. Organize financial information through the Chart of Accounts.
7. Monitor budgets using Analytic Accounts.
8. Generate useful financial reports.
9. Provide role-based access to different users.
10. Maintain consistent and reliable accounting data.

---

# 💻 Technology Stack

## Frontend

- React.js
- JavaScript
- React Router
- HTML5
- CSS3
- REST API integration

## Backend

- Node.js
- Express.js
- JavaScript
- JWT Authentication
- bcrypt for password hashing

## Database

- PostgreSQL

## Development Tools

- npm
- Git
- Environment Variables
- PostgreSQL Client

---

# 👥 System Users and Roles

The system contains three major user roles.

---

## 👑 1. Admin / Business Owner

The Admin has the highest level of access.

### Admin Responsibilities

- Create master data.
- Modify master data.
- Archive master data.
- Record transactions.
- Manage accounting data.
- View reports.

### Admin Access

- Contacts
- Products
- Chart of Accounts
- Journals
- Purchase Orders
- Vendor Bills
- Sales Orders
- Customer Invoices
- Payments
- Journal Entries
- Analytic Accounts
- Budgets
- Financial Reports

---

## 👨‍💼 2. Invoicing User / Accountant

The Accountant manages day-to-day accounting and transaction activities.

### Responsibilities

- Create required master data.
- Record business transactions.
- Create Purchase Orders.
- Create Sales Orders.
- Generate Vendor Bills.
- Generate Customer Invoices.
- Register payments.
- View reports.

---

## 👤 3. Contact User

A Contact User is associated with a Contact record.

A Contact can be:

- Customer
- Vendor
- Both

### Contact User Access

Contact Users should only be able to:

- View their own invoices or bills.
- View their own payment information.
- View their outstanding balances.
- Make or register payments where supported.

> **Security Requirement:** A Contact User must not be able to access another customer's or vendor's financial records.

---

# 🧩 Core Modules

The system is divided into the following modules:

## Master Data

1. Contact Master
2. Product Master
3. Chart of Accounts
4. Journal Master

## Transactions

5. Purchase Orders
6. Vendor Bills
7. Sales Orders
8. Customer Invoices
9. Payments
10. Journal Entries

## Budgeting

11. Analytic Accounts
12. Budgets

## Reporting

13. Balance Sheet
14. Profit & Loss Report
15. Budget Report

---

# 🔄 System Workflow

```text
                    ┌─────────────────┐
                    │   MASTER DATA   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
      ┌──────────────┐               ┌──────────────┐
      │   PURCHASE   │               │    SALES     │
      └──────┬───────┘               └──────┬───────┘
             │                              │
             ▼                              ▼
      Purchase Order                   Sales Order
             │                              │
             ▼                              ▼
       Vendor Bill                   Customer Invoice
             │                              │
             ▼                              ▼
          Payment                        Payment
             │                              │
             └──────────────┬───────────────┘
                            ▼
                    Journal Entries
                            │
                            ▼
                    Financial Reports
```

---

# 📚 Master Data Modules

# 👥 Contact Master

The Contact Master stores information about customers and vendors.

## Contact Fields

| Field | Description |
|---|---|
| Name | Name of the person or company |
| Type | Customer, Vendor, or Both |
| Email | Contact email address |
| Mobile | Contact mobile number |
| Address | Complete address |
| City | City |
| State | State |
| Pincode | Postal/Pincode |
| Profile Image | Contact profile image |

## Contact Types

```text
Customer
Vendor
Both
```

### Examples

- Vendor: Rahul Sharma
- Customer: Nimesh Pathak
- Vendor: Azure Furniture

---

# 📦 Product Master

The Product Master manages products and services used in purchase and sales transactions.

## Product Fields

| Field | Description |
|---|---|
| Product Name | Name of the product |
| Type | Goods, Service, or Combo |
| Sales Price | Selling price |
| Cost / Purchase Price | Purchase cost |
| Category | Product category |

## Product Types

- Goods
- Service
- Combo

### Example Products

- Office Chair
- Wooden Table
- Sofa
- Dining Table
- Wooden Chair

---

# 📒 Chart of Accounts

The **Chart of Accounts (CoA)** is the master list of ledger accounts used to classify financial transactions.

Each account represents a financial category.

## Account Types

### 🟢 Assets

Examples:

- Cash
- Bank
- Debtors

### 🔴 Liabilities

Examples:

- Creditors

### 🟡 Income

Examples:

- Sales Income

### 🔵 Expenses

Examples:

- Purchase Expense

### 🟣 Capital

Examples:

- Owner Capital

## Account Fields

| Field | Description |
|---|---|
| Account Name | Name of account |
| Account Code | Unique account identifier |
| Type | Asset, Liability, Expense, Income, Capital |
| Description | Optional account description |
| Status | Active or Archived |

---

# 📔 Journal Master

A Journal is used to group similar accounting transactions.

## Journal Types

### Sales Journal

Used for:

- Customer invoices
- Sales transactions

### Purchase Journal

Used for:

- Vendor bills
- Purchase transactions

### Bank Journal

Used for:

- Bank-related transactions

### Cash Journal

Used for:

- Cash receipts
- Cash payments

---

# ⚖️ Accounting and Journal Entries

A Journal Entry is the actual accounting record created for a financial transaction.

Each entry contains:

- Journal
- Date
- Reference
- Journal Items
- Account
- Debit
- Credit

## Double-Entry Principle

Every accounting transaction must follow:

```text
TOTAL DEBIT = TOTAL CREDIT
```

### Example: Cash Received from Customer

```text
Debit:  Cash
Credit: Debtor / Accounts Receivable
```

### Example: Purchase Made on Credit

```text
Debit:  Purchase Expense
Credit: Creditor / Accounts Payable
```

The application should validate that every journal entry is balanced before it is saved.

---

# 🛒 Transaction Modules

# 🧾 Purchase Order

A Purchase Order is created when Urban Furniture wants to purchase products from a vendor.

## Purchase Order Information

- Vendor
- Product
- Quantity
- Unit Price

### Flow

```text
Select Vendor
      ↓
Select Product
      ↓
Enter Quantity
      ↓
Enter Unit Price
      ↓
Create Purchase Order
```

---

# 📄 Vendor Bill

Once goods are received, the Purchase Order can be converted into a Vendor Bill.

## Vendor Bill Information

- Vendor
- Related Purchase Order
- Invoice Date
- Due Date
- Amount
- Payment Information

### Flow

```text
Purchase Order
       ↓
Vendor Bill
       ↓
Payment
```

Payment can be made through:

- Cash
- Bank

---

# 🛍️ Sales Order

A Sales Order is created when a customer purchases products.

## Sales Order Information

- Customer
- Product
- Quantity
- Unit Price
- Tax

### Flow

```text
Select Customer
       ↓
Select Product
       ↓
Enter Quantity
       ↓
Calculate Total
       ↓
Create Sales Order
```

---

# 🧾 Customer Invoice

A Customer Invoice is generated from a Sales Order.

## Customer Invoice Information

- Customer
- Related Sales Order
- Invoice Date
- Product Items
- Tax
- Total Amount
- Payment Status

### Flow

```text
Sales Order
      ↓
Customer Invoice
      ↓
Customer Payment
```

Payment can be received through:

- Cash
- Bank

---

# 💳 Payment Module

Payments are registered against:

- Vendor Bills
- Customer Invoices

## Payment Methods

- Cash
- Bank

## Payment Types

### Customer Receipt

Money received from a customer.

### Vendor Payment

Money paid to a vendor.

## Payment Process

```text
Invoice / Bill
       ↓
Select Cash or Bank
       ↓
Enter Payment Amount
       ↓
Register Payment
       ↓
Update Outstanding Balance
       ↓
Create Accounting Entry
```

---

# 📊 Analytic Accounts

An Analytic Account is used as a financial marker to monitor income or expenses related to a specific:

- Project
- Department
- Business Unit

## Analytic Account Fields

| Field | Description |
|---|---|
| Name | Analytic Account Name |
| Type | Income or Expense |

### Examples

- Marketing Department
- Sales Department
- Manufacturing Department
- Corporate Sales Project

---

# 💰 Budget Management

A Budget represents planned financial spending or allocation for a specific period.

## Budget Fields

| Field | Description |
|---|---|
| Budget Name | Name of the budget |
| Period | Budget period |
| Planned Amount | Planned financial amount |
| Analytic Account | Related analytic account |
| Responsible Person | Person responsible |

### Example

```text
Budget Name: Marketing Budget
Period: January - December
Planned Amount: ₹500,000
Responsible Person: Admin
```

---

# 📈 Reports

The system generates the following major reports.

---

## 📊 Balance Sheet

The Balance Sheet provides a real-time snapshot of:

- Assets
- Liabilities
- Capital

Example structure:

```text
ASSETS
  Cash
  Bank
  Debtors

LIABILITIES
  Creditors

CAPITAL
  Owner Capital
```

---

## 📉 Profit & Loss Report

The Profit & Loss Report calculates business profitability.

```text
Income
   -
Expenses
   =
Net Profit / Loss
```

It should show:

- Total Sales
- Total Purchases
- Total Expenses
- Total Income
- Net Profit or Loss

---

## 🎯 Budget Report

The Budget Report provides an overview of planned budgets.

It can show:

- Budget Name
- Budget Period
- Planned Amount
- Actual Amount
- Variance

---

# 🏗️ Project Architecture

The application follows a client-server architecture.

```text
┌─────────────────────┐
│   React Frontend    │
│                     │
│  Dashboard / Pages  │
└──────────┬──────────┘
           │
           │ REST API
           ▼
┌─────────────────────┐
│ Node.js + Express   │
│                     │
│ Authentication      │
│ Business Logic      │
│ Accounting Logic    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     PostgreSQL      │
│                     │
│ Users              │
│ Contacts           │
│ Transactions       │
│ Journal Entries    │
│ Reports Data       │
└─────────────────────┘
```

---

# 📁 Suggested Folder Structure

```text
urban-furniture-accounting-system/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Contacts/
│   │   │   ├── Products/
│   │   │   ├── Accounts/
│   │   │   ├── Journals/
│   │   │   ├── PurchaseOrders/
│   │   │   ├── VendorBills/
│   │   │   ├── SalesOrders/
│   │   │   ├── Invoices/
│   │   │   ├── Payments/
│   │   │   ├── Budgets/
│   │   │   └── Reports/
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   │
│   └── package.json
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── README.md
└── .gitignore
```

---

# 🗄️ Database Overview

The PostgreSQL database should contain tables for the main business entities.

## Core Tables

### Users

Stores system users and roles.

### Contacts

Stores customers and vendors.

### Products

Stores products and services.

### Chart of Accounts

Stores financial accounts.

### Journals

Stores journal categories.

### Journal Entries

Stores accounting transaction headers.

### Journal Entry Items

Stores debit and credit lines.

### Purchase Orders

Stores purchase order information.

### Purchase Order Items

Stores purchased products.

### Vendor Bills

Stores vendor invoices and bills.

### Sales Orders

Stores customer sales orders.

### Sales Order Items

Stores products in sales orders.

### Customer Invoices

Stores customer invoices.

### Payments

Stores customer receipts and vendor payments.

### Analytic Accounts

Stores project/department/business-unit financial tracking categories.

### Budgets

Stores budget information.

---

# 🔐 Authentication

The application should use:

- JWT Authentication
- bcrypt password hashing
- Protected routes
- Role-Based Access Control

## Roles

```text
ADMIN
ACCOUNTANT
CONTACT_USER
```

The backend must validate authorization.

Frontend route protection alone is not sufficient.

---

# ⚙️ Installation

## Prerequisites

Install:

- Node.js
- npm
- PostgreSQL
- Git

---

## 1. Clone the Repository

```bash
git clone <repository-url>
```

Move into the project folder:

```bash
cd urban-furniture-accounting-system
```

---

## 2. Install Backend Dependencies

```bash
cd server
npm install
```

---

## 3. Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

---

# 🗄️ PostgreSQL Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE urban_furniture;
```

Configure the database connection using environment variables.

Run database migrations or the schema file according to the project's database setup.

Example:

```bash
psql -U postgres -d urban_furniture -f database/schema.sql
```

> The exact migration command may vary depending on the database migration tool used in the implementation.

---

# 🔑 Environment Variables

Create a `.env` file inside the `server` directory.

Example:

```env
PORT=5000

DATABASE_URL=postgresql://username:password@localhost:5432/urban_furniture

JWT_SECRET=your_secure_secret_key
```

Never commit the real `.env` file to GitHub.

Use `.env.example` for sharing environment variable names.

---

# ▶️ Running the Application

## Start the Backend

Inside the `server` folder:

```bash
npm run dev
```

or:

```bash
npm start
```

The backend should run on a configured port, for example:

```text
http://localhost:5000
```

---

## Start the Frontend

Inside the `client` folder:

```bash
npm run dev
```

The React application will usually run on a local development URL such as:

```text
http://localhost:5173
```

---

# 🧪 Demo Workflow

## 🛒 Purchase Workflow

Example:

### Step 1

Create a Vendor:

```text
Azure Furniture
```

### Step 2

Create a Product:

```text
Wooden Chair
```

### Step 3

Create a Purchase Order.

```text
Vendor: Azure Furniture
Product: Wooden Chair
Quantity: 10
```

### Step 4

Convert the Purchase Order into a Vendor Bill.

### Step 5

Record payment through:

```text
Bank
```

### Step 6

The system updates:

- Bill payment status
- Outstanding balance
- Accounting records

---

## 🛍️ Sales Workflow

### Step 1

Create Customer:

```text
Nimesh Pathak
```

### Step 2

Create a Sales Order:

```text
Customer: Nimesh Pathak
Product: Office Chair
Quantity: 5
```

### Step 3

Generate a Customer Invoice.

### Step 4

Receive payment through:

```text
Cash
or
Bank
```

### Step 5

The system updates:

- Invoice status
- Paid amount
- Outstanding balance
- Accounting records

---

# 📏 Important Business Rules

The system should follow these important rules:

### Rule 1

Every financial transaction should follow the double-entry accounting principle.

```text
Total Debit = Total Credit
```

### Rule 2

A Contact User can only access their own records.

### Rule 3

Payments should be registered against the appropriate Invoice or Vendor Bill.

### Rule 4

Cash and Bank transactions should be properly recorded.

### Rule 5

Master data should be managed carefully because transactions depend on it.

### Rule 6

Financial reports should be generated from recorded accounting and transaction data.

### Rule 7

The system should maintain consistent relationships between:

```text
Purchase Order → Vendor Bill → Payment
```

and:

```text
Sales Order → Customer Invoice → Payment
```

---

# 🔮 Future Improvements

Possible future features include:

- GST and advanced tax management
- PDF Invoice generation
- Email invoices to customers
- Advanced inventory management
- Low-stock notifications
- Multi-company support
- Multi-currency support
- Bank reconciliation
- Audit logs
- Dashboard analytics
- Export reports to Excel/PDF
- Advanced budget vs actual analysis
- Notification system
- Online payment gateway integration

---

# 🎓 Educational Value

This project demonstrates a complete real-world business workflow:

```text
Master Data
    ↓
Purchase / Sales
    ↓
Invoice / Bill
    ↓
Payment
    ↓
Accounting Entries
    ↓
Financial Reporting
```

The project focuses not only on UI development but also on:

- Business logic
- Database relationships
- Financial transaction handling
- Debit/Credit accounting concepts
- Payment tracking
- Budget management
- Report generation

---

# 👨‍💻 Author

Developed as a full-stack accounting system project for:

**Urban Furniture**

---

# 📄 License

This project is created for educational, academic, hackathon, and development purposes.

---

## ⭐ Summary

**Urban Furniture Accounting System** is a full-stack business and accounting application that connects:

> Contacts → Products → Purchases/Sales → Bills/Invoices → Payments → Journal Entries → Financial Reports

The goal is to provide a structured and reliable system for managing the financial workflow of a furniture business.
