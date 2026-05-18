const nodemailer = require("nodemailer");

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 0);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    console.warn(
      "Email not configured: set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.",
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.EMAIL_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
};

const formatOrderItems = (items = []) =>
  items
    .map((item) => {
      const parts = [item.name, item.quantity ? `x ${item.quantity}` : ""];
      if (item.size) parts.push(`Size: ${item.size}`);
      if (item.color) parts.push(`Color: ${item.color}`);
      return parts.filter(Boolean).join(" • ");
    })
    .join("\n");

const sendPaymentSuccessEmail = async ({
  to,
  order,
  recipientName = "Customer",
}) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const orderId = order._id?.toString() || "Unknown";
  const formattedOrderId = orderId.slice(-8).toUpperCase();
  const paymentMode =
    order.paymentMethod === "COD"
      ? "Cash on Delivery"
      : order.paymentMethod === "UPI"
        ? "UPI"
        : "Card";

  const subject = `Payment received for Order #${formattedOrderId}`;
  const text = `Hi ${recipientName},

We have received payment for your order.

Order ID: ${orderId}
Total: ₹${order.totalPrice}
Payment mode: ${paymentMode}

Items:
${formatOrderItems(order.items)}

Thank you for shopping with us.

If you have any questions, reply to this email.`;
  const html = `
    <p>Hi ${recipientName},</p>
    <p>We have received payment for your order.</p>
    <ul>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Total:</strong> ₹${order.totalPrice}</li>
      <li><strong>Payment mode:</strong> ${paymentMode}</li>
    </ul>
    <p><strong>Items:</strong></p>
    <ul>
      ${order.items
        .map(
          (item) =>
            `<li>${item.name} x ${item.quantity || 1}${item.size ? ` • Size: ${item.size}` : ""}${item.color ? ` • Color: ${item.color}` : ""}</li>`,
        )
        .join("")}
    </ul>
    <p>Thank you for shopping with us.</p>
    <p>If you have any questions, just reply to this email.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.warn(
      "Unable to send payment confirmation email:",
      err.message || err,
    );
  }
};

module.exports = { sendPaymentSuccessEmail };
