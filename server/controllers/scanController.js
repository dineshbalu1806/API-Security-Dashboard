const mongoose = require("mongoose");
const Project = require("../models/Project");
const Scan = require("../models/Scan");
const Finding = require("../models/Finding");
const { scanQueue } = require("../queue/scanQueue");
const { asyncHandler } = require("../middleware/errorHandler");
const { generateRecommendation } = require("../services/aiRecommendation");
const { generateScanReport } = require("../services/reportGenerator");

const modules = [
  "BOLA",
  "Broken Authentication",
  "Excessive Data Exposure",
  "Lack of Resources & Rate Limiting",
  "Mass Assignment",
  "Security Misconfiguration",
  "Injection",
];

const createScan = asyncHandler(async (req, res) => {
  const { projectId } = req.body;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({ success: false, message: "Valid projectId is required" });
  }

  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const scan = await Scan.create({
    projectId: project._id,
    userId: req.user._id,
    status: "queued",
    moduleProgress: modules.map((module) => ({ module, status: "pending" })),
  });

  try {
    await scanQueue.add("scan-project", { scanId: scan._id.toString() }, { jobId: scan._id.toString() });
  } catch (error) {
    await Scan.findByIdAndUpdate(scan._id, {
      status: "failed",
      errorMessage: "Unable to queue scan",
    });
    throw error;
  }

  res.status(202).json({ success: true, scanId: scan._id, scan });
});

const getScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });

  const findings = await Finding.find({ scanId: scan._id }).sort({ severity: 1, createdAt: 1 });
  res.json({ success: true, scan: { ...scan.toObject(), findings } });
});

const getScans = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.projectId) {
    if (!mongoose.isValidObjectId(req.query.projectId)) {
      return res.status(400).json({ success: false, message: "Invalid projectId" });
    }
    filter.projectId = req.query.projectId;
  }

  const scans = await Scan.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: scans.length, scans });
});

const generateRecommendations = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
  if (scan.status !== "completed") {
    return res.status(409).json({ success: false, message: "Recommendations require a completed scan" });
  }

  const findings = await Finding.find({ scanId: scan._id }).sort({ createdAt: 1 });
  const results = [];
  const failures = [];
  const concurrency = 3;
  for (let index = 0; index < findings.length; index += concurrency) {
    const batch = findings.slice(index, index + concurrency);
    const settled = await Promise.allSettled(batch.map((finding) => generateRecommendation(finding)));
    settled.forEach((result, batchIndex) => {
      if (result.status === "fulfilled") results.push(result.value._id);
      else failures.push({ findingId: batch[batchIndex]._id, message: result.reason.message });
    });
  }

  res.json({
    success: true,
    generated: results.length,
    failed: failures.length,
    failures,
    message: failures.length ? "Some recommendations could not be generated" : "Recommendations generated",
  });
});

const downloadReport = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
  if (scan.status !== "completed") {
    return res.status(409).json({ success: false, message: "Reports require a completed scan" });
  }

  const project = await Project.findOne({ _id: scan.projectId, userId: req.user._id });
  const findings = await Finding.find({ scanId: scan._id }).sort({ severity: 1, createdAt: 1 });
  const pdf = await generateScanReport({ project, scan, findings });
  const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "api-security";
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName}-scan-report.pdf"`,
    "Content-Length": pdf.length,
  });
  res.send(pdf);
});

module.exports = { createScan, getScan, getScans, generateRecommendations, downloadReport };