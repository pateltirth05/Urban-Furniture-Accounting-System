const jwt = require("jsonwebtoken");

/**
 * Verifies the Bearer JWT and populates req.user = { userId, role, contactId }.
 * Backend authorization is authoritative (README #6) — this middleware,
 * plus roleMiddleware, is what actually gates access, not the frontend.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or malformed authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      contactId: payload.contactId ?? null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
