import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach the JWT to every request, if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("uf_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("uf_token");
      localStorage.removeItem("uf_user");
    }
    return Promise.reject(error);
  }
);

// Centralized API functions
export const API = {
  // Auth
  login: (data) => api.post("/auth/login", data),
  signup: (data) => api.post("/auth/register", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  me: () => api.get("/auth/me"),

  // Dashboard
  getDashboardSummary: () => api.get("/reports/dashboard-summary"),

  // Contacts
  getContacts: (params) => api.get("/contacts", { params }),
  getContact: (id) => api.get(`/contacts/${id}`),
  createContact: (data) => api.post("/contacts", data),
  updateContact: (id, data) => api.put(`/contacts/${id}`, data),
  archiveContact: (id) => api.delete(`/contacts/${id}`),

  // Product Categories
  getProductCategories: () => api.get("/product-categories"),
  createProductCategory: (data) => api.post("/product-categories", data),

  // Products
  getProducts: (params) => api.get("/products", { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post("/products", data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  archiveProduct: (id) => api.delete(`/products/${id}`),

  // Chart of Accounts
  getAccounts: (params) => api.get("/chart-of-accounts", { params }),
  createAccount: (data) => api.post("/chart-of-accounts", data),

  // Journals
  getJournals: () => api.get("/journals"),
  createJournal: (data) => api.post("/journals", data),

  // Journal Entries
  getJournalEntries: (params) => api.get("/journal-entries", { params }),
  getJournalEntry: (id) => api.get(`/journal-entries/${id}`),
  createJournalEntry: (data) => api.post("/journal-entries", data),
  postJournalEntry: (id) => api.post(`/journal-entries/${id}/post`),
  cancelJournalEntry: (id) => api.post(`/journal-entries/${id}/cancel`),

  // Purchase Orders
  getPurchaseOrders: (params) => api.get("/purchase-orders", { params }),
  getPurchaseOrder: (id) => api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => api.post("/purchase-orders", data),
  confirmPurchaseOrder: (id) => api.post(`/purchase-orders/${id}/confirm`),
  cancelPurchaseOrder: (id) => api.post(`/purchase-orders/${id}/cancel`),

  // Vendor Bills
  getVendorBills: (params) => api.get("/vendor-bills", { params }),
  getVendorBill: (id) => api.get(`/vendor-bills/${id}`),
  createVendorBill: (data) => api.post("/vendor-bills", data),
  confirmVendorBill: (id) => api.post(`/vendor-bills/${id}/confirm`),
  cancelVendorBill: (id) => api.post(`/vendor-bills/${id}/cancel`),

  // Sales Orders
  getSalesOrders: (params) => api.get("/sales-orders", { params }),
  getSalesOrder: (id) => api.get(`/sales-orders/${id}`),
  createSalesOrder: (data) => api.post("/sales-orders", data),
  confirmSalesOrder: (id) => api.post(`/sales-orders/${id}/confirm`),
  cancelSalesOrder: (id) => api.post(`/sales-orders/${id}/cancel`),

  // Customer Invoices
  getCustomerInvoices: (params) => api.get("/customer-invoices", { params }),
  getCustomerInvoice: (id) => api.get(`/customer-invoices/${id}`),
  createCustomerInvoice: (data) => api.post("/customer-invoices", data),
  confirmCustomerInvoice: (id) => api.post(`/customer-invoices/${id}/confirm`),
  cancelCustomerInvoice: (id) => api.post(`/customer-invoices/${id}/cancel`),

  // Payments
  getPayments: (params) => api.get("/payments", { params }),
  createPayment: (data) => api.post("/payments", data),

  // Analytics & Budgets
  getAnalyticAccounts: () => api.get("/analytic-accounts"),
  createAnalyticAccount: (data) => api.post("/analytic-accounts", data),
  getBudgets: () => api.get("/budgets"),
  createBudget: (data) => api.post("/budgets", data),
  confirmBudget: (id) => api.post(`/budgets/${id}/confirm`),
  getBudgetReport: (id) => api.get(`/budgets/${id}/report`),

  // Reports
  getProfitAndLoss: (params) => api.get("/reports/profit-and-loss", { params }),
  getBalanceSheet: (params) => api.get("/reports/balance-sheet", { params }),

  // Stock
  getStockReport: (params) => api.get("/stock/report", { params }),
  getStockMovements: (params) => api.get("/stock/movements", { params }),

  // Exports
  // Exports
exportCsvUrl: (entity) => `/api/export/csv/${entity}`,

exportInvoicePdfUrl: (id) =>
  `/api/export/invoices/${id}/pdf`,

downloadInvoicePdf: (id) =>
  api.get(`/export/invoices/${id}/pdf`, {
    responseType: "blob",
  }),
};

export default api;
