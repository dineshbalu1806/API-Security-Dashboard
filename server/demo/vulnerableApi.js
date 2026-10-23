const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/user/42", (req, res) => {
  res.json({
    id: 42,
    name: "Sample Demo User",
    email: "user@example.test",
    access_token: "demo-only-not-a-real-token",
    credit_card: "4242-4242-4242-4242",
  });
});

app.get("/api/admin/audit", (req, res) => {
  res.json({
    entries: [{ action: "sample login", user: "user@example.test" }],
  });
});

app.get("/api/orders", (req, res) => {
  res.json({
    orders: [{ id: "demo-order-1", status: "processing", internal_note: "Sample data only" }],
  });
});

app.get("/api/search", (req, res) => {
  if (String(req.query.api_security_probe || "").includes("'")) {
    return res.status(500).json({ error: "Demo query parser error: unexpected quote" });
  }
  res.json({ results: ["sample item"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (require.main === module) {
  const port = Number(process.env.DEMO_API_PORT || 5001);
  app.listen(port, "127.0.0.1", () => {
    console.log(`Vulnerable demo API listening on http://127.0.0.1:${port}`);
    console.log("Local demo data only; do not expose this service to a network.");
  });
}

module.exports = app;
