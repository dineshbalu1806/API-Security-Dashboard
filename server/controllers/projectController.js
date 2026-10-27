const Project = require("../models/Project");
const { asyncHandler } = require("../middleware/errorHandler");
const { encryptCredential } = require("../services/credentialVault");

const validHeaderName = (value) =>
  typeof value === "string" && /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/.test(value);
const scanMethods = new Set(["get", "post", "put", "patch", "delete"]);

// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      success: false,
      message: "Project details are required",
    });
  }

  const {
    name,
    apiBaseUrl,
    openApiSpec,
    manualEndpoints,
    description,
    authHeaderName,
    authHeaderValue,
    authorizationConfirmed,
  } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof apiBaseUrl !== "string" ||
    !apiBaseUrl.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Project name and API base URL are required",
    });
  }

  if (authorizationConfirmed !== true) {
    return res.status(400).json({
      success: false,
      message: "Confirm that you are authorized to test this API",
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    return res.status(400).json({
      success: false,
      message: "A valid API base URL is required",
    });
  }
  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    apiBaseUrl.length > 2048 ||
    (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:")
  ) {
    return res.status(400).json({
      success: false,
      message: "Use an HTTP(S) URL without embedded credentials; production targets must use HTTPS",
    });
  }

  const hasAuthHeaderName = authHeaderName !== undefined && authHeaderName !== "";
  const hasAuthHeaderValue = authHeaderValue !== undefined && authHeaderValue !== "";
  if (hasAuthHeaderName !== hasAuthHeaderValue) {
    return res.status(400).json({
      success: false,
      message: "Provide both an authentication header name and value",
    });
  }
  if (
    hasAuthHeaderName &&
    (!validHeaderName(authHeaderName) ||
      typeof authHeaderValue !== "string" ||
      authHeaderValue.length > 4096 ||
      /[\r\n]/.test(authHeaderValue))
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid authentication header and a value under 4096 characters",
    });
  }
  if (
    manualEndpoints !== undefined &&
    (!Array.isArray(manualEndpoints) ||
      manualEndpoints.length > 500 ||
      manualEndpoints.some((endpoint) =>
        !endpoint ||
        typeof endpoint.path !== "string" ||
        !endpoint.path.trim() ||
        endpoint.path.length > 2048 ||
        !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(
          String(endpoint.method || "GET").toUpperCase()
        )
      ))
  ) {
    return res.status(400).json({
      success: false,
      message: "Manual endpoints must be an array of up to 500 valid endpoint paths and methods",
    });
  }
  if (
    openApiSpec !== undefined &&
    (!openApiSpec ||
      typeof openApiSpec !== "object" ||
      Array.isArray(openApiSpec) ||
      (openApiSpec.paths !== undefined &&
        (!openApiSpec.paths || typeof openApiSpec.paths !== "object" || Array.isArray(openApiSpec.paths))))
  ) {
    return res.status(400).json({
      success: false,
      message: "OpenAPI spec must be a JSON object with a paths object",
    });
  }
  const openApiPaths = openApiSpec?.paths || {};
  const openApiEndpointCount = Object.values(openApiPaths).reduce(
    (count, pathItem) =>
      count + Object.keys(pathItem || {}).filter((method) =>
        scanMethods.has(method.toLowerCase())
      ).length,
    0
  );
  if (openApiEndpointCount > 500) {
    return res.status(400).json({
      success: false,
      message: "OpenAPI specs can include at most 500 scannable operations",
    });
  }
  if (
    !(manualEndpoints?.length) &&
    !openApiEndpointCount
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide OpenAPI paths or at least one manual endpoint",
    });
  }

  const project = await Project.create({
    userId: req.user._id,
    name,
    apiBaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    openApiSpec: openApiSpec || null,
    manualEndpoints: (manualEndpoints || []).map((endpoint) => ({
      ...endpoint,
      method: String(endpoint.method || "GET").toUpperCase(),
    })),
    description,
    authorizedAt: new Date(),
    ...(hasAuthHeaderName
      ? { apiAuth: { headerName: authHeaderName, ...encryptCredential(authHeaderValue) } }
      : {}),
  });

  const publicProject = project.toObject();
  delete publicProject.apiAuth;
  res.status(201).json({ success: true, project: publicProject });
});

// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });

  res.status(200).json({ success: true, count: projects.length, projects });
});

// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  res.status(200).json({ success: true, project });
});

// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  res.status(200).json({ success: true, message: "Project deleted" });
});

module.exports = { createProject, getProjects, getProjectById, deleteProject };
