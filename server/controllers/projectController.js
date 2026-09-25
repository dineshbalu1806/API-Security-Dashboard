const Project = require("../models/Project");
const { asyncHandler } = require("../middleware/errorHandler");

// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const { name, apiBaseUrl, openApiSpec, manualEndpoints, description } =
    req.body;

  if (!name || !apiBaseUrl) {
    return res.status(400).json({
      success: false,
      message: "Project name and API base URL are required",
    });
  }

  const project = await Project.create({
    userId: req.user._id,
    name,
    apiBaseUrl,
    openApiSpec: openApiSpec || null,
    manualEndpoints: manualEndpoints || [],
    description,
  });

  res.status(201).json({ success: true, project });
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
