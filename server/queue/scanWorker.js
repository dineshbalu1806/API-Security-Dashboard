require("dotenv").config();
const { Worker } = require("bullmq");
const Redis = require("ioredis");
const Project = require("../models/Project");
const Scan = require("../models/Scan");
const Finding = require("../models/Finding");
const connectDB = require("../config/db");
const { connection } = require("./scanQueue");
const progressPublisher = new Redis(connection);
const progressChannel = "api-security-scan-progress";
const publishScanState = (scanId, status) => progressPublisher.publish(
  progressChannel,
  JSON.stringify({ type: "state", scanId: scanId.toString(), status })
);

const modules = [
  { name: "BOLA", run: require("../services/scanModules/bola") },
  { name: "Broken Authentication", run: require("../services/scanModules/brokenAuthentication") },
  { name: "Excessive Data Exposure", run: require("../services/scanModules/excessiveDataExposure") },
  { name: "Lack of Resources & Rate Limiting", run: require("../services/scanModules/rateLimiting") },
  { name: "Mass Assignment", run: require("../services/scanModules/massAssignment") },
  { name: "Security Misconfiguration", run: require("../services/scanModules/securityMisconfiguration") },
  { name: "Injection", run: require("../services/scanModules/injection") },
];

const methodNames = new Set(["get", "post", "put", "patch", "delete"]);

const parseEndpoints = (project) => {
  if (Array.isArray(project.manualEndpoints) && project.manualEndpoints.length) {
    return project.manualEndpoints
      .filter((endpoint) => endpoint.path)
      .map((endpoint) => ({
        path: endpoint.path,
        method: (endpoint.method || "GET").toUpperCase(),
        requiresAuth: endpoint.requiresAuth !== false,
      }));
  }

  const paths = project.openApiSpec?.paths || {};
  return Object.entries(paths).flatMap(([path, pathItem]) =>
    Object.entries(pathItem || {})
      .filter(([method, operation]) => methodNames.has(method.toLowerCase()) && operation)
      .map(([method, operation]) => ({
        path,
        method: method.toUpperCase(),
        requiresAuth: !operation.security || operation.security.length > 0,
      }))
  );
};

const updateModule = (scanId, module, status) =>
  Scan.findOneAndUpdate(
    { _id: scanId, "moduleProgress.module": module },
    { $set: { "moduleProgress.$.status": status } },
    { new: true }
  );

const calculateScore = (findings) => {
  const deductions = { Critical: 25, High: 15, Medium: 8, Low: 3 };
  const total = findings.reduce((score, item) => score + (deductions[item.severity] || 0), 0);
  return Math.max(0, Math.round(100 - Math.min(100, total)));
};

const processScan = async (job) => {
  const { scanId } = job.data;
  const scan = await Scan.findById(scanId);
  if (!scan) throw new Error(`Scan ${scanId} not found`);

  const project = await Project.findById(scan.projectId).select("+apiAuth");
  if (!project) throw new Error(`Project ${scan.projectId} not found`);

  await Scan.findByIdAndUpdate(scanId, { status: "running", startedAt: new Date() });
  await publishScanState(scanId, "running");
  const endpoints = parseEndpoints(project);
  const findings = [];

  try {
    for (const module of modules) {
      await updateModule(scanId, module.name, "running");
      await progressPublisher.publish(progressChannel, JSON.stringify({
        scanId: scanId.toString(),
        module: module.name,
        status: "running",
      }));
      try {
        for (const endpoint of endpoints) {
          const result = await module.run({ project, endpoint, scan });
          if (result) findings.push(result);
        }
        await updateModule(scanId, module.name, "completed");
        await progressPublisher.publish(progressChannel, JSON.stringify({
          scanId: scanId.toString(),
          module: module.name,
          status: "completed",
        }));
      } catch (error) {
        await updateModule(scanId, module.name, "failed");
        await progressPublisher.publish(progressChannel, JSON.stringify({
          scanId: scanId.toString(),
          module: module.name,
          status: "failed",
        }));
        throw error;
      }
    }

    if (findings.length) {
      await Finding.insertMany(
        findings.map((item) => ({ ...item, scanId, projectId: project._id }))
      );
    }

    await Scan.findByIdAndUpdate(scanId, {
      status: "completed",
      overallScore: calculateScore(findings),
      completedAt: new Date(),
    });
    await publishScanState(scanId, "completed");
    return { scanId, findingCount: findings.length };
  } catch (error) {
    await Scan.findByIdAndUpdate(scanId, {
      status: "failed",
      errorMessage: error.message,
    });
    await publishScanState(scanId, "failed");
    throw error;
  }
};

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