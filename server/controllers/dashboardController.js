const Project = require("../models/Project");
const Scan = require("../models/Scan");
const Finding = require("../models/Finding");
const { asyncHandler } = require("../middleware/errorHandler");

const scanMethods = new Set(["get", "post", "put", "patch", "delete"]);
const severities = ["Critical", "High", "Medium", "Low"];

const endpointCount = (project) => {
  if (project.manualEndpoints?.length) return project.manualEndpoints.length;
  return Object.values(project.openApiSpec?.paths || {}).reduce(
    (total, path) =>
      total +
      Object.keys(path || {}).filter((method) =>
        scanMethods.has(method.toLowerCase())
      ).length,
    0
  );
};

const getDashboardOverview = asyncHandler(async (req, res) => {
  const [results, projects] = await Promise.all([
    Scan.aggregate([
      { $match: { userId: req.user._id } },
      {
        $facet: {
          metrics: [
            {
              $group: {
                _id: null,
                totalScans: { $sum: 1 },
                completedScans: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                activeScans: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["queued", "running"]] }, 1, 0],
                  },
                },
                failedScans: {
                  $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
                },
                averageScore: {
                  $avg: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "completed"] },
                          { $ne: ["$overallScore", null] },
                        ],
                      },
                      "$overallScore",
                      null,
                    ],
                  },
                },
              },
            },
          ],
          recentScans: [
            { $sort: { createdAt: -1 } },
            { $limit: 6 },
            {
              $lookup: {
                from: Project.collection.name,
                localField: "projectId",
                foreignField: "_id",
                as: "project",
              },
            },
            { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                projectName: { $ifNull: ["$project.name", "API project"] },
                status: 1,
                overallScore: 1,
                createdAt: 1,
                completedAt: 1,
                moduleProgress: 1,
              },
            },
          ],
          scoreTrend: [
            {
              $match: {
                status: "completed",
                overallScore: { $ne: null },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 8 },
            { $sort: { createdAt: 1 } },
            { $project: { _id: 0, createdAt: 1, score: "$overallScore" } },
          ],
          openFindings: [
            {
              $lookup: {
                from: Finding.collection.name,
                localField: "_id",
                foreignField: "scanId",
                as: "finding",
              },
            },
            { $unwind: "$finding" },
            { $match: { "finding.status": "open" } },
            {
              $group: {
                _id: "$finding.severity",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    Project.find({ userId: req.user._id })
      .select("manualEndpoints openApiSpec")
      .lean(),
  ]);

  const overview = results[0] || {};
  const metrics = overview.metrics?.[0] || {
    totalScans: 0,
    completedScans: 0,
    activeScans: 0,
    failedScans: 0,
    averageScore: null,
  };
  const findingCounts = Object.fromEntries(
    severities.map((severity) => [severity, 0])
  );
  for (const finding of overview.openFindings || []) {
    findingCounts[finding._id] = finding.count;
  }

  res.json({
    success: true,
    overview: {
      metrics,
      projects: {
        total: projects.length,
        endpoints: projects.reduce((total, project) => total + endpointCount(project), 0),
      },
      findings: {
        totalOpen: Object.values(findingCounts).reduce((total, count) => total + count, 0),
        bySeverity: findingCounts,
      },
      recentScans: overview.recentScans || [],
      scoreTrend: overview.scoreTrend || [],
    },
  });
});

module.exports = { getDashboardOverview };
