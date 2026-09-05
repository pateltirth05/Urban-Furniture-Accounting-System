import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../../services/api";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    loginId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "ACCOUNTANT",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!formData.name.trim()) {
    return setError("Full name is required");
  }

  if (!formData.loginId.trim()) {
    return setError("Login ID is required");
  }

  if (!formData.email.trim()) {
    return setError("Email address is required");
  }

  if (formData.password.length < 8) {
    return setError("Password must be at least 8 characters");
  }

  if (formData.password !== formData.confirmPassword) {
    return setError("Passwords do not match");
  }

  setLoading(true);

  try {
   await API.signup({
  name: formData.name.trim(),
  loginId: formData.loginId.trim(),
  email: formData.email.trim(),
  password: formData.password,
  role: formData.role,
  ...(formData.role === "CONTACT" && {
    contact: {
      name: formData.name.trim(),
      email: formData.email.trim(),
      mobile: null,
    },
  }),
});

    navigate("/login");
  } catch (err) {
    setError(
      err.response?.data?.message || "Registration failed"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="authPage">
      <form onSubmit={handleSubmit} className="authForm" style={{ width: 440 }}>
        <div className="authTitle">Create Account</div>
        <p style={{ textAlign: "center", color: "var(--ufTextMuted)", marginTop: -8 }}>
          Join Urban Furniture System
        </p>

        {error && <div className="errorText">{error}</div>}

        <label>
          Full Name
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
          />
        </label>

        <label>
          Login ID
          <input
            type="text"
            name="loginId"
            required
            value={formData.loginId}
            onChange={handleChange}
            placeholder="johndoe"
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
          />
        </label>

        <label>
          Account Role
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="CONTACT">Customer Portal User</option>
          </select>
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            name="confirmPassword"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btnPrimary" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="authFooter">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </form>
    </div>
  );
}
