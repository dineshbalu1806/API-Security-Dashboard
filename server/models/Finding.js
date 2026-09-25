const mongoose = require("mongoose");

const FindingSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    owaspCategory: {
      type: String,
      required: true,
      enum: [
        "Broken Object Level Authorization",
        "Broken Authentication",
        "Excessive Data Exposure",
        "Lack of Resources & Rate Limiting",
        "Broken Function Level Authorization",
        "Mass Assignment",
        "Security Misconfiguration",
        "Injection",
        "Improper Assets Management",
        "Insufficient Logging & Monitoring",
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ["Critical", "High", "Medium", "Low"],
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: "GET",
    },
    description: {
      type: String,
      required: true,
    },
    evidence: {
      type: String, // raw request/response snippet or reasoning, optional
    },
    aiRecommendation: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "resolved", "ignored"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Finding", FindingSchema);
