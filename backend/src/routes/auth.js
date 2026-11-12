const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const {
    email, password,
    // Agency fields (optional – omitted if registering a super-admin via seed)
    name, registrationNumber, phone, address, baseLatitude, baseLongitude,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);

    // Always creates an AGENCY user (super-admin is seeded separately)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: "AGENCY",
        agency: name
          ? {
              create: {
                name, registrationNumber, phone, address,
                baseLatitude: parseFloat(baseLatitude),
                baseLongitude: parseFloat(baseLongitude),
              },
            }
          : undefined,
      },
      include: { agency: true },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      agency: user.agency,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed", details: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { agency: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      agency: user.agency ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const { authenticate } = require("../middleware/auth");
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { agency: true },
  });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
