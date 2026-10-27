require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const scanRoutes = require("./routes/scanRoutes");
const { initScanProgress } = require("./realtime/scanProgress");
require("./queue/scanQueue");

const app = express();
const httpServer = createServer(app);
const scanProgress = initScanProgress(httpServer);

// Core middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" })); // larger limit to accept OpenAPI spec uploads
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Health check
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? "API is ready" : "Database connection is not ready",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/scans", scanRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
};

process.on("SIGINT", async () => {
  await scanProgress.close();
  httpServer.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await scanProgress.close();
  httpServer.close(() => process.exit(0));
});

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start API server", error);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
