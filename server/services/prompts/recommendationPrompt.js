const buildRecommendationPrompt = (finding) => `You are an API security engineer reviewing a Node.js and Express API.

Finding:
- OWASP category: ${finding.owaspCategory}
- Severity: ${finding.severity}
- Endpoint: ${finding.method} ${finding.endpoint}
- Description: ${finding.description}
- Evidence: ${finding.evidence || "No additional evidence was recorded."}

Write a concise, plain-language security recommendation. Explain the practical risk in one short paragraph, then provide exactly 3 to 5 concrete remediation steps for a Node.js/Express team. Mention validation, authorization, middleware, headers, rate limits, or parameterized queries only when relevant. Do not invent facts, include exploit payloads, or use Markdown tables. Return only the explanation and numbered fix steps. Keep the response under 350 words.`;

module.exports = { buildRecommendationPrompt };