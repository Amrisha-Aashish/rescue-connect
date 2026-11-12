const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ── GET /api/agencies  (SUPER_ADMIN: list all, AGENCY: get own) ──────────────
router.get("/", async (req, res) => {
  try {
    if (req.user.role === "SUPER_ADMIN") {
      const agencies = await prisma.agency.findMany({
        include: { user: { select: { email: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.json(agencies);
    }

    // AGENCY role — return their own agency
    if (!req.agency) return res.status(404).json({ error: "Agency not found" });
    return res.json(req.agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch agencies" });
  }
});

// ── GET /api/agencies/:id  (SUPER_ADMIN only) ────────────────────────────────
router.get("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true } },
        emergencyRequests: { orderBy: { createdAt: "desc" }, take: 10 },
        liveLocations: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    });
    if (!agency) return res.status(404).json({ error: "Agency not found" });
    res.json(agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch agency" });
  }
});

// ── PATCH /api/agencies/:id/status  (SUPER_ADMIN: approve/reject) ───────────
router.patch("/:id/status", requireRole("SUPER_ADMIN"), async (req, res) => {
  const { status } = req.body; // APPROVED | REJECTED | PENDING
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const agency = await prisma.agency.update({
      where: { id: req.params.id },
      data: {
        status,
        approvedAt: status === "APPROVED" ? new Date() : null,
      },
    });
    res.json(agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update agency status" });
  }
});

// ── PATCH /api/agencies/me/availability  (AGENCY: set own availability) ─────
router.patch("/me/availability", requireRole("AGENCY"), async (req, res) => {
  const { availability } = req.body; // AVAILABLE | BUSY | UNAVAILABLE
  if (!["AVAILABLE", "BUSY", "UNAVAILABLE"].includes(availability)) {
    return res.status(400).json({ error: "Invalid availability value" });
  }

  try {
    const agency = await prisma.agency.update({
      where: { userId: req.user.id },
      data: { availability },
    });
    res.json(agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// ── PUT /api/agencies/me  (AGENCY: update own profile) ──────────────────────
router.put("/me", requireRole("AGENCY"), async (req, res) => {
  const { name, phone, address, baseLatitude, baseLongitude } = req.body;
  try {
    const agency = await prisma.agency.update({
      where: { userId: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(baseLatitude !== undefined && { baseLatitude: parseFloat(baseLatitude) }),
        ...(baseLongitude !== undefined && { baseLongitude: parseFloat(baseLongitude) }),
      },
    });
    res.json(agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update agency profile" });
  }
});

// ── DELETE /api/agencies/:id  (SUPER_ADMIN only) ────────────────────────────
router.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    await prisma.agency.delete({ where: { id: req.params.id } });
    res.json({ message: "Agency deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete agency" });
  }
});

module.exports = router;
