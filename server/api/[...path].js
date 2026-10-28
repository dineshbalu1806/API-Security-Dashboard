const app = require("../app");
const connectDB = require("../config/db");

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Unable to handle API request", error);
    return res.status(503).json({
      success: false,
      message: "API is temporarily unavailable",
    });
  }
};
