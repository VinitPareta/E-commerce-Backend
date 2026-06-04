const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sessionId: { type: String, required: true, unique: true }, // for guest users - unique to prevent merging
    messages: [messageSchema],
    // summary for admin to quickly scan
    lastUserMessage: { type: String, default: "" },
    totalMessages: { type: Number, default: 0 },
    isGuest: { type: Boolean, default: true },
    userName: { type: String, default: "Guest" },
    userEmail: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Chat", chatSchema);
