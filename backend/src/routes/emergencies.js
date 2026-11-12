const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ── POST /api/emergencies  (AGENCY: create a new emergency request) ──────────
router.post("/", requireRole("AGENCY"), async (req, res) => {
  const { title, description, address, latitude, longitude } = req.body;

  if (!title || !description || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "title, description, address, latitude, longitude are required" });
  }

  if (!req.agency) return res.status(403).json({ error: "No agency linked to your account" });
  if (req.agency.status !== "APPROVED") {
    return res.status(403).json({ error: "Agency must be approved to submit emergency requests" });
  }

  try {
    const emergency = await prisma.emergencyRequest.create({
      data: {
        title,
        description,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        agencyId: req.agency.id,
      },
    });
    res.status(201).json(emergency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create emergency request", details: err.message });
  }
});

// ── GET /api/emergencies  (SUPER_ADMIN: all; AGENCY: own requests) ───────────
router.get("/", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status && { status }),
      ...(req.user.role === "AGENCY" && req.agency ? { agencyId: req.agency.id } : {}),
    };

    const [emergencies, total] = await Promise.all([
      prisma.emergencyRequest.findMany({
        where,
        include: {
          agency: { select: { id: true, name: true, phone: true } },
          responses: { include: { agency: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.emergencyRequest.count({ where }),
    ]);

    res.json({ data: emergencies, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch emergencies" });
  }
});

// ── GET /api/emergencies/:id ─────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: req.params.id },
      include: {
        agency: { select: { id: true, name: true, phone: true, baseLatitude: true, baseLongitude: true } },
        responses: { include: { agency: { select: { id: true, name: true, phone: true } } } },
      },
    });
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });

    // AGENCY users may only view their own requests
    if (req.user.role === "AGENCY" && req.agency?.id !== emergency.agencyId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(emergency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch emergency" });
  }
});

// ── PATCH /api/emergencies/:id/status  (SUPER_ADMIN or owning AGENCY) ────────
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body; // OPEN | IN_PROGRESS | RESOLVED | CANCELLED
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const emergency = await prisma.emergencyRequest.findUnique({ where: { id: req.params.id } });
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });

    if (req.user.role === "AGENCY" && req.agency?.id !== emergency.agencyId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.emergencyRequest.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update emergency status" });
  }
});

// ── POST /api/emergencies/:id/respond  (AGENCY: respond to a request) ────────
router.post("/:id/respond", requireRole("AGENCY"), async (req, res) => {
  const { responseStatus } = req.body; // ACCEPTED | REJECTED | COMPLETED
  if (!["ACCEPTED", "REJECTED", "COMPLETED"].includes(responseStatus)) {
    return res.status(400).json({ error: "Invalid responseStatus value" });
  }

  if (!req.agency) return res.status(403).json({ error: "No agency linked to your account" });

  try {
    const response = await prisma.requestResponse.upsert({
      where: {
        emergencyRequestId_agencyId: {
          emergencyRequestId: req.params.id,
          agencyId: req.agency.id,
        },
      },
      update: { status: responseStatus },
      create: {
        emergencyRequestId: req.params.id,
        agencyId: req.agency.id,
        status: responseStatus,
      },
    });
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record response", details: err.message });
  }
});

// ── DELETE /api/emergencies/:id  (SUPER_ADMIN only) ─────────────────────────
router.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    await prisma.emergencyRequest.delete({ where: { id: req.params.id } });
    res.json({ message: "Emergency request deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete emergency request" });
  }
});

module.exports = router;
