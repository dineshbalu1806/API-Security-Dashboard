const Anthropic = require("@anthropic-ai/sdk");
const { buildRecommendationPrompt } = require("./prompts/recommendationPrompt");

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const generateRecommendation = async (finding) => {
  const client = getClient();
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    max_tokens: 700,
    temperature: 0.2,
    system: "You provide accurate, defensive API security guidance.",
    messages: [{ role: "user", content: buildRecommendationPrompt(finding) }],
  });

  const recommendation = (message.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!recommendation) throw new Error("Anthropic returned an empty recommendation");
  finding.aiRecommendation = recommendation;
  await finding.save();
  return finding;
};

module.exports = { generateRecommendation };