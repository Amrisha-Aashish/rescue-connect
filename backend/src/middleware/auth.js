require("dotenv/config");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches `req.user` (full DB row) and `req.agency` (if role is AGENCY).
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;

    if (user.role === "AGENCY") {
      req.agency = await prisma.agency.findUnique({ where: { userId: user.id } });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Role-guard factory.  Usage: requireRole("SUPER_ADMIN")
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: insufficient permissions" });
  }
  next();
};

module.exports = { authenticate, requireRole };
