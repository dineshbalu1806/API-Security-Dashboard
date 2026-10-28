const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { errorHandler } = require("./middleware/errorHandler");
const getClientOrigins = require("./config/clientOrigins");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const scanRoutes = require("./routes/scanRoutes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: getClientOrigins(),
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? "API is ready" : "Database connection is not ready",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/scans", scanRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
