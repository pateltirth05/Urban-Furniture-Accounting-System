const { query } = require("../config/db");
const bcrypt = require("bcryptjs");

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const userRes = await query("SELECT id, email FROM users WHERE email = $1 AND is_active = TRUE", [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }
    // Return mock reset link/success for demo
    return res.json({ message: "Password reset instructions have been sent to your email." });
  } catch (err) {
    console.error("forgotPassword error", err);
    return res.status(500).json({ message: "Failed to process forgot password request" });
  }
}

async function resetPassword(req, res) {
  const { login_id, new_password } = req.body;
  if (!login_id || !new_password || new_password.length < 6) {
    return res.status(400).json({ message: "login_id and new_password (min 6 chars) are required" });
  }

  try {
    const hash = await bcrypt.hash(new_password, 10);
    const result = await query(
      "UPDATE users SET password_hash = $1 WHERE login_id = $2 RETURNING id",
      [hash, login_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("resetPassword error", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
}

module.exports = { forgotPassword, resetPassword };
