const app = require("../app");
const connectDB = require("../config/db");

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB unavailable for Vercel API request", error);
    return res.status(503).json({
      success: false,
      message: "Database unavailable. Check MONGO_URI and the Atlas network allowlist.",
    });
  }

  return app(req, res);
};
