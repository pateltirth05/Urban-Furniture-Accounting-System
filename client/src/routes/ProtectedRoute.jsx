import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate for any route that requires a logged-in user.
 * Note: this only controls what's shown in the UI. The backend's
 * authMiddleware/roleMiddleware is the real security boundary.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
