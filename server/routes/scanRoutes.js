const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
	createScan,
	getScan,
	getScans,
	generateRecommendations,
	downloadReport,
} = require("../controllers/scanController");

const router = express.Router();
router.use(protect);
router.post("/", createScan);
router.get("/", getScans);
router.post("/:id/generate-recommendations", generateRecommendations);
router.get("/:id/report", downloadReport);
router.get("/:id", getScan);

module.exports = router;