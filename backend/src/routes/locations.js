const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ── POST /api/locations  (AGENCY: publish current GPS location) ───────────────
router.post("/", requireRole("AGENCY"), async (req, res) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "latitude and longitude are required" });
  }

  if (!req.agency) return res.status(403).json({ error: "No agency linked to your account" });

  try {
    const location = await prisma.liveLocation.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        agencyId: req.agency.id,
      },
    });
    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record location", details: err.message });
  }
});

// ── GET /api/locations  (SUPER_ADMIN: latest location per agency) ─────────────
router.get("/", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    // Get the most recent location for every agency
    const agencies = await prisma.agency.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        availability: true,
        baseLatitude: true,
        baseLongitude: true,
        liveLocations: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: { latitude: true, longitude: true, recordedAt: true },
        },
      },
    });

    const result = agencies.map((a) => ({
      agencyId: a.id,
      name: a.name,
      availability: a.availability,
      baseLocation: { latitude: a.baseLatitude, longitude: a.baseLongitude },
      liveLocation: a.liveLocations[0] ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch live locations" });
  }
});

// ── GET /api/locations/:agencyId  (SUPER_ADMIN: history for one agency) ───────
router.get("/:agencyId", requireRole("SUPER_ADMIN"), async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  try {
    const locations = await prisma.liveLocation.findMany({
      where: {
        agencyId: req.params.agencyId,
        ...(from || to
          ? {
              recordedAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: parseInt(limit),
    });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch location history" });
  }
});

// ── GET /api/locations/me/history  (AGENCY: own location history) ─────────────
router.get("/me/history", requireRole("AGENCY"), async (req, res) => {
  if (!req.agency) return res.status(403).json({ error: "No agency found" });
  try {
    const locations = await prisma.liveLocation.findMany({
      where: { agencyId: req.agency.id },
      orderBy: { recordedAt: "desc" },
      take: 50,
    });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your location history" });
  }
});

module.exports = router;
