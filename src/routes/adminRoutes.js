const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getAdminPayments,
  getAllChats,
  getChatDetails,
  getWebhookEvents,
} = require("../controllers/adminController");
const Chat = require("../models/Chat");

router.get("/stats", protect, admin, getDashboardStats);
router.get("/payments", protect, admin, getAdminPayments);
router.get("/webhook-events", protect, admin, getWebhookEvents);
router.get("/chats", protect, admin, getAllChats);
router.get("/chats/:id", protect, admin, getChatDetails);

// Debug endpoint - shows raw chat data with sessionIds (admin only)
router.get("/chats-debug/raw-data", protect, admin, async (req, res) => {
  try {
    const allChats = await Chat.find({}).lean();
    res.json({
      success: true,
      totalDocuments: allChats.length,
      chats: allChats.map((chat) => ({
        _id: chat._id,
        sessionId: chat.sessionId,
        userName: chat.userName,
        userEmail: chat.userEmail,
        totalMessages: chat.totalMessages,
        messageCount: chat.messages?.length || 0,
        createdAt: chat.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
