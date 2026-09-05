/**
 * One-off CLI helper: prints a bcrypt hash for a given plaintext password.
 * Usage: node src/utils/hashPassword.js "Admin@12345"
 *
 * Use this to regenerate the ADMIN seed hash in db/seed.sql, or any
 * other password hash you need outside of the normal signup flow.
 */
const bcrypt = require("bcryptjs");

const plain = process.argv[2];

if (!plain) {
  console.error("Usage: node src/utils/hashPassword.js <plaintext-password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 10);
console.log(hash);
