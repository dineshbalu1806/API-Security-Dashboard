require("dotenv").config();
const { createServer } = require("http");
const connectDB = require("./config/db");
const app = require("./app");
require("./queue/scanQueue");
const { initScanProgress } = require("./realtime/scanProgress");

const httpServer = createServer(app);
const scanProgress = initScanProgress(httpServer);
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
