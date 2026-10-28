require("dotenv").config();
const { Worker } = require("bullmq");
const Redis = require("ioredis");
const connectDB = require("../config/db");
const { connection } = require("./scanQueue");
const { runScan, parseEndpoints, calculateScore } = require("../services/runScan");

const progressPublisher = new Redis(connection);
const progressChannel = "api-security-scan-progress";

const processScan = (job) => runScan({
  scanId: job.data.scanId,
  onProgress: (event) => progressPublisher.publish(progressChannel, JSON.stringify(event)),
});

let worker;

const startWorker = async () => {
  await connectDB();
  worker = new Worker("api-security-scans", processScan, { connection, concurrency: 1 });
  worker.on("completed", (job, result) => console.log(`Scan ${job.data.scanId} completed`, result));
  worker.on("failed", (job, error) => console.error(`Scan ${job?.data?.scanId || "unknown"} failed`, error));
  return worker;
};

const shutdown = async () => {
  if (worker) await worker.close();
  await progressPublisher.quit();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (require.main === module) {
  startWorker().catch((error) => {
    console.error("Unable to start scan worker", error);
    process.exit(1);
  });
}

module.exports = { parseEndpoints, calculateScore, processScan, startWorker };
