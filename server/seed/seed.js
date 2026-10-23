require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Project = require("../models/Project");
const Scan = require("../models/Scan");
const Finding = require("../models/Finding");

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password123";

const severityWeight = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3,
};

const demoOpenApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Demo Retail API",
    version: "1.0.0",
  },
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
  },
  paths: {
    "/api/v1/users/{userId}": {
      get: {
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "User profile" } },
      },
      patch: {
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Updated profile" } },
      },
    },
    "/api/v1/orders": {
      get: {
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List orders" } },
      },
      post: {
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Create order" } },
      },
    },
    "/api/v1/orders/{orderId}/cancel": {
      post: {
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Cancelled order" } },
      },
    },
    "/api/v1/payments": {
      post: {
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Process payment" } },
      },
    },
    "/api/v1/admin/audit": {
      get: {
        responses: { "200": { description: "Audit export" } },
      },
    },
  },
};

const demoFindings = [
  {
    owaspCategory: "Broken Object Level Authorization",
    severity: "Critical",
    endpoint: "/api/v1/users/{userId}",
    method: "GET",
    description: "The user ID from the URL is trusted without checking whether the requester owns that resource.",
    evidence: "GET /api/v1/users/42 returned another customer profile when called by a low-privilege user.",
    aiRecommendation: "Enforce authorization checks on every request by verifying the resource owner against the authenticated user and rejecting mismatches with a 403 response.",
    status: "open",
  },
  {
    owaspCategory: "Broken Authentication",
    severity: "High",
    endpoint: "/api/v1/orders",
    method: "POST",
    description: "Session tokens are reusable and do not rotate after login or privilege changes.",
    evidence: "The API accepted a stale JWT after a password reset and role change event.",
    aiRecommendation: "Rotate tokens on privilege changes, enforce short-lived JWTs, and add session invalidation for password resets and logout events.",
    status: "open",
  },
  {
    owaspCategory: "Excessive Data Exposure",
    severity: "High",
    endpoint: "/api/v1/orders",
    method: "GET",
    description: "The order listing endpoint exposes internal identifiers, card metadata, and address fragments to every caller.",
    evidence: "Response body included customer_id, billing_hash, and full shipping address in the default response.",
    aiRecommendation: "Serialize only the minimum fields required by the client and strip internal IDs, payment data, and sensitive profile details from list responses.",
    status: "open",
  },
  {
    owaspCategory: "Lack of Resources & Rate Limiting",
    severity: "High",
    endpoint: "/api/v1/payments",
    method: "POST",
    description: "The payment endpoint does not enforce limits on retries or burst submit attempts.",
    evidence: "A single client could issue hundreds of payment attempts in under a minute without throttling.",
    aiRecommendation: "Apply rate limiting and retry budgets per user and IP, and slow down abuse patterns before the downstream payment provider is hit.",
    status: "open",
  },
  {
    owaspCategory: "Mass Assignment",
    severity: "Medium",
    endpoint: "/api/v1/users/{userId}",
    method: "PATCH",
    description: "The profile update request accepts sensitive fields such as isAdmin, role, and billing plan without a whitelist.",
    evidence: "The request payload included role: admin and isAdmin: true while the client only intended to change the display name.",
    aiRecommendation: "Allow only a strict allowlist of mutable fields and reject unexpected keys before writing to the database.",
    status: "open",
  },
  {
    owaspCategory: "Security Misconfiguration",
    severity: "Medium",
    endpoint: "/api/v1/admin/audit",
    method: "GET",
    description: "The admin audit route is publicly reachable and reveals internal operational data without requiring elevated access.",
    evidence: "A non-admin caller received the full audit summary from the admin export endpoint.",
    aiRecommendation: "Restrict the route behind a dedicated admin permission check and disable debug headers and verbose error responses in production.",
    status: "open",
  },
  {
    owaspCategory: "Injection",
    severity: "Critical",
    endpoint: "/api/v1/orders",
    method: "POST",
    description: "Order creation input is concatenated into a database query without parameterization.",
    evidence: "Customer-supplied order notes were interpolated directly into a SQL-like query string used by the backend.",
    aiRecommendation: "Use parameterized queries or ORM-safe input handling and reject malformed payloads before they reach persistence layers.",
    status: "open",
  },
  {
    owaspCategory: "Broken Object Level Authorization",
    severity: "High",
    endpoint: "/api/v1/orders/{orderId}/cancel",
    method: "POST",
    description: "Order cancellation allows any authenticated user to cancel another customer's order if they know the ID.",
    evidence: "A low-privilege user cancelled a different account's order by guessing the orderId.",
    aiRecommendation: "Bind cancellation actions to the user or tenant who owns the order and require role checks for any destructive action.",
    status: "open",
  },
  {
    owaspCategory: "Excessive Data Exposure",
    severity: "Medium",
    endpoint: "/api/v1/users/{userId}",
    method: "GET",
    description: "The profile endpoint returns internal account metadata that is not needed by the UI.",
    evidence: "The response included last_login_ip, mfa_backup_codes, and shipping preferences in a public profile payload.",
    aiRecommendation: "Use a dedicated DTO for public profile responses and hide internal security metadata from all non-admin consumers.",
    status: "open",
  },
  {
    owaspCategory: "Broken Authentication",
    severity: "Medium",
    endpoint: "/api/v1/orders",
    method: "GET",
    description: "The API does not enforce reauthentication for sensitive actions after long-lived sessions remain active.",
    evidence: "A session remained valid for 30 days without re-checking MFA or password recency.",
    aiRecommendation: "Require periodic reauthentication for privileged workflows and add step-up auth for payment and administrative actions.",
    status: "open",
  },
  {
    owaspCategory: "Security Misconfiguration",
    severity: "Low",
    endpoint: "/api/v1/payments",
    method: "POST",
    description: "The payment response includes stack traces and implementation details in error payloads.",
    evidence: "A 400 response returned language-specific exception messages and library names to clients.",
    aiRecommendation: "Replace detailed exceptions with generic error payloads and disable verbose stack traces in all environment tiers except local debug.",
    status: "open",
  },
  {
    owaspCategory: "Injection",
    severity: "High",
    endpoint: "/api/v1/users/{userId}",
    method: "PATCH",
    description: "A user-controlled field is passed into a template or query engine without sanitization.",
    evidence: "The displayName field was used in a templated message with unescaped user content.",
    aiRecommendation: "Validate input against a strict schema and encode output before putting user content into templates or raw query strings.",
    status: "open",
  },
  {
    owaspCategory: "Mass Assignment",
    severity: "Low",
    endpoint: "/api/v1/orders",
    method: "POST",
    description: "The order creation endpoint accepts internal fields such as status, createdBy, and invoiceId from the client.",
    evidence: "The request body allowed client-supplied state transitions and internal invoice references.",
    aiRecommendation: "Strip server-owned attributes from client payloads and treat all mutable state as server-calculated rather than client-controlled.",
    status: "open",
  },
  {
    owaspCategory: "Lack of Resources & Rate Limiting",
    severity: "Low",
    endpoint: "/api/v1/admin/audit",
    method: "GET",
    description: "The export endpoint allows unlimited download requests without request quotas or concurrency limits.",
    evidence: "Repeated audit export requests consumed large data volumes and slowed the API under load.",
    aiRecommendation: "Add request quotas, selective caching, and export-size constraints for large results to prevent resource exhaustion.",
    status: "open",
  },
  {
    owaspCategory: "Broken Authentication",
    severity: "Low",
    endpoint: "/api/v1/users/{userId}",
    method: "PATCH",
    description: "Password reset tokens remain valid for too long and are not bound to a single browser context.",
    evidence: "A reset token continued to work after the original session had been closed and a new browser session started.",
    aiRecommendation: "Reduce token lifetime, bind reset tokens to the originating device or session, and invalidate older tokens upon use.",
    status: "open",
  },
];

