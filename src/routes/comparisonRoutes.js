const express = require("express");
const router = express.Router();
const {
  getProductComparison,
  getAllComparisons,
  refreshComparison,
} = require("../controllers/comparisonController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public — any user can view price comparison for a product
router.get("/:productId", getProductComparison);

// Admin only — view all comparisons
router.get("/", protect, admin, getAllComparisons);

// Admin only — force refresh a product's comparison
router.post("/:productId/refresh", protect, admin, refreshComparison);

module.exports = router;
