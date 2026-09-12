const express = require("express");
const CryptoJS = require("crypto-js");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const { createOrder: createJnTOrder } = require("./src/server/jntService");

app.post("/api/jnt/create-order", async (req, res) => {
  try {
    const result = await createJnTOrder(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("JNT create order error:", error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

const PRIVATE_KEY = "fe49f1b0e06649e498929a7379cfdfbf";
const ADMIN_PASSWORD = "thuoccoba2026";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

const TIERS = [
  { key: "dong", label: "Đồng", minPoints: 0 },
  { key: "bac", label: "Bạc", minPoints: 200 },
  { key: "vang", label: "Vàng", minPoints: 500 },
  { key: "kimcuong", label: "Kim Cương", minPoints: 1000 },
];

function getTier(points) {
  let cur = TIERS[0];
  for (const t of TIERS) if (points >= t.minPoints) cur = t;
  return cur;
}

function getNextTier(points) {
  return TIERS.find((t) => t.minPoints > points) || null;
}

function pointsForOrder(total) {
  return Number(total || 0) >= 300000 ? 10 : 5;
}

async function initDB() {
  if (!pool) {
    console.error("THIẾU DATABASE_URL — server chạy nhưng không lưu đơn được");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        phone VARCHAR(20) PRIMARY KEY,
        full_name VARCHAR(255),
        points INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        order_id VARCHAR(50),
        points_change INT NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        gift_label VARCHAR(255) NOT NULL,
        points_cost INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log(
      "Database PostgreSQL sẵn sàng (orders, customers, points_history, redemptions)."
    );
  } catch (err) {
    console.error("Lỗi initDB:", err);
  }
}
initDB();

function normalizePhone(p) {
  let s = String(p || "").replace(/\D/g, "");
  if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  if (s.startsWith("840")) s = "0" + s.slice(3);
  return s;
}

async function ensureCustomer(phone, fullName) {
  if (!pool) return null;
  const p = normalizePhone(phone);
  if (!p) return null;
  const existing = await pool.query("SELECT * FROM customers WHERE phone=$1", [p]);
  if (existing.rows.length) {
    if (fullName) {
      await pool.query(
        "UPDATE customers SET full_name=$1, updated_at=now() WHERE phone=$2",
        [fullName, p]
      );
    }
    return existing.rows[0];
  }
  const inserted = await pool.query(
    "INSERT INTO customers (phone, full_name) VALUES ($1,$2) RETURNING *",
    [p, fullName || null]
  );
  return inserted.rows[0];
}

async function awardPointsForOrder(order) {
  if (!pool || !order) return;
  const phone = normalizePhone(order.shippingInfo?.phone);
  if (!phone) return;
  const already = await pool.query(
    "SELECT id FROM points_history WHERE order_id=$1",
    [order.id]
  );
  if (already.rows.length) return;
  await ensureCustomer(phone, order.shippingInfo?.fullName);
  const pts = pointsForOrder(order.total);
  await pool.query(
    "INSERT INTO points_history (phone, order_id, points_change, reason) VALUES ($1,$2,$3,$4)",
    [phone, order.id, pts, "Đơn hàng hoàn tất " + order.id]
  );
  await pool.query(
    "UPDATE customers SET points = points + $1, updated_at = now() WHERE phone=$2",
    [pts, phone]
  );
}

app.post("/api/get-phone-number", async (req, res) => {
  try {
    const { token, accessToken } = req.body;
    const APP_SECRET_KEY =
      process.env.ZALO_APP_SECRET_KEY || process.env.ZALO_SECRET_KEY;
    if (!token || !accessToken) {
      return res.status(400).json({ error: "Thiếu token hoặc accessToken" });
    }
    if (!APP_SECRET_KEY) {
      return res.status(500).json({ error: "Chưa cấu hình ZALO_APP_SECRET_KEY" });
    }
    const zaloRes = await fetch("https://graph.zalo.me/v2.0/me/info", {
      method: "GET",
      headers: {
        access_token: accessToken,
        code: token,
        secret_key: APP_SECRET_KEY,
      },
    });
    const data = await zaloRes.json();
    if (data?.data?.number) {
      return res.json({ phoneNumber: data.data.number, phone: data.data.number });
    }
    return res.status(400).json({ error: data?.message || "Không giải mã được SĐT" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server khi lấy SĐT" });
  }
});

app.post("/api/orders", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  try {
    const orderId = "ORD_" + Date.now();
    const createdAt = new Date().toISOString();
    const order = {
      id: orderId,
      items: req.body.items || [],
      shippingInfo: req.body.shippingInfo || {},
      subTotal: req.body.subTotal || 0,
      shippingFee: req.body.shippingFee || 0,
      total: req.body.total || req.body.finalTotal || 0,
      paymentMethod: req.body.paymentMethod || "COD",
      note: req.body.note || "",
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    };
    await pool.query(
      "INSERT INTO orders (id, data, created_at, status) VALUES ($1, $2, $3, $4)",
      [orderId, order, createdAt, "pending"]
    );
    if (order.shippingInfo?.phone) {
      ensureCustomer(order.shippingInfo.phone, order.shippingInfo.fullName).catch(
        (e) => console.error("ensureCustomer lỗi:", e)
      );
    }
    console.log("Tạo đơn:", orderId);
    res.json({ orderId, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot create order" });
  }
});

app.get("/api/orders", async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const result = await pool.query(
      "SELECT data FROM orders ORDER BY created_at DESC"
    );
    res.json(result.rows.map((r) => r.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot get orders" });
  }
});

app.post("/api/orders/:orderId/cancel", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  try {
    const { orderId } = req.params;
    const { reason, phone } = req.body || {};
    const result = await pool.query("SELECT data FROM orders WHERE id = $1", [
      orderId,
    ]);
    if (!result.rows.length)
      return res.status(404).json({ error: "Không tìm thấy đơn" });
    const order = result.rows[0].data;
    const a = normalizePhone(phone);
    const b = normalizePhone(order.shippingInfo?.phone);
    if (a && b && a !== b) {
      return res.status(403).json({ error: "Bạn không có quyền hủy đơn này" });
    }
    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Chỉ hủy được đơn đang chờ xác nhận" });
    }
    const created = new Date(order.createdAt).getTime();
    if (Number.isNaN(created) || Date.now() - created > TWO_HOURS_MS) {
      return res
        .status(400)
        .json({ error: "Đã quá 2 giờ — không thể hủy đơn." });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Vui lòng chọn lý do hủy" });
    }
    order.status = "cancelled";
    order.cancelReason = String(reason).trim();
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = order.cancelledAt;
    await pool.query(
      "UPDATE orders SET data = $1, status = $2 WHERE id = $3",
      [order, "cancelled", orderId]
    );
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không hủy được đơn" });
  }
});

app.patch("/api/orders/:orderId/status", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  const { orderId } = req.params;
  const { status } = req.body;
  const allowed = [
    "pending",
    "preparing",
    "shipping",
    "completed",
    "cancelled",
  ];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }
  try {
    const result = await pool.query("SELECT data FROM orders WHERE id = $1", [
      orderId,
    ]);
    if (!result.rows.length)
      return res.status(404).json({ error: "Không tìm thấy đơn" });
    const order = result.rows[0].data;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (status === "preparing") order.confirmedAt = order.updatedAt;
    if (status === "shipping") order.shippingAt = order.updatedAt;
    if (status === "completed") order.completedAt = order.updatedAt;
    if (status === "cancelled") {
      order.cancelledAt = order.updatedAt;
      if (req.body.reason) order.cancelReason = String(req.body.reason);
    }
    await pool.query(
      "UPDATE orders SET data = $1, status = $2 WHERE id = $3",
      [order, status, orderId]
    );
    if (status === "completed") {
      try {
        await awardPointsForOrder(order);
      } catch (e) {
        console.error("awardPointsForOrder lỗi:", e);
      }
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi cập nhật trạng thái" });
  }
});

app.get("/api/loyalty/summary", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: "Thiếu số điện thoại" });
    const result = await pool.query("SELECT * FROM customers WHERE phone=$1", [
      phone,
    ]);
    const points = result.rows.length ? result.rows[0].points : 0;
    res.json({
      phone,
      points,
      tier: getTier(points),
      nextTier: getNextTier(points),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy thông tin tích điểm" });
  }
});

app.get("/api/loyalty/history", async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: "Thiếu số điện thoại" });
    const result = await pool.query(
      "SELECT * FROM points_history WHERE phone=$1 ORDER BY created_at DESC LIMIT 100",
      [phone]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy lịch sử điểm" });
  }
});