const moduleProgress = [
  { module: "BOLA", status: "completed" },
  { module: "Broken Authentication", status: "completed" },
  { module: "Excessive Data Exposure", status: "completed" },
  { module: "Lack of Resources & Rate Limiting", status: "completed" },
  { module: "Mass Assignment", status: "completed" },
  { module: "Security Misconfiguration", status: "completed" },
  { module: "Injection", status: "completed" },
];

const calculateOverallScore = (findings) => {
  const deductions = findings.reduce((total, finding) => total + (severityWeight[finding.severity] || 0), 0);
  return Math.max(0, Math.round(100 - Math.min(100, deductions)));
};

const seedDemoData = async () => {
  await connectDB();

  const existingUser = await User.findOne({ email: DEMO_EMAIL }).lean();
  if (existingUser) {
    const userProjects = await Project.find({ userId: existingUser._id }).select("_id");
    const projectIds = userProjects.map((project) => project._id);
    await Finding.deleteMany({ projectId: { $in: projectIds } });
    await Scan.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({
    name: "Demo User",
    email: DEMO_EMAIL,
    passwordHash,
    role: "member",
  });

  const project = await Project.create({
    userId: user._id,
    name: "Demo Retail API",
    apiBaseUrl: "https://demo-api.example.com",
    description: "Sample commerce API used to demonstrate the security dashboard.",
    openApiSpec: demoOpenApiSpec,
  });

  const scan = await Scan.create({
    projectId: project._id,
    userId: user._id,
    status: "completed",
    moduleProgress,
    overallScore: 44,
    startedAt: new Date(Date.now() - 1000 * 60 * 20),
    completedAt: new Date(),
  });

  const seededFindings = demoFindings.map((finding) => ({
    ...finding,
    scanId: scan._id,
    projectId: project._id,
    method: finding.method || "GET",
  }));

  await Finding.insertMany(seededFindings);
  const persistedFindingCount = await Finding.countDocuments({ scanId: scan._id });
  const finalScore = calculateOverallScore(seededFindings);

  await Scan.findByIdAndUpdate(scan._id, { overallScore: finalScore, moduleProgress });

  console.log(`Demo seed complete: user=${DEMO_EMAIL}, project=${project.name}, scanId=${scan._id}, findings=${persistedFindingCount}, score=${finalScore}`);
  await mongoose.disconnect();
  process.exit(0);
};

seedDemoData().catch((error) => {
  console.error("Unable to seed demo data", error);
  process.exit(1);
});
