const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const Chat = require("./models/Chat");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { stripeWebhook } = require("./controllers/stripeController");

connectDB();

const app = express();

// ✅ CLEAN CORS SETUP
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://e-commerce-frontend-gilt-eight.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  }),
);

app.options("*", cors());

app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// ✅ Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "DS Store backend is running." });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "DS Store API is running",
    version: "1.0.0",
  });
});

// ✅ All routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);

// ✅ GROQ - Outfit Complete AI
app.post("/api/ai/outfit", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a fashion stylist AI. When given a product catalog and a selected item, respond ONLY with a valid JSON array. No markdown, no explanation, no extra text — just the raw JSON array.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      },
    );

    const data = await response.json();
    // Return in same shape the frontend expects
    const text = data.choices?.[0]?.message?.content || "[]";
    res.json({ groqText: text });
  } catch (error) {
    console.error("Outfit AI error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

// ✅ GROQ - DS Chatbot
app.post("/api/ai/chat", async (req, res) => {
  try {
    const {
      messages,
      systemPrompt,
      sessionId,
      userId,
      userName,
      userEmail,
      isGuest,
      userMessage,
    } = req.body;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      },
    );

    const data = await response.json();
    const assistantReply = data.choices?.[0]?.message?.content || "";

    // Save to DB
    if (sessionId && userMessage) {
      try {
        const chatUpdate = await Chat.findOneAndUpdate(
          { sessionId },
          {
            $set: {
              user: userId || null,
              userName: userName || "Guest",
              userEmail: userEmail || "",
              isGuest: isGuest !== false,
              lastUserMessage: userMessage,
            },
            $push: {
              messages: {
                $each: [
                  { role: "user", content: userMessage },
                  { role: "assistant", content: assistantReply },
                ],
              },
            },
            $inc: { totalMessages: 2 },
          },
          { upsert: true, new: true },
        );
        console.log(
          `Chat saved with sessionId: ${sessionId}, total messages: ${chatUpdate?.totalMessages}`,
        );
      } catch (dbErr) {
        console.error("Chat DB save error:", dbErr.message);
        // If unique constraint fails, generate new sessionId recommendation
        if (dbErr.code === 11000) {
          console.error(
            "Duplicate sessionId detected - ensure unique session IDs are used",
          );
        }
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat request failed" });
  }
});

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (process.env.SERVE_CLIENT === "true" && fs.existsSync(clientDist)) {
  console.log(`Serving React build from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`DS Store server running on http://localhost:${PORT}`);
});
