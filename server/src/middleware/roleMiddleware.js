/**
 * Restricts a route to one or more roles.
 * Must run AFTER authMiddleware, since it reads req.user.role.
 *
 * Usage:
 *   router.post('/journal-entries', authMiddleware, roleMiddleware('ADMIN', 'ACCOUNTANT'), controller.create)
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized for this action" });
    }
    next();
  };
}

module.exports = roleMiddleware;
