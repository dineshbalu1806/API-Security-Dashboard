const mongoose = require("mongoose");

const ScanSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    // Live progress: which OWASP test modules have run / are running
    moduleProgress: [
      {
        module: String, // e.g. "BOLA", "Broken Auth", "Injection"
        status: {
          type: String,
          enum: ["pending", "running", "completed", "failed"],
          default: "pending",
        },
      },
    ],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    startedAt: Date,
    completedAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scan", ScanSchema);
