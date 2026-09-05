import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const registerUser = async ({
  name,
  loginId,
  email,
  password,
  role,
  contactId = null,
}) => {
  const existingUser = await pool.query(
    `SELECT id
     FROM users
     WHERE login_id = $1 OR email = $2`,
    [loginId, email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Login ID or email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users
      (name, login_id, email, password_hash, role, contact_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, login_id, email, role, contact_id`,
    [name, loginId, email, passwordHash, role, contactId]
  );

  return result.rows[0];
};

export const loginUser = async (loginId, password) => {
  const result = await pool.query(
    `SELECT *
     FROM users
     WHERE login_id = $1
       AND is_active = TRUE`,
    [loginId]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  const passwordMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      contactId: user.contact_id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      loginId: user.login_id,
      email: user.email,
      role: user.role,
      contactId: user.contact_id,
    },
  };
};