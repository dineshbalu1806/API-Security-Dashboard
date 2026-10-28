const Project = require("../models/Project");
const Scan = require("../models/Scan");
const Finding = require("../models/Finding");

const modules = [
  { name: "BOLA", run: require("./scanModules/bola") },
  { name: "Broken Authentication", run: require("./scanModules/brokenAuthentication") },
  { name: "Excessive Data Exposure", run: require("./scanModules/excessiveDataExposure") },
  { name: "Lack of Resources & Rate Limiting", run: require("./scanModules/rateLimiting") },
  { name: "Mass Assignment", run: require("./scanModules/massAssignment") },
  { name: "Security Misconfiguration", run: require("./scanModules/securityMisconfiguration") },
  { name: "Injection", run: require("./scanModules/injection") },
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

const calculateScore = (findings) => {
  const deductions = { Critical: 25, High: 15, Medium: 8, Low: 3 };
  const total = findings.reduce((score, item) => score + (deductions[item.severity] || 0), 0);
  return Math.max(0, Math.round(100 - Math.min(100, total)));
};

const runScan = async ({ scanId, onProgress = async () => {}, maxDurationMs = Infinity }) => {
  const startedAt = Date.now();
  const scan = await Scan.findById(scanId);
  if (!scan) throw new Error(`Scan ${scanId} not found`);

  const project = await Project.findById(scan.projectId).select("+apiAuth");
  if (!project) throw new Error(`Project ${scan.projectId} not found`);

  const publish = (event) => onProgress({ scanId: scanId.toString(), ...event });
  const ensureTimeRemaining = () => {
    if (Date.now() - startedAt >= maxDurationMs) {
      throw new Error("Scan exceeded the Vercel function time limit. Reduce the number of endpoints and try again.");
    }
  };
  const updateModule = (module, status) =>
    Scan.findOneAndUpdate(
      { _id: scanId, "moduleProgress.module": module },
      { $set: { "moduleProgress.$.status": status } },
      { new: true }
    );

  await Scan.findByIdAndUpdate(scanId, { status: "running", startedAt: new Date() });
  await publish({ type: "state", status: "running" });
  const endpoints = parseEndpoints(project);
  const findings = [];

  try {
    for (const module of modules) {
      ensureTimeRemaining();
      await updateModule(module.name, "running");
      await publish({ module: module.name, status: "running" });
      try {
        for (const endpoint of endpoints) {
          ensureTimeRemaining();
          const result = await module.run({ project, endpoint, scan });
          if (result) findings.push(result);
        }
        await updateModule(module.name, "completed");
        await publish({ module: module.name, status: "completed" });
      } catch (error) {
        await updateModule(module.name, "failed");
        await publish({ module: module.name, status: "failed" });
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
    await publish({ type: "state", status: "completed" });
    return { scanId, findingCount: findings.length };
  } catch (error) {
    await Scan.findByIdAndUpdate(scanId, {
      status: "failed",
      errorMessage: error.message,
    });
    await publish({ type: "state", status: "failed" });
    throw error;
  }
};

module.exports = { parseEndpoints, calculateScore, runScan };
