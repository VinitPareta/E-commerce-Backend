const { Resend } = require("resend");

const sendPaymentSuccessEmail = async ({
  to,
  customerName,
  order,
  paymentMode,
}) => {
  if (!to) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const orderId = order._id.toString().slice(-8).toUpperCase();
    const paidAt = new Date(order.paidAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const itemsHTML = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${item.quantity}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject: `✅ Payment Confirmed — Order #${orderId}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">

          <div style="background:#1a1a2e; padding:25px; text-align:center;">
            <h1 style="color:#fff; margin:0;">DS Store 🛍️</h1>
          </div>

          <div style="background:#e8f5e9; padding:20px; text-align:center;">
            <h2 style="color:#2e7d32; margin:0;">✅ Payment Successful!</h2>
            <p style="color:#388e3c; margin:5px 0 0;">Your order has been confirmed</p>
          </div>

          <div style="padding:25px;">
            <p>Hi <strong>${customerName}</strong>,</p>
            <p style="color:#555;">Thank you! Your payment has been received.</p>

            <div style="background:#f9f9f9; border:1px solid #e0e0e0; border-radius:8px; padding:20px; margin:20px 0;">
              <table style="width:100%;">
                <tr>
                  <td style="color:#888; padding:5px 0;">Order ID</td>
                  <td style="font-weight:bold;">#${orderId}</td>
                </tr>
                <tr>
                  <td style="color:#888; padding:5px 0;">Payment Method</td>
                  <td>${paymentMode}</td>
                </tr>
                <tr>
                  <td style="color:#888; padding:5px 0;">Payment Date</td>
                  <td>${paidAt}</td>
                </tr>
                <tr>
                  <td style="color:#888; padding:5px 0;">Status</td>
                  <td style="color:#2e7d32; font-weight:bold;">${order.paymentStatus}</td>
                </tr>
              </table>
            </div>

            <h3>🛒 Items Ordered</h3>
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:10px; text-align:left;">Item</th>
                  <th style="padding:10px; text-align:center;">Qty</th>
                  <th style="padding:10px; text-align:right;">Price</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
            </table>

            <div style="margin-top:20px; border-top:2px solid #eee; padding-top:15px;">
              <table style="width:100%;">
                <tr>
                  <td style="color:#888;">Items Total</td>
                  <td style="text-align:right;">₹${order.itemsPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color:#888;">Shipping</td>
                  <td style="text-align:right;">₹${order.shippingPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color:#888;">Tax</td>
                  <td style="text-align:right;">₹${order.taxPrice.toFixed(2)}</td>
                </tr>
                <tr style="border-top:1px solid #eee;">
                  <td style="font-weight:bold; font-size:16px; padding-top:10px;">Total Paid</td>
                  <td style="text-align:right; font-weight:bold; font-size:18px; color:#2e7d32; padding-top:10px;">₹${order.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="margin-top:25px; background:#f9f9f9; border:1px solid #e0e0e0; border-radius:8px; padding:20px;">
              <h3 style="margin:0 0 12px;">📦 Shipping Address</h3>
              <p style="margin:0; color:#555; line-height:1.8;">
                ${order.shippingAddress.fullName}<br/>
                ${order.shippingAddress.street}<br/>
                ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}<br/>
                📞 ${order.shippingAddress.phone}
              </p>
            </div>

            <p style="margin-top:20px; color:#555;">
              Thank you for shopping with <strong>DS Store</strong>! 🚀
            </p>
          </div>

          <div style="background:#f5f5f5; padding:20px; text-align:center;">
            <p style="color:#888; font-size:12px; margin:0;">© 2024 DS Store. All rights reserved.</p>
          </div>

        </div>
      `,
    });

    if (error) {
      console.error("❌ Email error:", error);
      return;
    }

    console.log("✅ Email sent to:", to);
    console.log("✅ Email ID:", data.id);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
};

module.exports = { sendPaymentSuccessEmail };
