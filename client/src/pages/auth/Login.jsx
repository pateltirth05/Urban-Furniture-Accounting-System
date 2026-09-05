import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginId, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <form onSubmit={handleSubmit} className="authForm">
        <div className="authTitle">Urban Furniture</div>
        <p style={{ textAlign: "center", color: "var(--ufTextMuted)", marginTop: -8 }}>
          Accounting System Login
        </p>

        {error && <div className="errorText">{error}</div>}

        <label>
          Login ID / Username
          <input
            type="text"
            required
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="admin / accountant / customer1"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btnPrimary" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="authFooter">
          Don't have an account? <Link to="/signup">Register</Link> |{" "}
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
      </form>
    </div>
  );
}
