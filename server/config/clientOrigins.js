const getClientOrigins = () =>
  [
    process.env.CLIENT_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    "https://api-security-dashboard.vercel.app",
    "http://localhost:5173",
  ].filter(Boolean);

module.exports = getClientOrigins;
