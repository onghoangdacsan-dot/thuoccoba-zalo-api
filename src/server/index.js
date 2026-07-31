const path = require("path");
const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Quan trọng: giữ raw body để verify signature
app.use(express.json({
  limit: '200kb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Phục vụ trang admin + file tĩnh
app.use(express.static(path.join(__dirname, "../../public")));

const APP_SECRET_KEY = process.env.ZALO_APP_SECRET_KEY; // App Secret Key (dùng decode phone)
const OA_SECRET_KEY = process.env.ZALO_OA_SECRET_KEY;   // OA Secret Key (dùng verify webhook)
const APP_ID = process.env.ZALO_APP_ID;                // App ID

function verifyZaloSignature(req) {
  if (!OA_SECRET_KEY || !APP_ID) {
    console.warn('[SECURITY] Thiếu ZALO_OA_SECRET_KEY hoặc ZALO_APP_ID — từ chối webhook.');
    return false;
  }
  const macFromZalo = req.get('X-ZEvent-Signature') || req.body?.mac;
  if (!macFromZalo) return false;

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const timestamp = req.body?.timestamp;
  const appId = req.body?.app_id || APP_ID;
  if (!timestamp) return false;

  const baseString = appId + rawBody + timestamp + OA_SECRET_KEY;
  const computedMac = crypto
    .createHash('sha256')
    .update(baseString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(macFromZalo),
      Buffer.from(computedMac)
    );
  } catch {
    return false;
  }
}

app.post('/webhook', (req, res) => {
  if (!verifyZaloSignature(req)) {
    console.warn('[SECURITY] Webhook bị từ chối: chữ ký không hợp lệ hoặc thiếu.');
    return res.status(401).send('Invalid signature');
  }

  console.log('Nhận sự kiện Zalo OA:', req.body?.event_name || 'unknown_event');
  res.status(200).send('OK');
});

// Endpoint decode số điện thoại (Mini App)
app.post('/api/decode-phone', async (req, res) => {
  if (!APP_SECRET_KEY) {
    return res.status(500).json({ error: 'Server chưa cấu hình ZALO_APP_SECRET_KEY' });
  }
  const { token, accessToken } = req.body || {};
  if (!token || !accessToken) {
    return res.status(400).json({ error: 'Thiếu token hoặc accessToken' });
  }

  try {
    const response = await fetch('https://graph.zalo.me/v2.0/me/info', {
      method: 'GET',
      headers: {
        access_token: accessToken,
        code: token,
        secret_key: APP_SECRET_KEY,
      },
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : 400).json(data);
  } catch (err) {
    console.error('Decode phone error:', err);
    return res.status(500).json({ error: 'Lỗi gọi Zalo API' });
  }
});

// ==========================================
// CÁC API QUẢN LÝ ĐƠN HÀNG
// ==========================================

const ordersDB = new Map();

// Tạo đơn hàng
app.post("/api/orders", (req, res) => {
  try {
    const orderId = "ORD_" + Date.now();
    const order = {
      id: orderId,
      ...req.body,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ordersDB.set(orderId, order);
    console.log("Tạo đơn:", orderId);
    res.json({ orderId, status: "pending" });
  } catch (err) {
    res.status(500).json({ error: "Cannot create order" });
  }
});

// Lấy danh sách đơn hàng (Mini App gọi)
app.get("/api/orders", (req, res) => {
  const list = Array.from(ordersDB.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

const ADMIN_PASSWORD = "thuoccoba2026"; // đổi mật khẩu thật

// Admin cập nhật trạng thái
app.patch("/api/orders/:orderId/status", (req, res) => {
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  const { orderId } = req.params;
  const { status } = req.body;
  const allowed = ["pending", "preparing", "shipping", "completed"];
  
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }
  
  const order = ordersDB.get(orderId);
  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn" });
  }
  
  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (status === "preparing") order.confirmedAt = order.updatedAt;
  if (status === "shipping") order.shippingAt = order.updatedAt;
  if (status === "completed") order.completedAt = order.updatedAt;
  
  ordersDB.set(orderId, order);
  console.log("Admin cập nhật:", orderId, "→", status);
  res.json(order);
});

// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server webhook đang chạy cổng ${PORT}`));