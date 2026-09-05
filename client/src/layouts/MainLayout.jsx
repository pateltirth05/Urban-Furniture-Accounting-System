import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MainLayout() {
  const { user, logout } = useAuth();

  const staffNavItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/contacts", label: "Contacts" },
    { to: "/products", label: "Products Catalog" },
    { to: "/purchases/orders", label: "Purchase Orders" },
    { to: "/purchases/bills", label: "Vendor Bills" },
    { to: "/sales/orders", label: "Sales Orders" },
    { to: "/sales/invoices", label: "Customer Invoices" },
    { to: "/payments", label: "Payments Settlement" },
    { to: "/accounting/chart-of-accounts", label: "Chart of Accounts" },
    { to: "/accounting/journals", label: "Journals" },
    { to: "/accounting/journal-entries", label: "Journal Entries" },
    { to: "/analytics/budgets", label: "Budgets Management" },
    { to: "/reports/profit-and-loss", label: "Profit & Loss" },
    { to: "/reports/balance-sheet", label: "Balance Sheet" },
    { to: "/stock", label: "Inventory Stock" },
  ];

  const portalNavItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/portal", label: "My Invoices Portal" },
  ];

  const navItems = user?.role === "CONTACT" ? portalNavItems : staffNavItems;

  return (
    <div className="appShell">
      <aside className="sideBar">
        <div className="brand">Urban Furniture</div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="navLink">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="mainArea">
        <header className="topHeader">
          <div className="headerTitle">ERP Accounting System</div>
          <div className="userInfo">
            <span style={{ fontWeight: 600 }}>{user?.name}</span>
            <span className="roleBadge">{user?.role}</span>
            <button onClick={logout} className="btnSecondary" style={{ padding: "4px 12px" }}>
              Logout
            </button>
          </div>
        </header>

        <main className="mainContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
