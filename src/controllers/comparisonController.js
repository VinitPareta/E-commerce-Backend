const ProductComparison = require("../models/ProductComparison");
const Product = require("../models/Product");

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_URL = "https://serpapi.com/search.json";

// ── Fetch prices from SerpAPI Google Shopping ─────────────────────
const fetchPricesFromSerpAPI = async (productName, ourPrice) => {
  try {
    const query = encodeURIComponent(`${productName} price India buy online`);
    const url = `${SERP_API_URL}?engine=google_shopping&q=${query}&api_key=${SERP_API_KEY}&gl=in&hl=en&currency=INR&num=10`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.shopping_results || data.shopping_results.length === 0) {
      return [];
    }

    // Parse results and extract price comparisons
    const comparisons = data.shopping_results
      .slice(0, 8)
      .map((item) => {
        // Extract numeric price from string like "₹1,299" or "1299.00"
        const rawPrice = item.price || item.extracted_price || "0";
        const numericPrice =
          typeof rawPrice === "number"
            ? rawPrice
            : parseFloat(
                rawPrice
                  .toString()
                  .replace(/[₹,\s]/g, "")
                  .replace(/[^0-9.]/g, ""),
              );

        if (!numericPrice || numericPrice <= 0) return null;

        return {
          source: item.source || item.seller || "Unknown",
          price: Math.round(numericPrice),
          currency: "INR",
          url: item.link || item.product_link || "",
          rating: parseFloat(item.rating) || 0,
          reviews: parseInt(item.reviews) || 0,
          inStock: true,
          fetchedAt: new Date(),
        };
      })
      .filter(Boolean);

    return comparisons;
  } catch (error) {
    console.error("SerpAPI fetch error:", error.message);
    return [];
  }
};

// ── Calculate price status ─────────────────────────────────────────
const calculatePriceStatus = (ourPrice, prices) => {
  if (!prices.length) return "average";
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  if (ourPrice <= lowest) return "lowest";
  if (ourPrice <= avg * 0.95) return "below_average";
  if (ourPrice <= avg * 1.05) return "average";
  if (ourPrice < highest) return "above_average";
  return "highest";
};

// ── Get or create comparison for a product ─────────────────────────
const getProductComparison = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const ourPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;

    // Check if we have recent data (less than 24 hours old)
    let comparison = await ProductComparison.findOne({ product: productId });

    const isStale =
      !comparison ||
      !comparison.lastUpdated ||
      new Date() - new Date(comparison.lastUpdated) > 24 * 60 * 60 * 1000;

    if (isStale) {
      // Fetch fresh data from SerpAPI
      const searchQuery =
        `${product.name} ${product.brand || ""} ${product.category}`.trim();
      const comparisons = await fetchPricesFromSerpAPI(product.name, ourPrice);

      if (comparisons.length > 0) {
        const prices = comparisons.map((c) => c.price);
        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const averagePrice = Math.round(
          prices.reduce((a, b) => a + b, 0) / prices.length,
        );
        const ourPriceStatus = calculatePriceStatus(ourPrice, prices);

        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0); // midnight

        comparison = await ProductComparison.findOneAndUpdate(
          { product: productId },
          {
            product: productId,
            productName: product.name,
            searchQuery,
            ourPrice,
            comparisons,
            lowestPrice,
            highestPrice,
            averagePrice,
            ourPriceStatus,
            lastUpdated: new Date(),
            nextUpdateAt: tomorrow,
            $inc: { updateCount: 1 },
          },
          { upsert: true, new: true },
        );
      }
    }

    if (!comparison || !comparison.comparisons.length) {
      return res.json({
        success: true,
        message: "No comparison data available for this product",
        comparison: null,
      });
    }

    // Build explanation
    const explanation = buildExplanation(
      product.name,
      ourPrice,
      comparison.ourPriceStatus,
      comparison.lowestPrice,
      comparison.highestPrice,
      comparison.averagePrice,
    );

    res.json({
      success: true,
      comparison: {
        ...comparison.toObject(),
        explanation,
      },
    });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ message: "Failed to fetch price comparison" });
  }
};

