const express = require("express");
const CryptoJS = require("crypto-js");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_KEY = "fe49f1b0e06649e498929a7379cfdfbf";
const ADMIN_PASSWORD = "thuoccoba2026";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
}) : null;

async function initDB() {
  if (!pool) {
    console.error("⚠️ THIẾU DATABASE_URL — server vẫn chạy nhưng không lưu đơn được!");
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
    console.log("Database PostgreSQL sẵn sàng (bảng orders).");
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

app.post("/api/get-phone-number", async (req, res) => {
  try {
    const { token, accessToken } = req.body;
    const APP_SECRET_KEY = process.env.ZALO_APP_SECRET_KEY || process.env.ZALO_SECRET_KEY;
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
    const result = await pool.query("SELECT data FROM orders ORDER BY created_at DESC");
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
    const result = await pool.query("SELECT data FROM orders WHERE id = $1", [orderId]);
    if (!result.rows.length) return res.status(404).json({ error: "Không tìm thấy đơn" });

    const order = result.rows[0].data;
    const a = normalizePhone(phone);
    const b = normalizePhone(order.shippingInfo?.phone);
    if (a && b && a !== b) {
      return res.status(403).json({ error: "Bạn không có quyền hủy đơn này" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ error: "Chỉ hủy được đơn đang chờ xác nhận" });
    }
    const created = new Date(order.createdAt).getTime();
    if (Number.isNaN(created) || Date.now() - created > TWO_HOURS_MS) {
      return res.status(400).json({ error: "Đã quá 2 giờ — không thể hủy đơn." });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Vui lòng chọn lý do hủy" });
    }

    order.status = "cancelled";
    order.cancelReason = String(reason).trim();
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = order.cancelledAt;

    await pool.query("UPDATE orders SET data = $1, status = $2 WHERE id = $3", [
      order,
      "cancelled",
      orderId,
    ]);
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
  const allowed = ["pending", "preparing", "shipping", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ" });
  }
  try {
    const result = await pool.query("SELECT data FROM orders WHERE id = $1", [orderId]);
    if (!result.rows.length) return res.status(404).json({ error: "Không tìm thấy đơn" });

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

    await pool.query("UPDATE orders SET data = $1, status = $2 WHERE id = $3", [
      order,
      status,
      orderId,
    ]);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi cập nhật trạng thái" });
  }
});

app.post("/api/create-mac", (req, res) => {
  try {
    const body = req.body;
    const dataMac = Object.keys(body)
      .sort()
      .map((key) => {
        const value = typeof body[key] === "object" ? JSON.stringify(body[key]) : body[key];
        return `${key}=${value}`;
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
    if (!data || !mac) return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    const { appId, orderId, method, extradata, resultCode } = data;
    const str = `appId=${appId}&orderId=${orderId}&method=${method}`;
    if (CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString() !== mac) {
      return res.json({ returnCode: 0, returnMessage: "Invalid mac" });
    }
    try {
      const extra = typeof extradata === "string" ? JSON.parse(extradata) : extradata;
      const myOrderId = extra?.orderId;
      if (myOrderId) {
        const result = await pool.query("SELECT data FROM orders WHERE id = $1", [myOrderId]);
        if (result.rows.length) {
          const order = result.rows[0].data;
          if ((String(resultCode) === "1" || resultCode === 1) && order.status !== "cancelled") {
            order.status = "preparing";
            order.confirmedAt = new Date().toISOString();
            order.updatedAt = order.confirmedAt;
            await pool.query("UPDATE orders SET data = $1, status = $2 WHERE id = $3", [
              order,
              "preparing",
              myOrderId,
            ]);
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
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thuộc Cô Ba · Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#f8f5f0; --panel:#ffffff; --card:#ffffff; --line:#e6decc;
  --gold:#b8860b; --gold2:#d4af37; --brown:#5c3a21; --text:#2c221e; --muted:#7a6d63;
  --ok:#16a34a; --warn:#d97706; --bad:#dc2626; --info:#2563eb;
}
*{box-sizing:border-box}body{margin:0;font-family:'Be Vietnam Pro',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
a{color:inherit;text-decoration:none}button,input,select{font:inherit}
button{cursor:pointer;border:none;border-radius:10px;padding:9px 14px;font-weight:600;transition:.15s}
button:hover{filter:brightness(0.95)}
.layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
.sidebar{background:linear-gradient(180deg,#fffaf0 0%,#f3ebd8 100%);border-right:1px solid var(--line);padding:20px 14px;position:sticky;top:0;height:100vh}
.brand{display:flex;gap:10px;align-items:center;padding:8px 10px 22px}
.brand-badge{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--gold2),var(--brown));display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff}
.brand h1{font-size:14px;margin:0;line-height:1.25;color:var(--brown)}.brand span{font-size:11px;color:var(--muted)}
.nav button{width:100%;text-align:left;background:transparent;color:var(--muted);margin-bottom:4px;display:flex;gap:10px;align-items:center;font-weight:600}
.nav button.on,.nav button:hover{background:rgba(184,134,11,.12);color:var(--brown)}
.main{padding:20px 22px 40px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.topbar h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--brown)}
.topbar .sub{color:var(--muted);font-size:12px;margin-top:4px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn-gold{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#fff;box-shadow:0 2px 6px rgba(184,134,11,0.3)}
.btn-ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.hero{
  border-radius:18px;overflow:hidden;margin-bottom:18px;position:relative;
  background:linear-gradient(120deg,#5c3a21 0%,#8b5a2b 100%);
  color:#fff;border:1px solid var(--line);min-height:140px;padding:22px 24px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  box-shadow:0 4px 15px rgba(92,58,33,0.15);
}
.hero h3{margin:0 0 6px;font-size:20px;color:#fff}
.hero p{margin:0;color:#f3ebd8;font-size:13px;max-width:520px;line-height:1.5}
.hero-chip{background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:12px;margin-bottom:16px}
@media(max-width:1100px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:0 2px 6px rgba(0,0,0,0.02)}
.kpi .label{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.kpi .value{font-size:22px;font-weight:800;margin-top:6px;color:var(--brown)}
.kpi .hint{font-size:11px;color:var(--muted);margin-top:4px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.03)}
.panel-title{font-size:14px;font-weight:700;margin:0 0 12px;display:flex;align-items:center;gap:8px;color:var(--brown)}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.chip{background:#f3ebd8;border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:8px 14px;font-size:12px;font-weight:600}
.chip.on{background:var(--brown);border-color:var(--brown);color:#fff}
input,select{background:#fff;border:1px solid var(--line);color:var(--text);border-radius:10px;padding:9px 12px}
input::placeholder{color:#a89a8c}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--muted);font-weight:700;padding:10px 8px;border-bottom:2px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
td{padding:12px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:#fef3c7;color:#b45309}
.preparing{background:#dbeafe;color:#1d4ed8}
.shipping{background:#e0e7ff;color:#4338ca}
.completed{background:#dcfce7;color:#15803d}
.cancelled{background:#fee2e2;color:#b91c1c}
.row-btns{display:flex;flex-wrap:wrap;gap:4px}
.row-btns button{font-size:11px;padding:5px 8px;border-radius:8px}
.b-prep{background:#dbeafe;color:#1d4ed8}.b-ship{background:#e0e7ff;color:#4338ca}
.b-ok{background:#dcfce7;color:#15803d}.b-bad{background:#fee2e2;color:#b91c1c}
.b-jnt{background:#ffedd5;color:#c2410c}
.muted{color:var(--muted);font-size:12px}
.products{font-size:11px;color:#5c3a21;margin-top:4px;line-height:1.4;font-weight:500}
.chart{display:flex;align-items:flex-end;gap:8px;height:110px;padding-top:8px}
.bar-wrap{flex:1;text-align:center}
.bar{background:linear-gradient(180deg,var(--gold2),var(--brown));border-radius:8px 8px 4px 4px;min-height:4px;transition:height .3s}
.bar-label{font-size:10px;color:var(--muted);margin-top:6px}
#loginBox{max-width:400px;margin:12vh auto;background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,0.05)}
#loginBox h1{margin:0 0 4px;font-size:22px;color:var(--brown)}#loginBox p{color:var(--muted);font-size:13px}
#loginBox input{width:100%;margin:14px 0}
#loginBox button{width:100%;background:linear-gradient(135deg,var(--gold2),var(--brown));color:#fff}
.err{color:var(--bad);font-size:13px;margin-top:8px}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.banner-card{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:#faf6ed;min-height:120px;position:relative}
.banner-card .bg{position:absolute;inset:0;opacity:.25;background-size:cover;background-position:center}
.banner-card .body{position:relative;padding:14px}
.banner-card h4{margin:0 0 4px;font-size:14px;color:var(--brown)}.banner-card p{margin:0;font-size:12px;color:var(--muted)}
.hidden{display:none!important}
</style>
</head>
<body>
<div id="loginBox">
  <h1>Thuộc Cô Ba</h1>
  <p>Command Center · Quản trị đơn hàng cao cấp</p>
  <input id="pwd" type="password" placeholder="Mật khẩu admin"/>
  <button onclick="login()">Đăng nhập</button>
  <div id="loginErr" class="err"></div>
</div>

<div id="app" class="layout" style="display:none">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-badge">CB</div>
      <div><h1>Thuộc Cô Ba</h1><span>Commerce OS</span></div>
    </div>
    <nav class="nav">
      <button class="on" id="navOrders" onclick="showView('orders')">📦 Đơn hàng</button>
      <button id="navDash" onclick="showView('dash')">📊 Tổng quan</button>
      <button id="navBanner" onclick="showView('banner')">🖼️ Banner & chiến dịch</button>
      <button onclick="exportCSV()">⬇ Xuất CSV</button>
      <button onclick="logout()">🚪 Đăng xuất</button>
    </nav>
  </aside>

  <main class="main">
    <div class="topbar">
      <div>
        <h2 id="pageTitle">Đơn hàng</h2>
        <div class="sub" id="lastUpdated">—</div>
      </div>
      <div class="actions">
        <button class="btn-ghost" onclick="loadOrders()">↻ Đồng bộ</button>
        <button class="btn-gold" onclick="exportCSV()">Xuất báo cáo</button>
      </div>
    </div>

    <div class="hero">
      <div>
        <h3>Đặc sản làng chài · OCOP 4 sao</h3>
        <p>Trung tâm điều hành đơn Mini App Zalo — theo dõi realtime, lọc lịch sử, in vận đơn J&T, xuất CSV cho kế toán.</p>
      </div>
      <div class="hero-chip">PostgreSQL · Live</div>
    </div>

    <div class="kpis" id="statsCards"></div>

    <!-- ORDERS VIEW -->
    <div id="viewOrders">
      <div class="panel">
        <div class="panel-title">📅 Bộ lọc lịch sử</div>
        <div class="filters">
          <button class="chip" id="fToday" onclick="setRange('today')">Hôm nay</button>
          <button class="chip" id="f7" onclick="setRange('7d')">7 ngày</button>
          <button class="chip on" id="f30" onclick="setRange('30d')">30 ngày</button>
          <button class="chip" id="fAll" onclick="setRange('all')">Tất cả</button>
          <input type="date" id="fromDate"/> <span class="muted">→</span>
          <input type="date" id="toDate"/>
          <button class="chip" onclick="setRange('custom')">Áp dụng</button>
        </div>
        <div class="filters">
          <input type="search" id="q" placeholder="Tìm mã đơn, khách, SĐT, địa chỉ, sản phẩm..." style="flex:1;min-width:200px" oninput="applyFilters()"/>
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
        <div class="panel-title">📋 Danh sách đơn <span class="muted" id="filterInfo" style="font-weight:500"></span></div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr><th>Mã đơn</th><th>Thời gian</th><th>Khách / Sản phẩm</th><th>Tổng</th><th>TT</th><th>Thao tác</th></tr>
            </thead>
            <tbody id="tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DASH VIEW -->
    <div id="viewDash" class="hidden">
      <div class="panel">
        <div class="panel-title">📈 Phân bổ trạng thái (theo bộ lọc hiện tại)</div>
        <div class="chart" id="statusChart"></div>
      </div>
      <div class="panel">
        <div class="panel-title">💡 Gợi ý vận hành</div>
        <p class="muted" id="insights" style="line-height:1.6;margin:0">—</p>
      </div>
    </div>

    <!-- BANNER VIEW -->
    <div id="viewBanner" class="hidden">
      <div class="panel">
        <div class="panel-title">🖼️ Banner & chiến dịch (gợi ý nội dung Mini App)</div>
        <div class="banner-grid">
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1555939594-58edc776e4b2?w=600')"></div>
            <div class="body"><h4>OCOP 4 sao</h4><p>Cam kết chuẩn ATVSTP · HACCP · hương vị làng chài.</p></div>
          </div>
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600')"></div>
            <div class="body"><h4>Freeship từ 500k</h4><p>Tự động trên Mini App · mã COBAFREESHIP.</p></div>
          </div>
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600')"></div>
            <div class="body"><h4>Combo tiết kiệm</h4><p>Đẩy mạnh combo mắm mực + mắm cái trên trang chủ.</p></div>
          </div>
        </div>
        <p class="muted" style="margin-top:14px">Ghi chú: Banner thật trên Mini App chỉnh trong <b>HomeTab / constants</b>. Khu này dùng để điều phối nội dung marketing nội bộ.</p>
      </div>
    </div>
  </main>
</div>

<script>
const STATUS_LABEL={pending:"Chờ xác nhận",preparing:"Đang chuẩn bị",shipping:"Đang giao",completed:"Đã giao",cancelled:"Đã hủy"};
let allOrders=[], rangeMode="30d", fromTs=null, toTs=null;

function getPwd(){return sessionStorage.getItem("admin_pwd")||""}
function login(){
  const p=document.getElementById("pwd").value.trim();
  if(!p){document.getElementById("loginErr").textContent="Nhập mật khẩu";return}
  sessionStorage.setItem("admin_pwd",p);
  document.getElementById("loginErr").textContent="";
  document.getElementById("loginBox").style.display="none";
  document.getElementById("app").style.display="grid";
  setRange("30d"); loadOrders();
}
function logout(){
  sessionStorage.removeItem("admin_pwd");
  location.reload();
}
function showView(v){
  document.getElementById("viewOrders").classList.toggle("hidden", v!=="orders");
  document.getElementById("viewDash").classList.toggle("hidden", v!=="dash");
  document.getElementById("viewBanner").classList.toggle("hidden", v!=="banner");
  document.getElementById("navOrders").classList.toggle("on", v==="orders");
  document.getElementById("navDash").classList.toggle("on", v==="dash");
  document.getElementById("navBanner").classList.toggle("on", v==="banner");
  document.getElementById("pageTitle").textContent=v==="orders"?"Đơn hàng":v==="dash"?"Tổng quan":"Banner & chiến dịch";
  if(v==="dash") renderDash();
}
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function endOfDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x.getTime()}
function setRange(mode){
  rangeMode=mode; const now=new Date();
  ["fToday","f7","f30","fAll"].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove("on")});
  if(mode==="today"){fromTs=startOfDay(now);toTs=endOfDay(now);document.getElementById("fToday").classList.add("on")}
  else if(mode==="7d"){fromTs=startOfDay(new Date(now-6*864e5));toTs=endOfDay(now);document.getElementById("f7").classList.add("on")}
  else if(mode==="30d"){fromTs=startOfDay(new Date(now-29*864e5));toTs=endOfDay(now);document.getElementById("f30").classList.add("on")}
  else if(mode==="all"){fromTs=null;toTs=null;document.getElementById("fAll").classList.add("on")}
  else if(mode==="custom"){
    const f=document.getElementById("fromDate").value,t=document.getElementById("toDate").value;
    fromTs=f?startOfDay(f):null; toTs=t?endOfDay(t):null;
  }
  applyFilters();
}
function money(n){return Number(n||0).toLocaleString("vi-VN")}
function escapeHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function filteredList(){
  const q=(document.getElementById("q").value||"").trim().toLowerCase();
  const st=document.getElementById("statusFilter").value;
  return allOrders.filter(o=>{
    const ts=new Date(o.createdAt).getTime();
    if(fromTs!=null&&ts<fromTs)return false;
    if(toTs!=null&&ts>toTs)return false;
    if(st&&o.status!==st)return false;
    if(q){
      const s=o.shippingInfo||{};
      const items=(o.items||[]).map(i=>i.name||"").join(" ");
      const hay=[o.id,s.fullName,s.phone,s.address,o.note,o.cancelReason,items].join(" ").toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}
function renderStats(list){
  const c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0};
  let revenue=0,active=0,cancelAmt=0,aov=0;
  list.forEach(o=>{
    if(c[o.status]!=null)c[o.status]++;
    const t=Number(o.total||0);
    if(o.status==="completed")revenue+=t;
    if(o.status==="cancelled")cancelAmt+=t; else active+=t;
  });
  const done=list.filter(o=>o.status==="completed");
  aov=done.length?Math.round(revenue/done.length):0;
  document.getElementById("statsCards").innerHTML=
    '<div class="kpi"><div class="label">Đơn (lọc)</div><div class="value">'+list.length+'</div></div>'+
    '<div class="kpi"><div class="label">Doanh thu đã giao</div><div class="value">'+money(revenue)+'đ</div></div>'+
    '<div class="kpi"><div class="label">Giá trị hiệu lực</div><div class="value">'+money(active)+'đ</div></div>'+
    '<div class="kpi"><div class="label">AOV đã giao</div><div class="value">'+money(aov)+'đ</div><div class="hint">Trung bình/đơn</div></div>'+
    '<div class="kpi"><div class="label">Đang xử lý</div><div class="value">'+(c.pending+c.preparing+c.shipping)+'</div><div class="hint">Chờ '+c.pending+' · CB '+c.preparing+'</div></div>'+
    '<div class="kpi"><div class="label">Đã hủy</div><div class="value">'+c.cancelled+'</div><div class="hint">'+money(cancelAmt)+'đ</div></div>';
}
function renderDash(){
  const list=filteredList();
  const c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0};
  list.forEach(o=>{if(c[o.status]!=null)c[o.status]++});
  const max=Math.max(1,...Object.values(c));
  const keys=["pending","preparing","shipping","completed","cancelled"];
  document.getElementById("statusChart").innerHTML=keys.map(k=>{
    const h=Math.round((c[k]/max)*100);
    return '<div class="bar-wrap"><div class="bar" style="height:'+h+'%"></div><div class="bar-label">'+STATUS_LABEL[k].split(" ").pop()+'<br/>'+c[k]+'</div></div>';
  }).join("");
  const pending=c.pending;
  let tip="Hệ thống ổn định.";
  if(pending>=3) tip="Có "+pending+" đơn chờ xác nhận — ưu tiên xử lý trong ngày để giảm hủy.";
  else if(c.cancelled>c.completed && list.length>2) tip="Tỷ lệ hủy đang cao trong kỳ lọc — kiểm tra phí ship / mô tả SP / thời gian giao.";
  else if(c.shipping>0) tip="Có đơn đang giao — theo dõi J&T và chủ động báo khách.";
  document.getElementById("insights").textContent=tip;
}
function applyFilters(){
  const list=filteredList();
  renderStats(list);
  const label={today:"Hôm nay","7d":"7 ngày","30d":"30 ngày",all:"Tất cả",custom:"Tùy chọn"}[rangeMode]||"";
  document.getElementById("filterInfo").textContent="· "+label+" · "+list.length+"/"+allOrders.length;
  const tbody=document.getElementById("tbody");
  if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="muted">Không có đơn trong bộ lọc</td></tr>';return}
  tbody.innerHTML=list.map(o=>{
    const s=o.shippingInfo||{}, st=o.status||"pending";
    const items=o.items||[];
    const products=items.length?'<div class="products">'+items.map(i=>escapeHtml(i.name||"SP")+" ×"+(i.quantity||1)).join("<br/>")+"</div>":"";
    const note=o.note?'<div class="products" style="color:var(--warn)">Ghi chú: '+escapeHtml(o.note)+"</div>":"";
    const cancel=st==="cancelled"&&o.cancelReason?'<div class="products" style="color:var(--bad)">Hủy: '+escapeHtml(o.cancelReason)+"</div>":"";
    return "<tr><td><b>"+escapeHtml(o.id)+"</b></td><td>"+(o.createdAt?new Date(o.createdAt).toLocaleString("vi-VN"):"—")+
      "</td><td>"+escapeHtml(s.fullName||"—")+"<br/><span class=\"muted\">"+escapeHtml(s.phone||"")+
      "</span><br/><span class=\"muted\">"+escapeHtml(s.address||"")+"</span>"+products+note+cancel+
      "</td><td><b>"+money(o.total)+"đ</b><div class=\"muted\">"+(o.paymentMethod||"COD")+
      "</div></td><td><span class=\"badge "+st+"\">"+(STATUS_LABEL[st]||st)+
      "</span></td><td><div class=\"row-btns\">"+
      "<button class=b-prep onclick=\"setStatus('"+o.id+"','preparing')\">Chuẩn bị</button>"+
      "<button class=b-ship onclick=\"setStatus('"+o.id+"','shipping')\">Giao</button>"+
      "<button class=b-ok onclick=\"setStatus('"+o.id+"','completed')\">Xong</button>"+
      "<button class=b-bad onclick=\"setStatus('"+o.id+"','cancelled')\">Hủy</button>"+
      "<button class=b-jnt onclick=\"printJnT('"+o.id+"')\">J&T</button></div></td></tr>";
  }).join("");
  if(!document.getElementById("viewDash").classList.contains("hidden")) renderDash();
}
async function loadOrders(){
  try{
    const res=await fetch("/api/orders");
    allOrders=await res.json();
    document.getElementById("lastUpdated").textContent="Cập nhật "+new Date().toLocaleString("vi-VN")+" · "+allOrders.length+" đơn toàn hệ thống";
    applyFilters();
  }catch(e){alert("Không tải được đơn: "+e.message)}
}
async function setStatus(orderId,status){
  const pwd=getPwd(); if(!pwd){logout();return}
  try{
    const body={status};
    if(status==="cancelled") body.reason=prompt("Lý do hủy:","Hủy bởi admin")||"Hủy bởi admin";
    const res=await fetch("/api/orders/"+encodeURIComponent(orderId)+"/status",{
      method:"PATCH",
      headers:{"Content-Type":"application/json","x-admin-password":pwd},
      body:JSON.stringify(body)
    });
    const data=await res.json();
    if(!res.ok){alert(data.error||"Lỗi"); if(res.status===401)logout(); return}
    loadOrders();
  }catch(e){alert(e.message)}
}
function exportCSV(){
  const list=filteredList();
  if(!list.length){alert("Không có dữ liệu");return}
  const rows=[["Mã","Thời gian","Khách","SĐT","Địa chỉ","SP","Tổng","Trạng thái","Ghi chú","Lý do hủy"]];
  list.forEach(o=>{
    const s=o.shippingInfo||{};
    rows.push([o.id,o.createdAt||"",s.fullName||"",s.phone||"",s.address||"",
      (o.items||[]).map(i=>(i.name||"")+" x"+(i.quantity||1)).join("; "),
      o.total||0,o.status||"",o.note||"",o.cancelReason||""]);
  });
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  a.download="thuoc-co-ba-orders.csv"; a.click();
}
function printJnT(orderId){
  const o=allOrders.find(x=>x.id===orderId);
  if(!o){alert("Không tìm thấy đơn");return}
  const s=o.shippingInfo||{}, items=o.items||[];
  const productNames=items.length?items.map(i=>(i.name||"SP")+" x"+(i.quantity||1)).join(", "):"Mini App Thuộc Cô Ba Store";
  const total=money(o.total), phone=s.phone||"", fullName=s.fullName||"Khách", address=s.address||"—", orderCode=String(o.id);
  const barcodeValue=orderCode.replace(/[^0-9A-Za-z]/g,"").slice(-12)||orderCode;
  const sortCode=(orderCode.replace(/\D/g,"").slice(-6)||orderCode.slice(-6)).toUpperCase();
  const w=window.open("","_blank","width=420,height=720");
  w.document.write(\`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>J&T \${orderCode}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\\/script>
<style>
@page{size:100mm 150mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;width:100mm;min-height:150mm}
table.main{width:100%;border-collapse:collapse}
table.main td{border:1.5px solid #000;vertical-align:top}
.header td{text-align:center;font-weight:900;font-size:12px;padding:3mm 2mm}
.barcode-cell{text-align:center;padding:2mm}.barcode-num{font-size:12px;font-weight:700;margin-top:1mm}
.sort-code{text-align:center;font-size:26px;font-weight:900;padding:3mm}
.info{font-size:10.5px;line-height:1.35;padding:2mm}.label{font-weight:900;font-size:10px;margin-bottom:1mm}
.right-box{text-align:center;padding:2mm;width:32mm}.hub{font-size:16px;font-weight:900;margin-bottom:2mm}
.meta{font-size:10px;line-height:1.4;padding:2mm}.cod-value{font-size:14px;font-weight:900;margin-top:1mm}
.sign{height:16mm;font-size:10px;padding:2mm}
</style></head><body>
<table class="main">
<tr class="header"><td style="width:38%">Mini App<br/>Thuộc Cô Ba Store</td>
<td style="width:38%;color:#e11d48">J&amp;T EXPRESS</td><td style="width:24%">ET</td></tr>
<tr><td colspan="3" class="barcode-cell"><svg id="barcode"></svg><div class="barcode-num">\${barcodeValue}</div></td></tr>
<tr><td colspan="3" class="sort-code">\${sortCode}</td></tr>
<tr>
<td colspan="2" class="info">
<div class="label">Người gửi</div>
<div><b>Kho Thuộc Cô Ba</b> (+84)0977322861</div>
<div>1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai</div>
<div style="margin-top:2mm" class="label">Người nhận</div>
<div><b>\${fullName}</b> (+84)\${phone}</div><div>\${address}</div>
</td>
<td class="right-box"><div class="hub">SGN</div><canvas id="qrcode" width="90" height="90"></canvas></td>
</tr>
<tr>
<td colspan="2" class="meta">
<div>TL: 0.500 KG</div><div>Hàng: \${productNames}</div>
<div>PTTT: COD</div><div>Mã: \${orderCode}</div>
</td>
<td class="right-box">
<div>Tiền thu hộ</div><div class="cod-value">\${total} đ</div>
<div style="font-weight:900;margin-top:2mm">COD</div>
<div class="sign" style="margin-top:3mm;border-top:1px dashed #000">Người nhận ký</div>
</td>
</tr>
</table>
<script>
try{JsBarcode("#barcode","\${barcodeValue}",{format:"CODE128",width:1.4,height:42,displayValue:false,margin:0})}catch(e){}
try{QRCode.toCanvas(document.getElementById("qrcode"),"${orderCode}",{width:90,margin:0})}catch(e){}
window.onload=function(){setTimeout(function(){window.print()},400)};
<\\/script></body></html>\`);
  w.document.close();
}
if(getPwd()){
  document.getElementById("loginBox").style.display="none";
  document.getElementById("app").style.display="grid";
  setRange("30d"); loadOrders();
}
</script>
</body></html>`);
});

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API (PostgreSQL) đang chạy ổn định!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server chạy cổng", PORT));