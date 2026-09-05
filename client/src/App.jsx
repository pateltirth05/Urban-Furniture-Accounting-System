import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import Contacts from "./pages/contacts/Contacts";
import ContactForm from "./pages/contacts/ContactForm";
import Products from "./pages/products/Products";
import ProductForm from "./pages/products/ProductForm";
import ProductCategories from "./pages/products/ProductCategories";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import Journals from "./pages/accounting/Journals";
import JournalEntries from "./pages/accounting/JournalEntries";
import JournalEntryForm from "./pages/accounting/JournalEntryForm";
import PurchaseOrders from "./pages/purchases/PurchaseOrders";
import PurchaseOrderForm from "./pages/purchases/PurchaseOrderForm";
import VendorBills from "./pages/purchases/VendorBills";
import VendorBillForm from "./pages/purchases/VendorBillForm";
import SalesOrders from "./pages/sales/SalesOrders";
import SalesOrderForm from "./pages/sales/SalesOrderForm";
import CustomerInvoices from "./pages/sales/CustomerInvoices";
import CustomerInvoiceForm from "./pages/sales/CustomerInvoiceForm";
import CustomerInvoiceView from "./pages/sales/CustomerInvoiceView";
import Payments from "./pages/payments/Payments";
import PaymentForm from "./pages/payments/PaymentForm";
import AnalyticAccounts from "./pages/analytics/AnalyticAccounts";
import Budgets from "./pages/analytics/Budgets";
import BudgetForm from "./pages/analytics/BudgetForm";
import BudgetReport from "./pages/analytics/BudgetReport";
import ProfitAndLoss from "./pages/reports/ProfitAndLoss";
import BalanceSheet from "./pages/reports/BalanceSheet";
import StockReport from "./pages/stock/StockReport";
import CustomerPortal from "./pages/portal/CustomerPortal";
import CustomerBillView from "./pages/portal/CustomerBillView";

const STAFF = ["ADMIN", "ACCOUNTANT"];

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Customer portal — CONTACT role */}
            <Route element={<RoleRoute roles={["CONTACT"]} />}>
              <Route path="/portal" element={<CustomerPortal />} />
              <Route path="/portal/bills/:id" element={<CustomerBillView />} />
            </Route>

            {/* Staff-only (ADMIN/ACCOUNTANT) */}
            <Route element={<RoleRoute roles={STAFF} />}>
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/new" element={<ContactForm />} />
              <Route path="/contacts/:id/edit" element={<ContactForm />} />

              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/:id/edit" element={<ProductForm />} />
              <Route path="/products/categories" element={<ProductCategories />} />

              <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="/accounting/journals" element={<Journals />} />
              <Route path="/accounting/journal-entries" element={<JournalEntries />} />
              <Route path="/accounting/journal-entries/new" element={<JournalEntryForm />} />

              <Route path="/purchases/orders" element={<PurchaseOrders />} />
              <Route path="/purchases/orders/new" element={<PurchaseOrderForm />} />
              <Route path="/purchases/bills" element={<VendorBills />} />
              <Route path="/purchases/bills/new" element={<VendorBillForm />} />

              <Route path="/sales/orders" element={<SalesOrders />} />
              <Route path="/sales/orders/new" element={<SalesOrderForm />} />
              <Route path="/sales/invoices" element={<CustomerInvoices />} />
              <Route path="/sales/invoices/new" element={<CustomerInvoiceForm />} />
              <Route path="/sales/invoices/:id" element={<CustomerInvoiceView />} />

              <Route path="/payments" element={<Payments />} />
              <Route path="/payments/new" element={<PaymentForm />} />

              <Route path="/analytics/accounts" element={<AnalyticAccounts />} />
              <Route path="/analytics/budgets" element={<Budgets />} />
              <Route path="/analytics/budgets/new" element={<BudgetForm />} />
              <Route path="/analytics/budgets/:id/report" element={<BudgetReport />} />

              <Route path="/reports/profit-and-loss" element={<ProfitAndLoss />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheet />} />

              <Route path="/stock" element={<StockReport />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
