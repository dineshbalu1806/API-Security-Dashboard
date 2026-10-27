const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 150,
    },
    apiBaseUrl: {
      type: String,
      required: [true, "API base URL is required"],
      trim: true,
    },
    apiAuth: {
      type: {
        headerName: { type: String, required: true },
        iv: { type: String, required: true },
        encryptedValue: { type: String, required: true },
        authTag: { type: String, required: true },
      },
      default: undefined,
      select: false,
    },
    authorizedAt: {
      type: Date,
      required: true,
    },
    // Raw OpenAPI/Swagger spec (JSON) OR a manually pasted endpoint list.
    openApiSpec: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    manualEndpoints: [
      {
        path: String,
        method: {
          type: String,
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        },
        requiresAuth: { type: Boolean, default: true },
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
