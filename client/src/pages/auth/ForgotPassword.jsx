import { useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await API.forgotPassword({ email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <form onSubmit={handleSubmit} className="authForm">
        <div className="authTitle">Forgot Password</div>
        <p style={{ textAlign: "center", color: "var(--ufTextMuted)", marginTop: -8 }}>
          Enter your registered email
        </p>

        {error && <div className="errorText">{error}</div>}
        {message && <div style={{ color: "var(--ufSuccess)", fontSize: 14 }}>{message}</div>}

        <label>
          Email Address
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </label>

        <button type="submit" className="btnPrimary" disabled={loading}>
          {loading ? "Sending..." : "Reset Password"}
        </button>

        <div className="authFooter">
          Remembered your password? <Link to="/login">Sign In</Link>
        </div>
      </form>
    </div>
  );
}
