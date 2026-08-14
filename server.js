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

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

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
    if (!data || !mac) return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    const { appId, orderId, method, extradata, resultCode } = data;
    const str = "appId=" + appId + "&orderId=" + orderId + "&method=" + method;
    if (CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString() !== mac) {
      return res.json({ returnCode: 0, returnMessage: "Invalid mac" });
    }
    try {
      const extra = typeof extradata === "string" ? JSON.parse(extradata) : extradata;
      const myOrderId = extra && extra.orderId;
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
  // Dùng string thường + concat để tránh lỗi escape template literal
  res.send(getAdminHTML());
});

function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thuộc Cô Ba · Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#0f0c0a;--panel:#1a1512;--card:#231c18;--line:#3d322b;--gold:#d4a017;--gold2:#f0c14b;--brown:#8B4513;--text:#f5efe6;--muted:#a89a8c}
*{box-sizing:border-box}body{margin:0;font-family:'Be Vietnam Pro',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
button,input,select{font:inherit}button{cursor:pointer;border:none;border-radius:10px;padding:9px 14px;font-weight:600}
.layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
.sidebar{background:#1a1512;border-right:1px solid var(--line);padding:20px 14px;position:sticky;top:0;height:100vh}
.brand{display:flex;gap:10px;align-items:center;padding:8px 10px 22px}
.brand-badge{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--gold),var(--brown));display:flex;align-items:center;justify-content:center;font-weight:800;color:#1a1008}
.brand h1{font-size:14px;margin:0}.brand span{font-size:11px;color:var(--muted)}
.nav button{width:100%;text-align:left;background:transparent;color:var(--muted);margin-bottom:4px}
.nav button.on,.nav button:hover{background:rgba(212,160,23,.12);color:var(--gold2)}
.main{padding:20px 22px 40px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.topbar h2{margin:0;font-size:22px;font-weight:800}
.sub{color:var(--muted);font-size:12px;margin-top:4px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn-gold{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#1a1008}
.btn-ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.hero{border-radius:18px;margin-bottom:18px;background:linear-gradient(120deg,#3b2416,#1a1512);border:1px solid var(--line);padding:22px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.hero h3{margin:0 0 6px;font-size:20px}.hero p{margin:0;color:var(--muted);font-size:13px;max-width:520px;line-height:1.5}
.hero-chip{background:rgba(240,193,75,.15);border:1px solid rgba(240,193,75,.35);color:var(--gold2);padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:12px;margin-bottom:16px}
@media(max-width:1100px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.kpi .label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase}
.kpi .value{font-size:20px;font-weight:800;margin-top:6px;color:var(--gold2)}
.kpi .hint{font-size:11px;color:var(--muted);margin-top:4px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px}
.panel-title{font-size:14px;font-weight:700;margin:0 0 12px}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.chip{background:var(--panel);border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:8px 14px;font-size:12px}
.chip.on{background:rgba(212,160,23,.15);border-color:var(--gold);color:var(--gold2)}
input,select{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:9px 12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--muted);font-weight:600;padding:10px 8px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase}
td{padding:12px 8px;border-bottom:1px solid rgba(61,50,43,.55);vertical-align:top}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:rgba(245,158,11,.15);color:#fbbf24}
.preparing{background:rgba(59,130,246,.15);color:#60a5fa}
.shipping{background:rgba(99,102,241,.15);color:#a5b4fc}
.completed{background:rgba(34,197,94,.15);color:#4ade80}
.cancelled{background:rgba(239,68,68,.15);color:#f87171}
.row-btns{display:flex;flex-wrap:wrap;gap:4px}
.row-btns button{font-size:11px;padding:5px 8px;border-radius:8px}
.b-prep{background:#1e3a5f;color:#93c5fd}.b-ship{background:#312e81;color:#c7d2fe}
.b-ok{background:#14532d;color:#86efac}.b-bad{background:#7f1d1d;color:#fecaca}.b-jnt{background:#9a3412;color:#fdba74}
.muted{color:var(--muted);font-size:12px}
.products{font-size:11px;color:#c4b5a5;margin-top:4px;line-height:1.4}
.chart{display:flex;align-items:flex-end;gap:8px;height:110px}
.bar-wrap{flex:1;text-align:center}
.bar{background:linear-gradient(180deg,var(--gold2),var(--brown));border-radius:8px 8px 4px 4px;min-height:4px}
.bar-label{font-size:10px;color:var(--muted);margin-top:6px}
#loginBox{max-width:400px;margin:10vh auto;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px}
#loginBox h1{margin:0 0 8px;font-size:20px}#loginBox p{color:var(--muted);font-size:13px}
#loginBox input{width:100%;margin:12px 0}
#loginBox button{width:100%;background:linear-gradient(135deg,var(--gold2),var(--gold));color:#1a1008}
.err{color:#f87171;font-size:13px;margin-top:8px}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.banner-card{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--panel);min-height:120px;position:relative}
.banner-card .bg{position:absolute;inset:0;opacity:.35;background-size:cover;background-position:center}
.banner-card .body{position:relative;padding:14px}
.banner-card h4{margin:0 0 4px;font-size:14px}.banner-card p{margin:0;font-size:12px;color:var(--muted)}
.hidden{display:none!important}
</style>
</head>
<body>
<div id="loginBox">
  <h1>Thuộc Cô Ba</h1>
  <p>Command Center · Quản trị đơn hàng cao cấp</p>
  <input id="pwd" type="password" placeholder="Mật khẩu admin" onkeydown="if(event.key==='Enter')login()"/>
  <button type="button" onclick="login()">Đăng nhập</button>
  <div id="loginErr" class="err"></div>
</div>

<div id="app" class="layout" style="display:none">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-badge">CB</div>
      <div><h1>Thuộc Cô Ba</h1><span>Commerce OS</span></div>
    </div>
    <nav class="nav">
      <button type="button" class="on" id="navOrders" onclick="showView('orders')">📦 Đơn hàng</button>
      <button type="button" id="navDash" onclick="showView('dash')">📊 Tổng quan</button>
      <button type="button" id="navBanner" onclick="showView('banner')">🖼️ Banner</button>
      <button type="button" onclick="exportCSV()">⬇ Xuất CSV</button>
      <button type="button" onclick="logout()">🚪 Đăng xuất</button>
    </nav>
  </aside>
  <main class="main">
    <div class="topbar">
      <div>
        <h2 id="pageTitle">Đơn hàng</h2>
        <div class="sub" id="lastUpdated">—</div>
      </div>
      <div class="actions">
        <button type="button" class="btn-ghost" onclick="loadOrders()">↻ Đồng bộ</button>
        <button type="button" class="btn-gold" onclick="exportCSV()">Xuất báo cáo</button>
      </div>
    </div>
    <div class="hero">
      <div>
        <h3>Đặc sản làng chài · OCOP 4 sao</h3>
        <p>Theo dõi đơn Mini App, lọc lịch sử, in J&amp;T, xuất CSV kế toán.</p>
      </div>
      <div class="hero-chip">PostgreSQL · Live</div>
    </div>
    <div class="kpis" id="statsCards"></div>

    <div id="viewOrders">
      <div class="panel">
        <div class="panel-title">📅 Bộ lọc lịch sử</div>
        <div class="filters">
          <button type="button" class="chip" id="fToday" onclick="setRange('today')">Hôm nay</button>
          <button type="button" class="chip" id="f7" onclick="setRange('7d')">7 ngày</button>
          <button type="button" class="chip on" id="f30" onclick="setRange('30d')">30 ngày</button>
          <button type="button" class="chip" id="fAll" onclick="setRange('all')">Tất cả</button>
          <input type="date" id="fromDate"/>
          <span class="muted">→</span>
          <input type="date" id="toDate"/>
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
            <thead>
              <tr><th>Mã đơn</th><th>Thời gian</th><th>Khách / SP</th><th>Tổng</th><th>TT</th><th>Thao tác</th></tr>
            </thead>
            <tbody id="tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="viewDash" class="hidden">
      <div class="panel">
        <div class="panel-title">📈 Phân bổ trạng thái</div>
        <div class="chart" id="statusChart"></div>
      </div>
      <div class="panel">
        <div class="panel-title">💡 Gợi ý vận hành</div>
        <p class="muted" id="insights" style="line-height:1.6;margin:0">—</p>
      </div>
    </div>

    <div id="viewBanner" class="hidden">
      <div class="panel">
        <div class="panel-title">🖼️ Banner &amp; chiến dịch</div>
        <div class="banner-grid">
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1555939594-58edc776e4b2?w=600')"></div>
            <div class="body"><h4>OCOP 4 sao</h4><p>Cam kết ATVSTP · HACCP · hương vị làng chài.</p></div>
          </div>
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600')"></div>
            <div class="body"><h4>Freeship từ 500k</h4><p>Mã COBAFREESHIP trên Mini App.</p></div>
          </div>
          <div class="banner-card">
            <div class="bg" style="background-image:url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600')"></div>
            <div class="body"><h4>Combo tiết kiệm</h4><p>Đẩy combo mắm mực + mắm cái.</p></div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<script>
var STATUS_LABEL = {pending:'Chờ xác nhận',preparing:'Đang chuẩn bị',shipping:'Đang giao',completed:'Đã giao',cancelled:'Đã hủy'};
var allOrders = [];
var rangeMode = '30d';
var fromTs = null;
var toTs = null;
var ADMIN_PASS = 'thuoccoba2026';

function getPwd(){ return sessionStorage.getItem('admin_pwd') || ''; }

function login(){
  var p = (document.getElementById('pwd').value || '').trim();
  var err = document.getElementById('loginErr');
  if (!p) { err.textContent = 'Vui lòng nhập mật khẩu'; return; }
  if (p !== ADMIN_PASS) { err.textContent = 'Sai mật khẩu'; return; }
  sessionStorage.setItem('admin_pwd', p);
  err.textContent = '';
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  setRange('30d');
  loadOrders();
}

function logout(){
  sessionStorage.removeItem('admin_pwd');
  location.reload();
}

function showView(v){
  document.getElementById('viewOrders').classList.toggle('hidden', v !== 'orders');
  document.getElementById('viewDash').classList.toggle('hidden', v !== 'dash');
  document.getElementById('viewBanner').classList.toggle('hidden', v !== 'banner');
  document.getElementById('navOrders').classList.toggle('on', v === 'orders');
  document.getElementById('navDash').classList.toggle('on', v === 'dash');
  document.getElementById('navBanner').classList.toggle('on', v === 'banner');
  document.getElementById('pageTitle').textContent = v === 'orders' ? 'Đơn hàng' : (v === 'dash' ? 'Tổng quan' : 'Banner');
  if (v === 'dash') renderDash();
}

function startOfDay(d){ var x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
function endOfDay(d){ var x = new Date(d); x.setHours(23,59,59,999); return x.getTime(); }

function setRange(mode){
  rangeMode = mode;
  var now = new Date();
  ['fToday','f7','f30','fAll'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  });
  if (mode === 'today') {
    fromTs = startOfDay(now); toTs = endOfDay(now);
    document.getElementById('fToday').classList.add('on');
  } else if (mode === '7d') {
    fromTs = startOfDay(new Date(now.getTime() - 6*864e5)); toTs = endOfDay(now);
    document.getElementById('f7').classList.add('on');
  } else if (mode === '30d') {
    fromTs = startOfDay(new Date(now.getTime() - 29*864e5)); toTs = endOfDay(now);
    document.getElementById('f30').classList.add('on');
  } else if (mode === 'all') {
    fromTs = null; toTs = null;
    document.getElementById('fAll').classList.add('on');
  } else if (mode === 'custom') {
    var f = document.getElementById('fromDate').value;
    var t = document.getElementById('toDate').value;
    fromTs = f ? startOfDay(f) : null;
    toTs = t ? endOfDay(t) : null;
  }
  applyFilters();
}

function money(n){ return Number(n || 0).toLocaleString('vi-VN'); }
function escapeHtml(s){
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function filteredList(){
  var q = (document.getElementById('q').value || '').trim().toLowerCase();
  var st = document.getElementById('statusFilter').value;
  return allOrders.filter(function(o){
    var ts = new Date(o.createdAt).getTime();
    if (fromTs != null && ts < fromTs) return false;
    if (toTs != null && ts > toTs) return false;
    if (st && o.status !== st) return false;
    if (q) {
      var s = o.shippingInfo || {};
      var items = (o.items || []).map(function(i){ return i.name || ''; }).join(' ');
      var hay = [o.id, s.fullName, s.phone, s.address, o.note, o.cancelReason, items].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function renderStats(list){
  var c = {pending:0,preparing:0,shipping:0,completed:0,cancelled:0};
  var revenue = 0, active = 0, cancelAmt = 0;
  list.forEach(function(o){
    if (c[o.status] != null) c[o.status]++;
    var t = Number(o.total || 0);
    if (o.status === 'completed') revenue += t;
    if (o.status === 'cancelled') cancelAmt += t; else active += t;
  });
  var done = list.filter(function(o){ return o.status === 'completed'; });
  var aov = done.length ? Math.round(revenue / done.length) : 0;
  document.getElementById('statsCards').innerHTML =
    '<div class="kpi"><div class="label">Đơn (lọc)</div><div class="value">' + list.length + '</div></div>' +
    '<div class="kpi"><div class="label">Doanh thu đã giao</div><div class="value">' + money(revenue) + 'đ</div></div>' +
    '<div class="kpi"><div class="label">Giá trị hiệu lực</div><div class="value">' + money(active) + 'đ</div></div>' +
    '<div class="kpi"><div class="label">AOV đã giao</div><div class="value">' + money(aov) + 'đ</div></div>' +
    '<div class="kpi"><div class="label">Đang xử lý</div><div class="value">' + (c.pending+c.preparing+c.shipping) + '</div><div class="hint">Chờ ' + c.pending + '</div></div>' +
    '<div class="kpi"><div class="label">Đã hủy</div><div class="value">' + c.cancelled + '</div><div class="hint">' + money(cancelAmt) + 'đ</div></div>';
}

function renderDash(){
  var list = filteredList();
  var c = {pending:0,preparing:0,shipping:0,completed:0,cancelled:0};
  list.forEach(function(o){ if (c[o.status] != null) c[o.status]++; });
  var max = Math.max(1, c.pending, c.preparing, c.shipping, c.completed, c.cancelled);
  var keys = ['pending','preparing','shipping','completed','cancelled'];
  document.getElementById('statusChart').innerHTML = keys.map(function(k){
    var h = Math.round((c[k] / max) * 100);
    var short = (STATUS_LABEL[k] || k).split(' ').pop();
    return '<div class="bar-wrap"><div class="bar" style="height:' + h + '%"></div><div class="bar-label">' + short + '<br/>' + c[k] + '</div></div>';
  }).join('');
  var tip = 'Hệ thống ổn định.';
  if (c.pending >= 3) tip = 'Có ' + c.pending + ' đơn chờ xác nhận — ưu tiên xử lý trong ngày.';
  else if (c.cancelled > c.completed && list.length > 2) tip = 'Tỷ lệ hủy cao trong kỳ lọc — kiểm tra phí ship / mô tả SP.';
  else if (c.shipping > 0) tip = 'Có đơn đang giao — theo dõi vận chuyển và báo khách.';
  document.getElementById('insights').textContent = tip;
}

function applyFilters(){
  var list = filteredList();
  renderStats(list);
  var labelMap = {today:'Hôm nay','7d':'7 ngày','30d':'30 ngày',all:'Tất cả',custom:'Tùy chọn'};
  document.getElementById('filterInfo').textContent = ' · ' + (labelMap[rangeMode] || '') + ' · ' + list.length + '/' + allOrders.length;
  var tbody = document.getElementById('tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Không có đơn trong bộ lọc</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(o){
    var s = o.shippingInfo || {};
    var st = o.status || 'pending';
    var items = o.items || [];
    var products = items.length
      ? '<div class="products">' + items.map(function(i){ return escapeHtml(i.name || 'SP') + ' ×' + (i.quantity || 1); }).join('<br/>') + '</div>'
      : '';
    var note = o.note ? '<div class="products">Ghi chú: ' + escapeHtml(o.note) + '</div>' : '';
    var cancel = (st === 'cancelled' && o.cancelReason)
      ? '<div class="products" style="color:#f87171">Hủy: ' + escapeHtml(o.cancelReason) + '</div>'
      : '';
    var time = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—';
    return '<tr>' +
      '<td><b>' + escapeHtml(o.id) + '</b></td>' +
      '<td>' + time + '</td>' +
      '<td>' + escapeHtml(s.fullName || '—') +
        '<br/><span class="muted">' + escapeHtml(s.phone || '') + '</span>' +
        '<br/><span class="muted">' + escapeHtml(s.address || '') + '</span>' +
        products + note + cancel +
      '</td>' +
      '<td><b>' + money(o.total) + 'đ</b><div class="muted">' + escapeHtml(o.paymentMethod || 'COD') + '</div></td>' +
      '<td><span class="badge ' + st + '">' + (STATUS_LABEL[st] || st) + '</span></td>' +
      '<td><div class="row-btns">' +
        '<button type="button" class="b-prep" onclick="setStatus(\\'' + o.id + '\\',\\'preparing\\')">Chuẩn bị</button>' +
        '<button type="button" class="b-ship" onclick="setStatus(\\'' + o.id + '\\',\\'shipping\\')">Giao</button>' +
        '<button type="button" class="b-ok" onclick="setStatus(\\'' + o.id + '\\',\\'completed\\')">Xong</button>' +
        '<button type="button" class="b-bad" onclick="setStatus(\\'' + o.id + '\\',\\'cancelled\\')">Hủy</button>' +
        '<button type="button" class="b-jnt" onclick="printJnT(\\'' + o.id + '\\')">J&amp;T</button>' +
      '</div></td></tr>';
  }).join('');
  if (!document.getElementById('viewDash').classList.contains('hidden')) renderDash();
}

async function loadOrders(){
  try {
    var res = await fetch('/api/orders');
    allOrders = await res.json();
    if (!Array.isArray(allOrders)) allOrders = [];
    document.getElementById('lastUpdated').textContent =
      'Cập nhật ' + new Date().toLocaleString('vi-VN') + ' · ' + allOrders.length + ' đơn toàn hệ thống';
    applyFilters();
  } catch (e) {
    alert('Không tải được đơn: ' + e.message);
  }
}

async function setStatus(orderId, status){
  var pwd = getPwd();
  if (!pwd) { logout(); return; }
  try {
    var body = { status: status };
    if (status === 'cancelled') {
      body.reason = prompt('Lý do hủy:', 'Hủy bởi admin') || 'Hủy bởi admin';
    }
    var res = await fetch('/api/orders/' + encodeURIComponent(orderId) + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Lỗi');
      if (res.status === 401) logout();
      return;
    }
    loadOrders();
  } catch (e) {
    alert(e.message);
  }
}

function exportCSV(){
  var list = filteredList();
  if (!list.length) { alert('Không có dữ liệu'); return; }
  var rows = [['Mã','Thời gian','Khách','SĐT','Địa chỉ','SP','Tổng','Trạng thái','Ghi chú','Lý do hủy']];
  list.forEach(function(o){
    var s = o.shippingInfo || {};
    rows.push([
      o.id, o.createdAt || '', s.fullName || '', s.phone || '', s.address || '',
      (o.items || []).map(function(i){ return (i.name || '') + ' x' + (i.quantity || 1); }).join('; '),
      o.total || 0, o.status || '', o.note || '', o.cancelReason || ''
    ]);
  });
  var csv = rows.map(function(r){
    return r.map(function(c){ return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'thuoc-co-ba-orders.csv';
  a.click();
}

function printJnT(orderId){
  var o = allOrders.find(function(x){ return x.id === orderId; });
  if (!o) { alert('Không tìm thấy đơn'); return; }
  var s = o.shippingInfo || {};
  var items = o.items || [];
  var productNames = items.length
    ? items.map(function(i){ return (i.name || 'SP') + ' x' + (i.quantity || 1); }).join(', ')
    : 'Mini App Thuộc Cô Ba Store';
  var total = money(o.total);
  var phone = s.phone || '';
  var fullName = s.fullName || 'Khách';
  var address = s.address || '—';
  var orderCode = String(o.id);
  var barcodeValue = orderCode.replace(/[^0-9A-Za-z]/g, '').slice(-12) || orderCode;
  var sortCode = (orderCode.replace(/\\D/g, '').slice(-6) || orderCode.slice(-6)).toUpperCase();

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>J&T ' + orderCode + '</title>' +
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script>' +
    '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\\/script>' +
    '<style>@page{size:100mm 150mm;margin:0}body{font-family:Arial;width:100mm}table{width:100%;border-collapse:collapse}td{border:1.5px solid #000;padding:2mm;font-size:11px;vertical-align:top}.sort{font-size:24px;font-weight:900;text-align:center}</style></head><body>' +
    '<table><tr><td><b>Thuộc Cô Ba</b></td><td style="color:#e11d48;font-weight:900">J&T EXPRESS</td><td>ET</td></tr>' +
    '<tr><td colspan="3" style="text-align:center"><svg id="barcode"></svg><div>' + barcodeValue + '</div></td></tr>' +
    '<tr><td colspan="3" class="sort">' + sortCode + '</td></tr>' +
    '<tr><td colspan="2"><b>Gửi:</b> Kho Thuộc Cô Ba · 0977322861<br/>1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai<br/><br/><b>Nhận:</b> ' +
    fullName + ' ' + phone + '<br/>' + address + '</td><td style="text-align:center"><canvas id="qrcode"></canvas></td></tr>' +
    '<tr><td colspan="2">Hàng: ' + productNames + '<br/>COD</td><td style="text-align:center;font-weight:900">' + total + ' đ<br/>COD</td></tr></table>' +
    '<script>try{JsBarcode("#barcode","' + barcodeValue + '",{format:"CODE128",width:1.3,height:40,displayValue:false})}catch(e){}' +
    'try{QRCode.toCanvas(document.getElementById("qrcode"),"' + orderCode + '",{width:80,margin:0})}catch(e){}' +
    'setTimeout(function(){print()},400)<\\/script></body></html>';

  var w = window.open('', '_blank', 'width=420,height=720');
  w.document.write(html);
  w.document.close();
}

if (getPwd() === ADMIN_PASS) {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  setRange('30d');
  loadOrders();
}
</script>
</body>
</html>`;
}

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API (PostgreSQL) đang chạy ổn định!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server chạy cổng", PORT));