app.post("/api/loyalty/redeem", async (req, res) => {
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  try {
    const phone = normalizePhone(req.body.phone);
    const { giftLabel, pointsCost } = req.body || {};
    if (!phone || !giftLabel || !pointsCost) {
      return res.status(400).json({ error: "Thiếu thông tin đổi quà" });
    }
    const result = await pool.query("SELECT * FROM customers WHERE phone=$1", [
      phone,
    ]);
    const current = result.rows.length ? result.rows[0].points : 0;
    if (current < Number(pointsCost)) {
      return res.status(400).json({ error: "Không đủ điểm để đổi quà này" });
    }
    await pool.query(
      "UPDATE customers SET points = points - $1, updated_at = now() WHERE phone=$2",
      [pointsCost, phone]
    );
    await pool.query(
      "INSERT INTO points_history (phone, order_id, points_change, reason) VALUES ($1,NULL,$2,$3)",
      [phone, -Math.abs(pointsCost), "Đổi quà: " + giftLabel]
    );
    const redemption = await pool.query(
      "INSERT INTO redemptions (phone, gift_label, points_cost) VALUES ($1,$2,$3) RETURNING *",
      [phone, giftLabel, pointsCost]
    );
    res.json({
      success: true,
      remainingPoints: current - Number(pointsCost),
      redemption: redemption.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi đổi quà" });
  }
});

app.get("/api/admin/redemptions", async (req, res) => {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  if (!pool) return res.json([]);
  try {
    const result = await pool.query(
      "SELECT * FROM redemptions ORDER BY created_at DESC LIMIT 200"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách đổi quà" });
  }
});

app.patch("/api/admin/redemptions/:id/fulfill", async (req, res) => {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  if (!pool) return res.status(500).json({ error: "Chưa cấu hình DATABASE_URL" });
  try {
    await pool.query("UPDATE redemptions SET status='fulfilled' WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi cập nhật" });
  }
});

app.get("/api/admin/customers", async (req, res) => {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  if (!pool) return res.json([]);
  try {
    const result = await pool.query(
      "SELECT * FROM customers ORDER BY points DESC LIMIT 500"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách khách hàng" });
  }
});

app.post("/api/create-mac", (req, res) => {
  try {
    const body = req.body;
    const dataMac = Object.keys(body)
      .sort()
      .map((key) => {
        const value =
          typeof body[key] === "object"
            ? JSON.stringify(body[key])
            : body[key];
        return key + "=" + value;
      })
      .join("&");
    res.json({ mac: CryptoJS.HmacSHA256(dataMac, PRIVATE_KEY).toString() });
  } catch (err) {
    res.status(500).json({ error: "Cannot create mac" });
  }
});

app.post("/api/zalo-notify", async (req, res) => {
  if (!pool) return res.json({ returnCode: 0, returnMessage: "No database" });
  try {
    const { data, mac } = req.body || {};
    if (!data || !mac)
      return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    const { appId, orderId, method, extradata, resultCode } = data;
    const str = "appId=" + appId + "&orderId=" + orderId + "&method=" + method;
    if (CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString() !== mac) {
      return res.json({ returnCode: 0, returnMessage: "Invalid mac" });
    }
    try {
      const extra =
        typeof extradata === "string" ? JSON.parse(extradata) : extradata;
      const myOrderId = extra && extra.orderId;
      if (myOrderId) {
        const result = await pool.query(
          "SELECT data FROM orders WHERE id = $1",
          [myOrderId]
        );
        if (result.rows.length) {
          const order = result.rows[0].data;
          if (
            (String(resultCode) === "1" || resultCode === 1) &&
            order.status !== "cancelled"
          ) {
            order.status = "preparing";
            order.confirmedAt = new Date().toISOString();
            order.updatedAt = order.confirmedAt;
            await pool.query(
              "UPDATE orders SET data = $1, status = $2 WHERE id = $3",
              [order, "preparing", myOrderId]
            );
          }
        }
      }
    } catch (e) {}
    return res.json({ returnCode: 1, returnMessage: "Success" });
  } catch (err) {
    return res.json({ returnCode: 0, returnMessage: "Error" });
  }
});

app.post("/api/zalo-callback", (req, res) => {
  res.json({ returnCode: 1, returnMessage: "Success" });
});

app.get(["/admin", "/admin.html"], (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getAdminHTML());
});

function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thuộc Cô Ba · Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
:root{--bg:#f4efe6;--panel:#fffdf9;--card:#fff;--line:#e8d9c4;--gold:#c9a227;--gold2:#d4a84b;--brown:#8B4513;--text:#2c1810;--muted:#7a6548}
*{box-sizing:border-box}
body{margin:0;font-family:'Be Vietnam Pro',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
button,input,select{font:inherit}button{cursor:pointer;border:none;border-radius:10px;padding:9px 14px;font-weight:600}
.layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
.sidebar{background:#fff9f0;border-right:1px solid var(--line);padding:18px 12px;position:sticky;top:0;height:100vh}
.brand{display:flex;gap:10px;align-items:center;padding:8px 8px 18px}
.brand-badge{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--gold2),var(--brown));display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff}
.brand h1{font-size:14px;margin:0;color:var(--brown)}.brand span{font-size:11px;color:var(--muted)}
.nav button{width:100%;text-align:left;background:transparent;color:var(--muted);margin-bottom:4px}
.nav button.on,.nav button:hover{background:rgba(139,69,19,.08);color:var(--brown)}
.main{padding:18px 20px 40px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.topbar h2{margin:0;font-size:20px;font-weight:800;color:var(--brown)}
.sub{color:var(--muted);font-size:12px;margin-top:4px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn-gold{background:linear-gradient(135deg,var(--gold2),var(--brown));color:#fff}
.btn-ghost{background:#fff;border:1px solid var(--line);color:var(--text)}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(100px,1fr));gap:10px;margin-bottom:14px}
@media(max-width:1100px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;box-shadow:0 2px 8px rgba(139,69,19,.06)}
.kpi .label{font-size:11px;color:var(--muted);font-weight:600}
.kpi .value{font-size:18px;font-weight:800;margin-top:4px;color:var(--brown)}
.kpi .hint{font-size:11px;color:var(--muted);margin-top:4px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(139,69,19,.05)}
.panel-title{font-size:14px;font-weight:700;margin:0 0 10px;color:var(--brown)}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}
.chip{background:#faf6ef;border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:7px 12px;font-size:12px}
.chip.on{background:rgba(139,69,19,.1);border-color:var(--brown);color:var(--brown)}
input,select{background:#fff;border:1px solid var(--line);color:var(--text);border-radius:10px;padding:8px 12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--muted);font-weight:600;padding:10px 8px;border-bottom:1px solid var(--line);font-size:11px}
td{padding:12px 8px;border-bottom:1px solid #f0e6d8;vertical-align:top}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:#fff3cd;color:#856404}.preparing{background:#cfe2ff;color:#084298}
.shipping{background:#e0d4ff;color:#5a3d9a}.completed{background:#d1e7dd;color:#0f5132}.cancelled{background:#f8d7da;color:#842029}
.row-btns{display:flex;flex-wrap:wrap;gap:4px}
.row-btns button{font-size:11px;padding:5px 8px;border-radius:8px}
.b-prep{background:#1e3a5f;color:#93c5fd}.b-ship{background:#312e81;color:#c7d2fe}
.b-ok{background:#14532d;color:#86efac}.b-bad{background:#7f1d1d;color:#fecaca}.b-jnt{background:#9a3412;color:#fdba74}
.muted{color:var(--muted);font-size:12px}
.products{font-size:11px;color:#8a7250;margin-top:4px;line-height:1.4}
.order-id{cursor:pointer;color:var(--brown);font-weight:800}.order-id:hover{text-decoration:underline}
.chart{display:flex;align-items:flex-end;gap:8px;height:110px}
.bar-wrap{flex:1;text-align:center}
.bar{background:linear-gradient(180deg,var(--gold2),var(--brown));border-radius:8px 8px 4px 4px;min-height:4px}
.bar-label{font-size:10px;color:var(--muted);margin-top:6px}
#loginBox{max-width:400px;margin:12vh auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;box-shadow:0 8px 30px rgba(139,69,19,.12)}
#loginBox h1{margin:0 0 8px;font-size:20px;color:var(--brown)}#loginBox p{color:var(--muted);font-size:13px}
#loginBox input{width:100%;margin:12px 0}
#loginBox button{width:100%;background:linear-gradient(135deg,var(--gold2),var(--brown));color:#fff}
.err{color:#c0392b;font-size:13px;margin-top:8px}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.banner-card{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:#fff;min-height:120px;position:relative}
.banner-card .bg{position:absolute;inset:0;opacity:.3;background-size:cover;background-position:center}
.banner-card .body{position:relative;padding:14px}
.banner-card h4{margin:0 0 4px;font-size:14px;color:var(--brown)}.banner-card p{margin:0;font-size:12px;color:var(--muted)}
.hidden{display:none!important}
.tier-badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700}
.t-dong{background:#f5e6d3;color:#8B5A2B}.t-bac{background:#e8eef5;color:#64748b}
.t-vang{background:#fff3cd;color:#b8860b}.t-kimcuong{background:#e0f2fe;color:#0284c7}
#orderDetailBox{display:none;position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9999;align-items:center;justify-content:center;padding:12px}
#orderDetailBox.show{display:flex}
.invoice-wrap{background:#faf6ef;border-radius:12px;max-width:720px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.invoice{padding:28px 28px 0;position:relative;background:#faf6ef}
.inv-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
.inv-shop{display:flex;align-items:center;gap:10px}
.inv-shop .logo{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#d4a84b,#8B4513);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px}
.inv-shop .name{font-size:14px;font-weight:800;color:#1e4d8c}
.inv-shop .sub{font-size:12px;color:#5a7a9a}
.inv-barcode{text-align:center;margin:4px 0 8px}
.inv-barcode svg{max-width:100%}
.inv-barcode .code{font-size:11px;color:#555;margin-top:2px;letter-spacing:.5px}
.inv-title{text-align:center;font-size:26px;font-weight:900;color:#2c3e50;letter-spacing:1px;margin:12px 0 18px;text-transform:uppercase}
.inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px}
.inv-box h4{margin:0 0 8px;font-size:13px;color:#1e4d8c;font-weight:800}
.inv-box p{margin:4px 0;font-size:13px;color:#333;line-height:1.45}
.inv-box .label{color:#666}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:13px}
.inv-table th{text-align:left;color:#1e4d8c;font-weight:700;padding:8px 6px;border-bottom:2px solid #c5d4e8;font-size:12px}
.inv-table td{padding:8px 6px;border-bottom:1px solid #e5e0d5;color:#333}
.inv-table .num{text-align:center}.inv-table .money{text-align:right}
.inv-sums{margin-left:auto;width:280px;font-size:13px}
.inv-sums .row{display:flex;justify-content:space-between;padding:6px 0;color:#444}
.inv-total{background:#8B5A2B;color:#fff;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:15px;margin:12px 0 18px}
.inv-pay{margin-bottom:14px}
.inv-pay h4{margin:0 0 8px;font-size:13px;color:#1e4d8c}
.inv-pay p{margin:3px 0;font-size:12px;color:#555}
.inv-stamp{position:absolute;right:32px;bottom:130px;width:96px;height:96px;border:3px solid #c0392b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#c0392b;font-weight:900;font-size:13px;transform:rotate(-18deg);opacity:.85;pointer-events:none;letter-spacing:1px}
.inv-foot{background:#8B5A2B;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:16px 22px;margin:0 -28px 0;flex-wrap:wrap;gap:12px}
.inv-foot .brand{font-size:16px;font-weight:800}
.inv-foot .contact{font-size:11px;line-height:1.6;opacity:.95}
.inv-actions{padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;background:#fff;border-top:1px solid #e8d9c4;position:sticky;bottom:0}
@media(max-width:600px){.inv-grid{grid-template-columns:1fr}.inv-title{font-size:20px}.inv-sums{width:100%}.inv-stamp{right:12px;bottom:150px;width:72px;height:72px;font-size:11px}}
@media print{.inv-actions,#orderDetailBox{position:static!important;background:none!important;padding:0!important}.invoice-wrap{box-shadow:none;max-height:none}.sidebar,.layout>aside,.topbar,.kpis,.panel:not(.print-hide){}}
</style>
</head>
<body>
<div id="loginBox">
  <h1>Thuộc Cô Ba Admin</h1>
  <p>Quản trị đơn hàng · Hội viên · Báo cáo</p>
  <input id="pwd" type="password" placeholder="Mật khẩu admin" onkeydown="if(event.key==='Enter')login()"/>
  <button type="button" onclick="login()">Đăng nhập</button>
  <div id="loginErr" class="err"></div>
</div>
<div id="app" class="layout" style="display:none">
  <aside class="sidebar">
    <div class="brand"><div class="brand-badge">CB</div><div><h1>Thuộc Cô Ba</h1><span>Admin Panel</span></div></div>
    <nav class="nav">
      <button type="button" class="on" id="navOrders" onclick="showView('orders')">📦 Đơn hàng</button>
      <button type="button" id="navDash" onclick="showView('dash')">📊 Tổng quan</button>
      <button type="button" id="navLoyalty" onclick="showView('loyalty')">🎖️ Hội viên & Tích điểm</button>
      <button type="button" id="navBanner" onclick="showView('banner')">🖼️ Banner</button>
      <button type="button" onclick="exportCSV()">⬇ Xuất CSV</button>
      <button type="button" onclick="logout()">🚪 Đăng xuất</button>
    </nav>
  </aside>
  <main class="main">
    <div class="topbar">
      <div><h2 id="pageTitle">Đơn hàng</h2><div class="sub" id="lastUpdated">—</div></div>
      <div class="actions">
        <button type="button" class="btn-ghost" onclick="loadOrders()">↻ Đồng bộ</button>
        <button type="button" class="btn-gold" onclick="exportCSV()">Xuất CSV</button>
      </div>
    </div>
    <div class="kpis" id="statsCards"></div>
    <div id="viewOrders">
      <div class="panel">
        <div class="panel-title">📅 Bộ lọc</div>
        <div class="filters">
          <button type="button" class="chip" id="fToday" onclick="setRange('today')">Hôm nay</button>
          <button type="button" class="chip" id="f7" onclick="setRange('7d')">7 ngày</button>
          <button type="button" class="chip on" id="f30" onclick="setRange('30d')">30 ngày</button>
          <button type="button" class="chip" id="fAll" onclick="setRange('all')">Tất cả</button>
          <input type="date" id="fromDate"/><span class="muted">→</span><input type="date" id="toDate"/>
          <button type="button" class="chip" onclick="setRange('custom')">Áp dụng</button>
        </div>
        <div class="filters">
          <input type="search" id="q" placeholder="Tìm mã đơn, khách, SĐT..." style="flex:1;min-width:180px" oninput="applyFilters()"/>
          <select id="statusFilter" onchange="applyFilters()">
            <option value="">Mọi trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="preparing">Đang chuẩn bị</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">📋 Danh sách đơn <span class="muted" id="filterInfo"></span></div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách / SP</th><th>Tổng</th><th>TT</th><th>Thao tác</th></tr></thead>
            <tbody id="tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="viewDash" class="hidden">
      <div class="panel"><div class="panel-title">📈 Phân bổ trạng thái</div><div class="chart" id="statusChart"></div></div>
      <div class="panel"><div class="panel-title">💡 Gợi ý vận hành</div><p class="muted" id="insights" style="line-height:1.6;margin:0">—</p></div>
    </div>
    <div id="viewLoyalty" class="hidden">
      <div class="panel"><div class="panel-title">🎖️ Hội viên theo hạng</div><div class="kpis" id="tierCards"></div></div>
      <div class="panel"><div class="panel-title">🏆 Top khách hàng theo điểm</div>
        <div style="overflow-x:auto"><table><thead><tr><th>SĐT</th><th>Tên</th><th>Điểm</th><th>Hạng</th><th>Cập nhật</th></tr></thead><tbody id="customersBody"></tbody></table></div>
      </div>
      <div class="panel"><div class="panel-title">🎁 Quà đã đổi (chờ giao)</div>
        <div style="overflow-x:auto"><table><thead><tr><th>SĐT</th><th>Quà</th><th>Điểm</th><th>Trạng thái</th><th>Thời gian</th><th>Thao tác</th></tr></thead><tbody id="redemptionsBody"></tbody></table></div>
      </div>
    </div>
    <div id="viewBanner" class="hidden">
      <div class="panel"><div class="panel-title">🖼️ Banner &amp; chiến dịch</div>
        <div class="banner-grid">
          <div class="banner-card"><div class="bg" style="background-image:url('https://images.unsplash.com/photo-1555939594-58edc776e4b2?w=600')"></div><div class="body"><h4>OCOP 4 sao</h4><p>Cam kết ATVSTP · HACCP.</p></div></div>
          <div class="banner-card"><div class="bg" style="background-image:url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600')"></div><div class="body"><h4>Freeship từ 500k</h4><p>Mã COBAFREESHIP.</p></div></div>
          <div class="banner-card"><div class="bg" style="background-image:url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600')"></div><div class="body"><h4>Combo tiết kiệm</h4><p>Mắm mực + mắm cái.</p></div></div>
        </div>
      </div>
    </div>
  </main>
</div>

<div id="orderDetailBox" onclick="if(event.target===this)closeOrderDetail()">
  <div class="invoice-wrap" onclick="event.stopPropagation()">
    <div class="invoice" id="invoiceBody"></div>
    <div class="inv-actions">
      <button type="button" class="btn-ghost" onclick="closeOrderDetail()">Đóng</button>
      <button type="button" class="btn-ghost" onclick="copyOrderDetail()">📋 Copy tin nhắn</button>
      <button type="button" class="btn-gold" onclick="printInvoice()">🖨 In hoá đơn</button>
    </div>
  </div>
</div>

<script>
var STATUS_LABEL={pending:'Chờ xác nhận',preparing:'Đang chuẩn bị',shipping:'Đang giao',completed:'Đã giao',cancelled:'Đã hủy'};
var TIERS=[{key:'dong',label:'Đồng',minPoints:0,cls:'t-dong'},{key:'bac',label:'Bạc',minPoints:200,cls:'t-bac'},{key:'vang',label:'Vàng',minPoints:500,cls:'t-vang'},{key:'kimcuong',label:'Kim Cương',minPoints:1000,cls:'t-kimcuong'}];
function tierOf(p){var c=TIERS[0];TIERS.forEach(function(t){if(p>=t.minPoints)c=t});return c}
var allOrders=[],rangeMode='30d',fromTs=null,toTs=null,ADMIN_PASS='thuoccoba2026';
window._lastOrderMsg='';
function getPwd(){return sessionStorage.getItem('admin_pwd')||''}
function login(){var p=(document.getElementById('pwd').value||'').trim(),err=document.getElementById('loginErr');if(!p){err.textContent='Vui lòng nhập mật khẩu';return}if(p!==ADMIN_PASS){err.textContent='Sai mật khẩu';return}sessionStorage.setItem('admin_pwd',p);err.textContent='';document.getElementById('loginBox').style.display='none';document.getElementById('app').style.display='grid';setRange('30d');loadOrders()}
function logout(){sessionStorage.removeItem('admin_pwd');location.reload()}
function showView(v){document.getElementById('viewOrders').classList.toggle('hidden',v!=='orders');document.getElementById('viewDash').classList.toggle('hidden',v!=='dash');document.getElementById('viewLoyalty').classList.toggle('hidden',v!=='loyalty');document.getElementById('viewBanner').classList.toggle('hidden',v!=='banner');document.getElementById('navOrders').classList.toggle('on',v==='orders');document.getElementById('navDash').classList.toggle('on',v==='dash');document.getElementById('navLoyalty').classList.toggle('on',v==='loyalty');document.getElementById('navBanner').classList.toggle('on',v==='banner');document.getElementById('pageTitle').textContent={orders:'Đơn hàng',dash:'Tổng quan',loyalty:'Hội viên & Tích điểm',banner:'Banner'}[v]||'';if(v==='dash')renderDash();if(v==='loyalty')loadLoyalty()}
function startOfDay(d){var x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function endOfDay(d){var x=new Date(d);x.setHours(23,59,59,999);return x.getTime()}
function setRange(mode){rangeMode=mode;var now=new Date();['fToday','f7','f30','fAll'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('on')});if(mode==='today'){fromTs=startOfDay(now);toTs=endOfDay(now);document.getElementById('fToday').classList.add('on')}else if(mode==='7d'){fromTs=startOfDay(new Date(now.getTime()-6*864e5));toTs=endOfDay(now);document.getElementById('f7').classList.add('on')}else if(mode==='30d'){fromTs=startOfDay(new Date(now.getTime()-29*864e5));toTs=endOfDay(now);document.getElementById('f30').classList.add('on')}else if(mode==='all'){fromTs=null;toTs=null;document.getElementById('fAll').classList.add('on')}else if(mode==='custom'){var f=document.getElementById('fromDate').value,t=document.getElementById('toDate').value;fromTs=f?startOfDay(f):null;toTs=t?endOfDay(t):null}applyFilters()}
function money(n){return Number(n||0).toLocaleString('vi-VN')}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function filteredList(){var q=(document.getElementById('q').value||'').trim().toLowerCase(),st=document.getElementById('statusFilter').value;return allOrders.filter(function(o){var ts=new Date(o.createdAt).getTime();if(fromTs!=null&&ts<fromTs)return false;if(toTs!=null&&ts>toTs)return false;if(st&&o.status!==st)return false;if(q){var s=o.shippingInfo||{},items=(o.items||[]).map(function(i){return i.name||''}).join(' '),hay=[o.id,s.fullName,s.phone,s.address,o.note,o.cancelReason,items].join(' ').toLowerCase();if(hay.indexOf(q)===-1)return false}return true})}
function renderStats(list){var c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0},revenue=0,active=0,cancelAmt=0;list.forEach(function(o){if(c[o.status]!=null)c[o.status]++;var t=Number(o.total||0);if(o.status==='completed')revenue+=t;if(o.status==='cancelled')cancelAmt+=t;else active+=t});var done=list.filter(function(o){return o.status==='completed'}),aov=done.length?Math.round(revenue/done.length):0;document.getElementById('statsCards').innerHTML='<div class="kpi"><div class="label">Đơn (lọc)</div><div class="value">'+list.length+'</div></div><div class="kpi"><div class="label">Doanh thu đã giao</div><div class="value">'+money(revenue)+'đ</div></div><div class="kpi"><div class="label">Giá trị hiệu lực</div><div class="value">'+money(active)+'đ</div></div><div class="kpi"><div class="label">AOV đã giao</div><div class="value">'+money(aov)+'đ</div></div><div class="kpi"><div class="label">Đang xử lý</div><div class="value">'+(c.pending+c.preparing+c.shipping)+'</div><div class="hint">Chờ '+c.pending+'</div></div><div class="kpi"><div class="label">Đã hủy</div><div class="value">'+c.cancelled+'</div><div class="hint">'+money(cancelAmt)+'đ</div></div>'}
function renderDash(){var list=filteredList(),c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0};list.forEach(function(o){if(c[o.status]!=null)c[o.status]++});var max=Math.max(1,c.pending,c.preparing,c.shipping,c.completed,c.cancelled),keys=['pending','preparing','shipping','completed','cancelled'];document.getElementById('statusChart').innerHTML=keys.map(function(k){var h=Math.round((c[k]/max)*100),short=(STATUS_LABEL[k]||k).split(' ').pop();return '<div class="bar-wrap"><div class="bar" style="height:'+h+'%"></div><div class="bar-label">'+short+'<br/>'+c[k]+'</div></div>'}).join('');var tip='Hệ thống ổn định.';if(c.pending>=3)tip='Có '+c.pending+' đơn chờ xác nhận — ưu tiên xử lý trong ngày.';else if(c.cancelled>c.completed&&list.length>2)tip='Tỷ lệ hủy cao — kiểm tra phí ship / mô tả SP.';else if(c.shipping>0)tip='Có đơn đang giao — theo dõi vận chuyển.';document.getElementById('insights').textContent=tip}

function buildOrderMessage(o){
  var s=o.shippingInfo||{},items=o.items||[];
  var products=items.length?items.map(function(i){return (i.name||'SP')+' x'+(i.quantity||1)}).join(', '):'—';
  var qty=items.reduce(function(n,i){return n+(Number(i.quantity)||1)},0);
  var time=o.createdAt?new Date(o.createdAt).toLocaleString('vi-VN'):'—';
  var ship=Number(o.shippingFee||0),total=Number(o.total||0);
  var sub=o.subTotal!=null?Number(o.subTotal):total-ship;
  return '📋 THÔNG TIN ĐƠN HÀNG 📋\\n👤 Tên khách hàng: '+(s.fullName||'—')+'\\n📍 Địa chỉ: '+(s.address||'—')+'\\n📞 Liên hệ (SĐT): '+(s.phone||'—')+'\\n🛍️ Sản phẩm: '+products+'\\n📦 Số lượng: '+qty+'\\n💵 Tổng giá tiền: '+money(sub)+'đ\\n🚚 Phí ship: '+money(ship)+'đ\\n💰 TỔNG THANH TOÁN: '+money(total)+'đ\\n📝 Ghi chú từ khách: '+(o.note||'Không có')+'\\n⏰ Thời gian đặt: '+time+'\\n💳 Hình thức thanh toán: '+(o.paymentMethod==='COD'||!o.paymentMethod?'Thanh toán khi nhận hàng (COD)':o.paymentMethod);
}

function openOrderDetail(orderId){
  var o=allOrders.find(function(x){return x.id===orderId});
  if(!o)return;
  window._lastOrderMsg=buildOrderMessage(o);
  var s=o.shippingInfo||{},items=o.items||[];
  var created=o.createdAt?new Date(o.createdAt):null;
  var timeStr=created?created.toLocaleTimeString('vi-VN'):'—';
  var dateStr=created?created.toLocaleDateString('vi-VN'):'—';
  var ship=Number(o.shippingFee||0),total=Number(o.total||0);
  var sub=o.subTotal!=null?Number(o.subTotal):total-ship;
  var payLabel=o.paymentMethod==='COD'||!o.paymentMethod?'COD':escapeHtml(o.paymentMethod);
  var statusLabel=STATUS_LABEL[o.status]||o.status||'Đã xác nhận';
  var barcodeVal=String(o.id).replace(/[^0-9A-Za-z]/g,'').slice(-16)||String(o.id);
  var rows=items.length?items.map(function(i){
    var line=Number(i.price||0)*Number(i.quantity||1);
    return '<tr><td>'+escapeHtml(i.name||'Sản phẩm')+'</td><td class="num">'+(i.quantity||1)+'</td><td class="money">'+money(i.price)+'đ</td><td class="money">'+money(line)+'đ</td></tr>';
  }).join(''):'<tr><td colspan="4" class="muted">Không có sản phẩm</td></tr>';

  document.getElementById('invoiceBody').innerHTML=
    '<div class="inv-head"><div class="inv-shop"><div class="logo">CB</div><div><div class="name">Hộ kinh doanh Thuộc Cô Ba ✓</div><div class="sub">Đặc sản Tam Quan</div></div></div><div style="font-size:11px;color:#a08060;text-align:right">Mắm ruốc · Mắm mực<br/>OCOP 4 sao</div></div>'+
    '<div class="inv-barcode"><svg id="invBarcode"></svg><div class="code">'+escapeHtml(o.id)+'</div></div>'+
    '<div class="inv-title">Hoá đơn bán hàng</div>'+
    '<div class="inv-grid"><div class="inv-box"><h4>Thông tin khách hàng</h4><p><span class="label">Họ &amp; tên:</span> <b>'+escapeHtml(s.fullName||'—')+'</b></p><p><span class="label">Số điện thoại:</span> '+escapeHtml(s.phone||'—')+'</p><p><span class="label">Địa chỉ:</span> '+escapeHtml(s.address||'—')+'</p></div>'+
    '<div class="inv-box"><h4>Chi tiết đơn hàng</h4><p><span class="label">Thời gian đặt:</span> '+timeStr+'</p><p><span class="label">Ngày/tháng/năm:</span> '+dateStr+'</p><p><span class="label">Ghi chú từ khách:</span> '+escapeHtml(o.note||'Không có')+'</p></div></div>'+
    '<h4 style="margin:0 0 8px;font-size:13px;color:#1e4d8c">Danh sách sản phẩm</h4>'+
    '<table class="inv-table"><thead><tr><th>Sản phẩm</th><th class="num">SL</th><th class="money">Đơn giá</th><th class="money">Thành tiền</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div class="inv-sums"><div class="row"><span>Tổng giá trị đơn</span><b>'+money(sub)+'đ</b></div><div class="row"><span>Phí vận chuyển</span><b>'+money(ship)+'đ</b></div></div>'+
    '<div class="inv-total"><span>Tổng thanh toán</span><span>'+money(total)+'đ</span></div>'+
    '<div class="inv-pay"><h4>Payment Information</h4><p>Mã đơn hàng: <b>'+escapeHtml(o.id)+'</b></p><p>Đơn vị vận chuyển: J&amp;T Express</p><p>Hình thức: '+payLabel+'</p><p>Tình trạng đơn hàng: <b>'+escapeHtml(statusLabel)+'</b></p></div>'+
    '<div class="inv-stamp">CONFIRM</div>'+
    '<div class="inv-foot"><div class="brand">Thuộc Cô Ba Store</div><div class="contact">☎ 0977 322 861<br/>🌐 https://zalo.me/s/1175503438081610646/<br/>✉ thetam7716@gmail.com<br/>⌂ 1117/5 Võ Nguyên Giáp · Hoài Nhơn · Gia Lai</div></div>';

  document.getElementById('orderDetailBox').classList.add('show');
  setTimeout(function(){
    try{
      JsBarcode('#invBarcode', barcodeVal, {format:'CODE128',width:1.4,height:48,displayValue:false,margin:0,background:'#faf6ef'});
    }catch(e){console.warn('Barcode:',e)}
  },50);
}
function closeOrderDetail(){document.getElementById('orderDetailBox').classList.remove('show')}
function copyOrderDetail(){var t=window._lastOrderMsg||'';if(!t)return;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){alert('Đã copy mẫu tin nhắn!')})}else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);alert('Đã copy mẫu tin nhắn!')}}
function printInvoice(){window.print()}

async function loadLoyalty(){var pwd=getPwd();try{var custRes=await fetch('/api/admin/customers',{headers:{'x-admin-password':pwd}});var customers=await custRes.json();if(!Array.isArray(customers))customers=[];var counts={dong:0,bac:0,vang:0,kimcuong:0};customers.forEach(function(c){counts[tierOf(c.points).key]++});document.getElementById('tierCards').innerHTML=TIERS.map(function(t){return '<div class="kpi"><div class="label">Hạng '+t.label+'</div><div class="value">'+(counts[t.key]||0)+'</div><div class="hint">khách</div></div>'}).join('')+'<div class="kpi"><div class="label">Tổng hội viên</div><div class="value">'+customers.length+'</div></div>';document.getElementById('customersBody').innerHTML=customers.length?customers.slice(0,100).map(function(c){var t=tierOf(c.points);return '<tr><td>'+escapeHtml(c.phone)+'</td><td>'+escapeHtml(c.full_name||'—')+'</td><td><b>'+c.points+'</b></td><td><span class="tier-badge '+t.cls+'">'+t.label+'</span></td><td class="muted">'+(c.updated_at?new Date(c.updated_at).toLocaleString('vi-VN'):'—')+'</td></tr>'}).join(''):'<tr><td colspan="5" class="muted">Chưa có hội viên</td></tr>';var redRes=await fetch('/api/admin/redemptions',{headers:{'x-admin-password':pwd}});var redemptions=await redRes.json();if(!Array.isArray(redemptions))redemptions=[];document.getElementById('redemptionsBody').innerHTML=redemptions.length?redemptions.map(function(r){var badgeCls=r.status==='fulfilled'?'completed':'pending';var btn=r.status==='fulfilled'?'<span class="muted">Đã giao</span>':'<button type="button" class="b-ok" onclick="fulfillRedemption('+r.id+')">Đánh dấu đã giao</button>';return '<tr><td>'+escapeHtml(r.phone)+'</td><td>'+escapeHtml(r.gift_label)+'</td><td>'+r.points_cost+'</td><td><span class="badge '+badgeCls+'">'+(r.status==='fulfilled'?'Đã giao':'Chờ giao')+'</span></td><td class="muted">'+new Date(r.created_at).toLocaleString('vi-VN')+'</td><td>'+btn+'</td></tr>'}).join(''):'<tr><td colspan="6" class="muted">Chưa có lượt đổi quà</td></tr>'}catch(e){console.error(e)}}
async function fulfillRedemption(id){var pwd=getPwd();try{var res=await fetch('/api/admin/redemptions/'+id+'/fulfill',{method:'PATCH',headers:{'x-admin-password':pwd}});if(!res.ok){alert('Lỗi cập nhật');return}loadLoyalty()}catch(e){alert(e.message)}}
function applyFilters(){var list=filteredList();renderStats(list);var labelMap={today:'Hôm nay','7d':'7 ngày','30d':'30 ngày',all:'Tất cả',custom:'Tùy chọn'};document.getElementById('filterInfo').textContent=' · '+(labelMap[rangeMode]||'')+' · '+list.length+'/'+allOrders.length;var tbody=document.getElementById('tbody');if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="muted">Không có đơn trong bộ lọc</td></tr>';return}
tbody.innerHTML=list.map(function(o){var s=o.shippingInfo||{},st=o.status||'pending',items=o.items||[];
var products=items.length?'<div class="products">'+items.map(function(i){return escapeHtml(i.name||'SP')+' ×'+(i.quantity||1)}).join('<br/>')+'</div>':'';
var note=o.note?'<div class="products">Ghi chú: '+escapeHtml(o.note)+'</div>':'';
var cancel=(st==='cancelled'&&o.cancelReason)?'<div class="products" style="color:#c0392b">Hủy: '+escapeHtml(o.cancelReason)+'</div>':'';
var time=o.createdAt?new Date(o.createdAt).toLocaleString('vi-VN'):'—';
return '<tr><td><span class="order-id" onclick="openOrderDetail(\\''+o.id+'\\')">'+escapeHtml(o.id)+'</span><div class="muted" style="font-size:10px;cursor:pointer" onclick="openOrderDetail(\\''+o.id+'\\')">Xem hoá đơn</div></td><td>'+time+'</td><td>'+escapeHtml(s.fullName||'—')+'<br/><span class="muted">'+escapeHtml(s.phone||'')+'</span><br/><span class="muted">'+escapeHtml(s.address||'')+'</span>'+products+note+cancel+'</td><td><b>'+money(o.total)+'đ</b><div class="muted">'+escapeHtml(o.paymentMethod||'COD')+'</div></td><td><span class="badge '+st+'">'+(STATUS_LABEL[st]||st)+'</span></td><td><div class="row-btns"><button type="button" class="b-prep" onclick="setStatus(\\''+o.id+'\\',\\'preparing\\')">Chuẩn bị</button><button type="button" class="b-ship" onclick="setStatus(\\''+o.id+'\\',\\'shipping\\')">Giao</button><button type="button" class="b-ok" onclick="setStatus(\\''+o.id+'\\',\\'completed\\')">Xong</button><button type="button" class="b-bad" onclick="setStatus(\\''+o.id+'\\',\\'cancelled\\')">Hủy</button><button type="button" class="b-jnt" onclick="printJnT(\\''+o.id+'\\')">J&amp;T</button></div></td></tr>'}).join('');
if(!document.getElementById('viewDash').classList.contains('hidden'))renderDash()}
async function loadOrders(){try{var res=await fetch('/api/orders');allOrders=await res.json();if(!Array.isArray(allOrders))allOrders=[];document.getElementById('lastUpdated').textContent='Cập nhật '+new Date().toLocaleString('vi-VN')+' · '+allOrders.length+' đơn toàn hệ thống';applyFilters()}catch(e){alert('Không tải được đơn: '+e.message)}}
async function setStatus(orderId,status){var pwd=getPwd();if(!pwd){logout();return}try{var body={status:status};if(status==='cancelled')body.reason=prompt('Lý do hủy:','Hủy bởi admin')||'Hủy bởi admin';var res=await fetch('/api/orders/'+encodeURIComponent(orderId)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json','x-admin-password':pwd},body:JSON.stringify(body)});var data=await res.json();if(!res.ok){alert(data.error||'Lỗi');if(res.status===401)logout();return}loadOrders()}catch(e){alert(e.message)}}
function exportCSV(){var list=filteredList();if(!list.length){alert('Không có dữ liệu');return}var rows=[['Mã','Thời gian','Khách','SĐT','Địa chỉ','SP','Tổng','Trạng thái','Ghi chú','Lý do hủy']];list.forEach(function(o){var s=o.shippingInfo||{};rows.push([o.id,o.createdAt||'',s.fullName||'',s.phone||'',s.address||'',(o.items||[]).map(function(i){return (i.name||'')+' x'+(i.quantity||1)}).join('; '),o.total||0,o.status||'',o.note||'',o.cancelReason||''])});var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"'}).join(',')}).join('\\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='thuoc-co-ba-orders.csv';a.click()}
function printJnT(orderId){var o=allOrders.find(function(x){return x.id===orderId});if(!o){alert('Không tìm thấy đơn');return}var s=o.shippingInfo||{},items=o.items||[];var productNames=items.length?items.map(function(i){return (i.name||'SP')+' x'+(i.quantity||1)}).join(', '):'Mini App Thuộc Cô Ba Store';var total=money(o.total),phone=s.phone||'',fullName=s.fullName||'Khách',address=s.address||'—',orderCode=String(o.id);var barcodeValue=orderCode.replace(/[^0-9A-Za-z]/g,'').slice(-12)||orderCode;var sortCode=(orderCode.replace(/\\D/g,'').slice(-6)||orderCode.slice(-6)).toUpperCase();var html='<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>J&T '+orderCode+'</title><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\\/script><style>@page{size:100mm 150mm;margin:0}body{font-family:Arial;width:100mm}table{width:100%;border-collapse:collapse}td{border:1.5px solid #000;padding:2mm;font-size:11px;vertical-align:top}.sort{font-size:24px;font-weight:900;text-align:center}</style></head><body><table><tr><td><b>Thuộc Cô Ba</b></td><td style="color:#e11d48;font-weight:900">J&T EXPRESS</td><td>ET</td></tr><tr><td colspan="3" style="text-align:center"><svg id="barcode"></svg><div>'+barcodeValue+'</div></td></tr><tr><td colspan="3" class="sort">'+sortCode+'</td></tr><tr><td colspan="2"><b>Gửi:</b> Kho Thuộc Cô Ba · 0977322861<br/>1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai<br/><br/><b>Nhận:</b> '+fullName+' '+phone+'<br/>'+address+'</td><td style="text-align:center"><canvas id="qrcode"></canvas></td></tr><tr><td colspan="2">Hàng: '+productNames+'<br/>COD</td><td style="text-align:center;font-weight:900">'+total+' đ<br/>COD</td></tr></table><script>try{JsBarcode("#barcode","'+barcodeValue+'",{format:"CODE128",width:1.3,height:40,displayValue:false})}catch(e){}try{QRCode.toCanvas(document.getElementById("qrcode"),"'+orderCode+'",{width:80,margin:0})}catch(e){}setTimeout(function(){print()},400)<\\/script></body></html>';var w=window.open('','blank','width=420,height=720');w.document.write(html);w.document.close()}
if(getPwd()===ADMIN_PASS){document.getElementById('loginBox').style.display='none';document.getElementById('app').style.display='grid';setRange('30d');loadOrders()}
</script>
</body>
</html>`;
}

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API (PostgreSQL) đang chạy ổn định!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server chạy cổng", PORT));
