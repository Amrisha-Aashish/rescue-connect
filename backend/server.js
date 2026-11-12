require("dotenv/config");
const express = require("express");
const cors = require("cors");
const prisma = require("./src/config/prisma");

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes       = require("./src/routes/auth");
const agencyRoutes     = require("./src/routes/agencies");
const emergencyRoutes  = require("./src/routes/emergencies");
const locationRoutes   = require("./src/routes/locations");

const app = express();
const PORT = process.env.PORT || 5001;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/agencies",    agencyRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/locations",   locationRoutes);

// ── Health / root ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Welcome to Rescue Connect API",
    status: "Server is running",
    version: "1.0.0",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "healthy", database: "connected" });
  } catch {
    res.status(500).json({ status: "unhealthy", database: "disconnected" });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Rescue Connect server running on http://localhost:${PORT}`);
});
