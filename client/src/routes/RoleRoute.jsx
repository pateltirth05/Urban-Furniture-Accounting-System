import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate for routes restricted to specific roles, e.g.:
 *   <Route element={<RoleRoute roles={['ADMIN','ACCOUNTANT']} />}>
 *     <Route path="/accounting/journal-entries" element={<JournalEntries />} />
 *   </Route>
 *
 * UX only — the backend enforces this for real via roleMiddleware.
 */
export default function RoleRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
