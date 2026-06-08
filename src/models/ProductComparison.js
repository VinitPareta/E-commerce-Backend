const mongoose = require("mongoose");

const priceComparisonSchema = new mongoose.Schema({
  source: { type: String, required: true }, // e.g. "Amazon", "Flipkart"
  price: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  url: { type: String, default: "" },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  fetchedAt: { type: Date, default: Date.now },
});

const productComparisonSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    productName: { type: String, required: true },
    searchQuery: { type: String, required: true }, // query used to search
    ourPrice: { type: Number, required: true },
    comparisons: [priceComparisonSchema],
    lowestPrice: { type: Number, default: 0 },
    highestPrice: { type: Number, default: 0 },
    averagePrice: { type: Number, default: 0 },
    ourPriceStatus: {
      type: String,
      enum: ["lowest", "below_average", "average", "above_average", "highest"],
      default: "average",
    },
    lastUpdated: { type: Date, default: Date.now },
    nextUpdateAt: { type: Date },
    updateCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProductComparison", productComparisonSchema);
