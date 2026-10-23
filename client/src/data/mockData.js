export const mockFindings = [
  { id: "f1", owaspCategory: "Broken Object Level Authorization", severity: "Critical", endpoint: "/v1/users/{id}", method: "GET", status: "open", description: "Object identifiers can be accessed without verifying resource ownership.", evidence: "A user-scoped resource returned a successful response without a matching ownership check.", aiRecommendation: "Validate the authenticated user's relationship to the requested resource before returning it." },
  { id: "f2", owaspCategory: "Excessive Data Exposure", severity: "High", endpoint: "/v1/accounts/profile", method: "GET", status: "open", description: "The response contains fields that are not required by the client.", evidence: "Sensitive profile properties were present in the response body.", aiRecommendation: "Create an explicit response DTO and omit secrets, internal IDs, and private metadata." },
  { id: "f3", owaspCategory: "Security Misconfiguration", severity: "Medium", endpoint: "/health", method: "GET", status: "open", description: "Several recommended response security headers are absent.", evidence: "Missing X-Content-Type-Options and Content-Security-Policy headers.", aiRecommendation: "Configure Helmet with an explicit production policy and review headers at the edge." },
  { id: "f4", owaspCategory: "Lack of Resources & Rate Limiting", severity: "Medium", endpoint: "/v1/auth/login", method: "POST", status: "open", description: "Repeated requests were accepted without an observable throttle response.", evidence: "3 of 3 consecutive probes returned success.", aiRecommendation: "Apply a distributed rate limiter to authentication and other expensive operations." },
  { id: "f5", owaspCategory: "Injection", severity: "Low", endpoint: "/v1/search", method: "GET", status: "open", description: "Input handling should be reviewed for safe query construction.", evidence: "The safe quote probe reached the query path.", aiRecommendation: "Use schema validation and parameterized database queries for all search inputs." },
];

export const mockScans = [
  { id: "scan-2048", project: "Commerce API", status: "completed", score: 78, date: "Today, 09:42", findings: mockFindings },
  { id: "scan-2047", project: "Commerce API", status: "completed", score: 71, date: "Sep 18, 14:10", findings: [] },
  { id: "scan-2046", project: "Partner Gateway", status: "completed", score: 91, date: "Sep 11, 11:28", findings: [] },
];

export const trendData = [{ label: "Aug 18", score: 61 }, { label: "Aug 25", score: 66 }, { label: "Sep 01", score: 69 }, { label: "Sep 08", score: 71 }, { label: "Sep 15", score: 78 }];