// ── Build human-readable explanation ──────────────────────────────
const buildExplanation = (name, ourPrice, status, lowest, highest, average) => {
  const diff = Math.abs(ourPrice - average);
  const diffPercent = Math.round((diff / average) * 100);

  const explanations = {
    lowest: `🎉 Great news! DS Store offers ${name} at ₹${ourPrice.toLocaleString()}, which is the lowest price compared to other stores. You're getting the best deal here!`,
    below_average: `✅ DS Store's price of ₹${ourPrice.toLocaleString()} for ${name} is ${diffPercent}% below the market average of ₹${average.toLocaleString()}. This is a competitive price!`,
    average: `⚖️ DS Store's price of ₹${ourPrice.toLocaleString()} for ${name} is in line with the market average of ₹${average.toLocaleString()}. You're paying a fair price.`,
    above_average: `📊 DS Store's price of ₹${ourPrice.toLocaleString()} for ${name} is ${diffPercent}% above the market average of ₹${average.toLocaleString()}. This may be due to premium quality, authentic products, or better service.`,
    highest: `💎 DS Store's price of ₹${ourPrice.toLocaleString()} for ${name} is at the higher end. However, DS Store offers genuine products, secure payments, 7-day returns, and trusted customer service — which adds value beyond just the price.`,
  };

  return (
    explanations[status] ||
    `DS Store offers ${name} at ₹${ourPrice.toLocaleString()}.`
  );
};

// ── Get all comparisons (admin) ────────────────────────────────────
const getAllComparisons = async (req, res) => {
  try {
    const comparisons = await ProductComparison.find()
      .populate("product", "name price discountPrice images category")
      .sort({ lastUpdated: -1 });

    res.json({ success: true, count: comparisons.length, comparisons });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comparisons" });
  }
};

// ── Force refresh a single product comparison (admin) ─────────────
const refreshComparison = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const ourPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;
    const comparisons = await fetchPricesFromSerpAPI(product.name, ourPrice);

    if (!comparisons.length) {
      return res.json({
        success: false,
        message: "No data returned from SerpAPI",
      });
    }

    const prices = comparisons.map((c) => c.price);
    const updated = await ProductComparison.findOneAndUpdate(
      { product: productId },
      {
        product: productId,
        productName: product.name,
        searchQuery: product.name,
        ourPrice,
        comparisons,
        lowestPrice: Math.min(...prices),
        highestPrice: Math.max(...prices),
        averagePrice: Math.round(
          prices.reduce((a, b) => a + b, 0) / prices.length,
        ),
        ourPriceStatus: calculatePriceStatus(ourPrice, prices),
        lastUpdated: new Date(),
        $inc: { updateCount: 1 },
      },
      { upsert: true, new: true },
    );

    res.json({
      success: true,
      message: "Comparison refreshed",
      comparison: updated,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to refresh comparison" });
  }
};

// ── Cron job function — updates all products ──────────────────────
const updateAllComparisons = async () => {
  console.log(
    `[${new Date().toISOString()}] Starting nightly price comparison update...`,
  );

  try {
    const products = await Product.find({ inStock: true });
    let updated = 0;
    let failed = 0;

    for (const product of products) {
      try {
        const ourPrice =
          product.discountPrice > 0 ? product.discountPrice : product.price;
        const comparisons = await fetchPricesFromSerpAPI(
          product.name,
          ourPrice,
        );

        if (comparisons.length > 0) {
          const prices = comparisons.map((c) => c.price);
          const tomorrow = new Date();
          tomorrow.setHours(24, 0, 0, 0);

          await ProductComparison.findOneAndUpdate(
            { product: product._id },
            {
              product: product._id,
              productName: product.name,
              searchQuery: product.name,
              ourPrice,
              comparisons,
              lowestPrice: Math.min(...prices),
              highestPrice: Math.max(...prices),
              averagePrice: Math.round(
                prices.reduce((a, b) => a + b, 0) / prices.length,
              ),
              ourPriceStatus: calculatePriceStatus(ourPrice, prices),
              lastUpdated: new Date(),
              nextUpdateAt: tomorrow,
              $inc: { updateCount: 1 },
            },
            { upsert: true, new: true },
          );
          updated++;
        }

        // Delay 1.2s between requests to respect SerpAPI rate limits
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err) {
        console.error(`Failed to update ${product.name}:`, err.message);
        failed++;
      }
    }

    console.log(
      `[Cron] Price update complete — ${updated} updated, ${failed} failed`,
    );
  } catch (err) {
    console.error("[Cron] Price update failed:", err.message);
  }
};

module.exports = {
  getProductComparison,
  getAllComparisons,
  refreshComparison,
  updateAllComparisons,
};
