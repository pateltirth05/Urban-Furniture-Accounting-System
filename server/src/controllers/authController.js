const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query, withTransaction } = require("../config/db");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public registration. Per README #5/#7: only ACCOUNTANT and CONTACT
 * (customer portal) may self-register. ADMIN must be seeded directly.
 *
 * Body (ACCOUNTANT):
 *   { name, loginId, email, password, role: 'ACCOUNTANT' }
 *
 * Body (CONTACT / customer portal):
 *   { name, loginId, email, password, role: 'CONTACT', contact: { name, email, mobile, ... } }
 *   -> creates a contacts row with type=CUSTOMER, then links users.contact_id
 */
async function register(req, res) {
  const { name, loginId, email, password, role, contact } = req.body;

  // ---- Backend validation (never trust the frontend) ----
  if (!name || !loginId || !email || !password || !role) {
    return res.status(400).json({ message: "name, loginId, email, password and role are required" });
  }
  if (!["ACCOUNTANT", "CONTACT"].includes(role)) {
    return res.status(400).json({ message: "Public registration only supports ACCOUNTANT or CONTACT roles" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (role === "CONTACT" && (!contact || !contact.name || !contact.email)) {
    return res.status(400).json({ message: "contact.name and contact.email are required for CONTACT signup" });
  }

  try {
    const existing = await query(
      "SELECT id FROM users WHERE login_id = $1 OR email = $2",
      [loginId, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "login_id or email already in use" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const user = await withTransaction(async (client) => {
      let contactId = null;

      if (role === "CONTACT") {
        const contactResult = await client.query(
          `INSERT INTO contacts (name, type, email, mobile)
           VALUES ($1, 'CUSTOMER', $2, $3)
           RETURNING id`,
          [contact.name, contact.email, contact.mobile ?? null]
        );
        contactId = contactResult.rows[0].id;
      }

      const userResult = await client.query(
        `INSERT INTO users (name, login_id, email, password_hash, role, contact_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, login_id, email, role, contact_id`,
        [name, loginId, email, passwordHash, role, contactId]
      );

      return userResult.rows[0];
    });

    return res.status(201).json({ user });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ message: "Registration failed" });
  }
}

/**
 * Login by loginId + password. Issues a JWT containing
 * { userId, role, contactId } — the same payload authMiddleware reads.
 */
async function login(req, res) {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ message: "loginId and password are required" });
  }

  try {
    const result = await query(
      `SELECT id, name, login_id, email, password_hash, role, contact_id, is_active
       FROM users WHERE login_id = $1`,
      [loginId]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, contactId: user.contact_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        loginId: user.login_id,
        email: user.email,
        role: user.role,
        contactId: user.contact_id,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

/**
 * Returns the currently authenticated user (based on req.user from authMiddleware).
 */
async function me(req, res) {
  try {
    const result = await query(
      `SELECT id, name, login_id, email, role, contact_id FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("me error", err);
    return res.status(500).json({ message: "Failed to load current user" });
  }
}

module.exports = { register, login, me };
