const express = require("express");
const cors = require("cors");
const prisma = require("./src/config/prisma");

const app = express();
const PORT = process.env.PORT || 5001;;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to Rescue Connect API",
        status: "Server is running"
    });
});

// Database health check
app.get("/api/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: "healthy",
            database: "connected"
        });
    } catch (error) {
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Rescue Connect server running on http://localhost:${PORT}`);
});
