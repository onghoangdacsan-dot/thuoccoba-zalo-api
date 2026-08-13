const express = require("express");
const CryptoJS = require("crypto-js");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PRIVATE_KEY = "fe49f1b0e06649e498929a7379cfdfbf";
const ADMIN_PASSWORD = "thuoccoba2026";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");

// ========== STORAGE ==========
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try {
    ensureDataDir();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("readJSON error:", file, e.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function loadOrders() {
  return readJSON(ORDERS_FILE, []);
}

function saveOrders(list) {
  writeJSON(ORDERS_FILE, list);
}

function loadInventory() {
  const list = readJSON(INVENTORY_FILE, null);
  if (list) return list;
  // Kho mặc định (chỉnh id/tên/số lượng theo PRODUCTS của bạn)
  const seed = [
    { id: "157", name: "Mắm mực hũ 500g", stock: 100, reserved: 0, unit: "hũ", lowStock: 10 },
    { id: "532", name: "Mắm mực hũ 1kg", stock: 50, reserved: 0, unit: "hũ", lowStock: 5 },
    { id: "2692", name: "2 hũ mắm mực 500g tặng mắm cái", stock: 40, reserved: 0, unit: "combo", lowStock: 5 },
    { id: "2690", name: "2 hũ mắm mực 500g tặng mạch nha", stock: 40, reserved: 0, unit: "combo", lowStock: 5 },
    { id: "535", name: "Bột năng 1kg", stock: 80, reserved: 0, unit: "kg", lowStock: 10 },
    { id: "534", name: "Bún gạo khô 1kg", stock: 80, reserved: 0, unit: "kg", lowStock: 10 },
  ];
  writeJSON(INVENTORY_FILE, seed);
  return seed;
}

function saveInventory(list) {
  writeJSON(INVENTORY_FILE, list);
}

function normalizePhone(p) {
  let s = String(p || "").replace(/\D/g, "");
  if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  if (s.startsWith("840")) s = "0" + s.slice(3);
  return s;
}

function findOrderIndex(list, orderId) {
  return list.findIndex((o) => o.id === orderId);
}

/** Trừ kho theo items đơn. throw nếu không đủ */
function decreaseStock(items) {
  const inv = loadInventory();
  const map = new Map(inv.map((x) => [String(x.id), x]));

  for (const item of items || []) {
    const id = String(item.id);
    const qty = Number(item.quantity || 0);
    if (!qty) continue;
    const row = map.get(id);
    if (!row) continue; // SP chưa khai kho → bỏ qua, không chặn đơn
    const available = Number(row.stock || 0);
    if (available < qty) {
      const err = new Error(`Không đủ tồn kho: ${row.name} (còn ${available}, cần ${qty})`);
      err.code = "OUT_OF_STOCK";
      throw err;
    }
  }

  for (const item of items || []) {
    const id = String(item.id);
    const qty = Number(item.quantity || 0);
    if (!qty) continue;
    const row = map.get(id);
    if (!row) continue;
    row.stock = Number(row.stock || 0) - qty;
    row.updatedAt = new Date().toISOString();
  }
  saveInventory(Array.from(map.values()));
}

/** Hoàn kho khi hủy đơn */
function restoreStock(items) {
  const inv = loadInventory();
  const map = new Map(inv.map((x) => [String(x.id), x]));
  for (const item of items || []) {
    const id = String(item.id);
    const qty = Number(item.quantity || 0);
    if (!qty) continue;
    const row = map.get(id);
    if (!row) continue;
    row.stock = Number(row.stock || 0) + qty;
    row.updatedAt = new Date().toISOString();
  }
  saveInventory(Array.from(map.values()));
}

// ========== ZALO PHONE ==========
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
    res.status(500).json({ error: "Lỗi server khi lấy số điện thoại" });
  }
});

// ========== ORDERS ==========
app.post("/api/orders", (req, res) => {
  try {
    const items = req.body.items || [];
    try {
      decreaseStock(items);
    } catch (stockErr) {
      return res.status(400).json({ error: stockErr.message, code: stockErr.code || "OUT_OF_STOCK" });
    }

    const orderId = "ORD_" + Date.now();
    const order = {
      id: orderId,
      items,
      shippingInfo: req.body.shippingInfo || {},
      subTotal: req.body.subTotal || 0,
      shippingFee: req.body.shippingFee || 0,
      total: req.body.total || req.body.finalTotal || 0,
      paymentMethod: req.body.paymentMethod || "COD",
      note: req.body.note || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const list = loadOrders();
    list.unshift(order);
    saveOrders(list);

    console.log("Tạo đơn:", orderId);
    res.json({ orderId, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot create order" });
  }
});

app.get("/api/orders", (req, res) => {
  const list = loadOrders().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

app.post("/api/orders/:orderId/cancel", (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, phone } = req.body || {};
    const list = loadOrders();
    const idx = findOrderIndex(list, orderId);
    if (idx === -1) return res.status(404).json({ error: "Không tìm thấy đơn" });

    const order = list[idx];
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

    restoreStock(order.items || []);
    order.status = "cancelled";
    order.cancelReason = String(reason).trim();
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = order.cancelledAt;
    list[idx] = order;
    saveOrders(list);

    res.json({ ok: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không hủy được đơn" });
  }
});

app.patch("/api/orders/:orderId/status", (req, res) => {
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

  const list = loadOrders();
  const idx = findOrderIndex(list, orderId);
  if (idx === -1) return res.status(404).json({ error: "Không tìm thấy đơn" });

  const order = list[idx];
  const prev = order.status;

  // Hủy từ admin → hoàn kho nếu trước đó chưa hủy
  if (status === "cancelled" && prev !== "cancelled") {
    restoreStock(order.items || []);
    order.cancelReason = req.body.reason || "Hủy bởi admin";
    order.cancelledAt = new Date().toISOString();
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (status === "preparing") order.confirmedAt = order.updatedAt;
  if (status === "shipping") order.shippingAt = order.updatedAt;
  if (status === "completed") order.completedAt = order.updatedAt;

  list[idx] = order;
  saveOrders(list);
  res.json(order);
});

// ========== INVENTORY ==========
app.get("/api/inventory", (req, res) => {
  res.json(loadInventory());
});

app.put("/api/inventory/:id", (req, res) => {
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  const id = String(req.params.id);
  const inv = loadInventory();
  const idx = inv.findIndex((x) => String(x.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Không tìm thấy SP trong kho" });

  const { stock, name, unit, lowStock } = req.body;
  if (stock != null) inv[idx].stock = Math.max(0, Number(stock));
  if (name != null) inv[idx].name = String(name);
  if (unit != null) inv[idx].unit = String(unit);
  if (lowStock != null) inv[idx].lowStock = Math.max(0, Number(lowStock));
  inv[idx].updatedAt = new Date().toISOString();
  saveInventory(inv);
  res.json(inv[idx]);
});

app.post("/api/inventory", (req, res) => {
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  const { id, name, stock = 0, unit = "sp", lowStock = 5 } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: "Thiếu id hoặc name" });

  const inv = loadInventory();
  if (inv.some((x) => String(x.id) === String(id))) {
    return res.status(400).json({ error: "ID đã tồn tại" });
  }
  const row = {
    id: String(id),
    name: String(name),
    stock: Math.max(0, Number(stock)),
    reserved: 0,
    unit,
    lowStock: Math.max(0, Number(lowStock)),
    updatedAt: new Date().toISOString(),
  };
  inv.push(row);
  saveInventory(inv);
  res.json(row);
});

app.post("/api/inventory/:id/adjust", (req, res) => {
  const password = req.headers["x-admin-password"] || req.body.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu admin" });
  }
  const id = String(req.params.id);
  const delta = Number(req.body.delta || 0);
  const inv = loadInventory();
  const idx = inv.findIndex((x) => String(x.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Không tìm thấy SP" });
  inv[idx].stock = Math.max(0, Number(inv[idx].stock || 0) + delta);
  inv[idx].updatedAt = new Date().toISOString();
  saveInventory(inv);
  res.json(inv[idx]);
});

// ========== MAC / ZALO ==========
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
    const mac = CryptoJS.HmacSHA256(dataMac, PRIVATE_KEY).toString();
    res.json({ mac });
  } catch (err) {
    res.status(500).json({ error: "Cannot create mac" });
  }
});

app.post("/api/zalo-notify", (req, res) => {
  try {
    const { data, mac } = req.body || {};
    if (!data || !mac) return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    const { appId, orderId, method, extradata, resultCode } = data;
    const str = `appId=${appId}&orderId=${orderId}&method=${method}`;
    const reqMac = CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString();
    if (reqMac !== mac) return res.json({ returnCode: 0, returnMessage: "Invalid mac" });

    try {
      const extra = typeof extradata === "string" ? JSON.parse(extradata) : extradata;
      const myOrderId = extra?.orderId;
      if (myOrderId) {
        const list = loadOrders();
        const idx = findOrderIndex(list, myOrderId);
        if (idx !== -1) {
          const order = list[idx];
          if ((String(resultCode) === "1" || resultCode === 1) && order.status !== "cancelled") {
            order.status = "preparing";
            order.confirmedAt = new Date().toISOString();
            order.updatedAt = order.confirmedAt;
            list[idx] = order;
            saveOrders(list);
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

// ========== ADMIN UI ==========
app.get(["/admin", "/admin.html"], (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getAdminHTML());
});

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API + Kho hàng. Admin: /admin");
});

function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Admin – Thuộc Cô Ba</title>
<style>
:root{--p:#8b4513;--b:#e8d5c0;--bg:#fdf8f0;--m:#6b7280}
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;background:var(--bg);margin:0;padding:16px;color:#1f2937}
h1{color:var(--p);font-size:1.25rem;margin:0}.card{background:#fff;border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:14px}
input,button,select{font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid #d1d5db}
button{background:var(--p);color:#fff;border:none;cursor:pointer;font-weight:600}
button.secondary{background:#6b7280}button.ok{background:#16a34a}button.jnt{background:#ea580c}
button.danger{background:#dc2626}button.ghost{background:#fff;color:var(--p);border:1px solid var(--b)}
button.active-filter{background:var(--p);color:#fff;border-color:var(--p)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border-bottom:1px solid #f0e6d8;padding:10px 6px;text-align:left;vertical-align:top}
th{color:var(--p)}.badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:#fef3c7;color:#92400e}.preparing{background:#dbeafe;color:#1e40af}
.shipping{background:#e0e7ff;color:#3730a3}.completed{background:#dcfce7;color:#166534}
.cancelled{background:#fee2e2;color:#991b1b}.low{background:#fef2f2;color:#b91c1c;font-weight:700}
.actions{display:flex;flex-wrap:wrap;gap:4px}.actions button{font-size:11px;padding:4px 8px}
#loginBox{max-width:380px;margin:48px auto}#app{display:none}.muted{color:var(--m);font-size:12px}
.err{color:#b91c1c;font-size:13px;margin-top:8px}.products{font-size:11px;color:#555;margin-top:4px}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}
.stat{background:#fff;border:1px solid var(--b);border-radius:12px;padding:12px 14px}
.stat .label{font-size:11px;color:var(--m);font-weight:600}.stat .value{font-size:18px;font-weight:800;color:var(--p);margin-top:4px}
.stat .sub{font-size:11px;color:var(--m);margin-top:2px}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.tabs{display:flex;gap:8px;margin-bottom:14px}
.tabs button{border-radius:999px;padding:8px 16px}
.tabs button.on{background:var(--p);color:#fff}
.hidden{display:none!important}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
</style></head><body>
<div id="loginBox" class="card">
<h1>🔐 Admin – Thuộc Cô Ba</h1>
<p class="muted">Đơn hàng · Kho hàng · Lịch sử dài hạn</p>
<input id="pwd" type="password" placeholder="Mật khẩu" style="width:100%;margin:8px 0"/>
<button onclick="login()" style="width:100%">Đăng nhập</button>
<div id="loginErr" class="err"></div>
</div>

<div id="app">
<div class="toolbar">
  <div><h1>Thuộc Cô Ba Admin</h1><div class="muted" id="lastUpdated">—</div></div>
  <div class="row">
    <button class="secondary" onclick="refreshAll()">↻ Tải lại</button>
    <button class="ghost" onclick="exportCSV()">⬇ CSV đơn</button>
    <button class="secondary" onclick="logout()">Thoát</button>
  </div>
</div>

<div class="tabs">
  <button id="tabOrders" class="on" onclick="showTab('orders')">📦 Đơn hàng</button>
  <button id="tabInv" onclick="showTab('inventory')">🏭 Kho hàng</button>
</div>

<div id="panelOrders">
  <div class="stats" id="statsCards"></div>
  <div class="card">
    <div style="font-weight:700;color:var(--p);margin-bottom:10px">📅 Lịch sử & bộ lọc</div>
    <div class="filters">
      <button class="ghost" id="fToday" onclick="setRange('today')">Hôm nay</button>
      <button class="ghost" id="f7" onclick="setRange('7d')">7 ngày</button>
      <button class="ghost" id="f30" onclick="setRange('30d')">30 ngày</button>
      <button class="ghost" id="fAll" onclick="setRange('all')">Tất cả</button>
      <input type="date" id="fromDate"/><span class="muted">→</span>
      <input type="date" id="toDate"/>
      <button class="ghost" onclick="setRange('custom')">Áp dụng</button>
    </div>
    <div class="filters">
      <input type="search" id="q" placeholder="Tìm mã, tên, SĐT, SP..." style="flex:1;min-width:180px" oninput="applyFilters()"/>
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
  <div class="card">
    <div id="filterInfo" class="muted" style="margin-bottom:10px"></div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Mã</th><th>Thời gian</th><th>Khách / SP</th><th>Tổng</th><th>TT</th><th>Thao tác</th></tr></thead>
      <tbody id="tbody"></tbody>
    </table></div>
  </div>
</div>

<div id="panelInv" class="hidden">
  <div class="card">
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div style="font-weight:700;color:var(--p)">🏭 Tồn kho</div>
      <button onclick="addProduct()">+ Thêm SP kho</button>
    </div>
    <div id="invAlert" class="muted" style="margin-bottom:8px"></div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>ID</th><th>Tên</th><th>Tồn</th><th>Đơn vị</th><th>Cảnh báo</th><th>Điều chỉnh</th></tr></thead>
      <tbody id="invBody"></tbody>
    </table></div>
  </div>
</div>
</div>

<script>
const STATUS_LABEL={pending:"Chờ xác nhận",preparing:"Đang chuẩn bị",shipping:"Đang giao",completed:"Đã giao",cancelled:"Đã hủy"};
let allOrders=[], inventory=[], rangeMode="30d", fromTs=null, toTs=null;

function getPwd(){return sessionStorage.getItem("admin_pwd")||""}
function login(){const p=document.getElementById("pwd").value.trim();if(!p){document.getElementById("loginErr").textContent="Nhập mật khẩu";return}sessionStorage.setItem("admin_pwd",p);document.getElementById("loginErr").textContent="";showApp();setRange("30d");refreshAll()}
function logout(){sessionStorage.removeItem("admin_pwd");document.getElementById("app").style.display="none";document.getElementById("loginBox").style.display="block"}
function showApp(){document.getElementById("loginBox").style.display="none";document.getElementById("app").style.display="block"}
function showTab(t){
  document.getElementById("panelOrders").classList.toggle("hidden", t!=="orders");
  document.getElementById("panelInv").classList.toggle("hidden", t!=="inventory");
  document.getElementById("tabOrders").classList.toggle("on", t==="orders");
  document.getElementById("tabInv").classList.toggle("on", t==="inventory");
}
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function endOfDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x.getTime()}
function setRange(mode){
  rangeMode=mode;const now=new Date();
  ["fToday","f7","f30","fAll"].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove("active-filter")});
  if(mode==="today"){fromTs=startOfDay(now);toTs=endOfDay(now);document.getElementById("fToday").classList.add("active-filter")}
  else if(mode==="7d"){fromTs=startOfDay(new Date(now-6*864e5));toTs=endOfDay(now);document.getElementById("f7").classList.add("active-filter")}
  else if(mode==="30d"){fromTs=startOfDay(new Date(now-29*864e5));toTs=endOfDay(now);document.getElementById("f30").classList.add("active-filter")}
  else if(mode==="all"){fromTs=null;toTs=null;document.getElementById("fAll").classList.add("active-filter")}
  else if(mode==="custom"){const f=document.getElementById("fromDate").value,t=document.getElementById("toDate").value;fromTs=f?startOfDay(f):null;toTs=t?endOfDay(t):null}
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
    if(q){const s=o.shippingInfo||{};const items=(o.items||[]).map(i=>i.name||"").join(" ");
      const hay=[o.id,s.fullName,s.phone,s.address,o.note,o.cancelReason,items].join(" ").toLowerCase();
      if(!hay.includes(q))return false}
    return true;
  });
}
function renderStats(list){
  const c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0};let revenue=0,active=0,cancelAmt=0;
  list.forEach(o=>{if(c[o.status]!=null)c[o.status]++;const t=Number(o.total||0);if(o.status==="completed")revenue+=t;if(o.status==="cancelled")cancelAmt+=t;else active+=t});
  document.getElementById("statsCards").innerHTML=
    '<div class="stat"><div class="label">Tổng đơn (lọc)</div><div class="value">'+list.length+'</div></div>'+
    '<div class="stat"><div class="label">Doanh thu đã giao</div><div class="value">'+money(revenue)+'đ</div></div>'+
    '<div class="stat"><div class="label">Giá trị còn hiệu lực</div><div class="value">'+money(active)+'đ</div></div>'+
    '<div class="stat"><div class="label">Chờ / Xử lý</div><div class="value">'+(c.pending+c.preparing+c.shipping)+'</div><div class="sub">Chờ '+c.pending+'</div></div>'+
    '<div class="stat"><div class="label">Đã hủy</div><div class="value">'+c.cancelled+'</div><div class="sub">'+money(cancelAmt)+'đ</div></div>';
}
function applyFilters(){
  const list=filteredList();renderStats(list);
  const rangeText={today:"Hôm nay","7d":"7 ngày","30d":"30 ngày",all:"Toàn bộ",custom:"Tùy chọn"}[rangeMode]||"";
  document.getElementById("filterInfo").textContent=rangeText+" · "+list.length+" / "+allOrders.length+" đơn";
  const tbody=document.getElementById("tbody");
  if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="muted">Không có đơn</td></tr>';return}
  tbody.innerHTML=list.map(o=>{
    const s=o.shippingInfo||{},st=o.status||"pending";
    const items=o.items||[];
    const products=items.length?'<div class="products">'+items.map(i=>escapeHtml(i.name||"SP")+" ×"+(i.quantity||1)).join("<br/>")+"</div>":"";
    const note=o.note?'<div class="products" style="color:#b45309">Ghi chú: '+escapeHtml(o.note)+"</div>":"";
    const cancel=st==="cancelled"&&o.cancelReason?'<div class="products" style="color:#991b1b">Hủy: '+escapeHtml(o.cancelReason)+"</div>":"";
    return "<tr><td><b>"+escapeHtml(o.id)+"</b></td><td>"+(o.createdAt?new Date(o.createdAt).toLocaleString("vi-VN"):"—")+"</td><td>"+
      escapeHtml(s.fullName||"—")+"<br/><span class=\\"muted\\">"+escapeHtml(s.phone||"")+"</span><br/><span class=\\"muted\\">"+escapeHtml(s.address||"")+
      "</span>"+products+note+cancel+"</td><td><b>"+money(o.total)+" đ</b></td><td><span class=\\"badge "+st+"\\">"+(STATUS_LABEL[st]||st)+
      "</span></td><td class=\\"actions\\">"+
      "<button onclick=\\"setStatus('"+o.id+"','preparing')\\">Chuẩn bị</button> "+
      "<button onclick=\\"setStatus('"+o.id+"','shipping')\\">Giao</button> "+
      "<button class=ok onclick=\\"setStatus('"+o.id+"','completed')\\">Xong</button> "+
      "<button class=danger onclick=\\"setStatus('"+o.id+"','cancelled')\\">Hủy</button> "+
      "<button class=jnt onclick=\\"printJnT('"+o.id+"')\\">In J&T</button></td></tr>";
  }).join("");
}
async function loadOrders(){const res=await fetch("/api/orders");allOrders=await res.json();applyFilters()}
async function loadInv(){
  const res=await fetch("/api/inventory");inventory=await res.json();
  const low=inventory.filter(x=>Number(x.stock)<=Number(x.lowStock||0));
  document.getElementById("invAlert").textContent=low.length?("⚠ "+low.length+" SP sắp hết hàng"):"Tồn kho ổn định";
  document.getElementById("invBody").innerHTML=inventory.map(x=>{
    const isLow=Number(x.stock)<=Number(x.lowStock||0);
    return "<tr class='"+(isLow?"low":"")+"'><td>"+escapeHtml(x.id)+"</td><td>"+escapeHtml(x.name)+"</td><td><b>"+x.stock+"</b></td><td>"+
      escapeHtml(x.unit||"")+"</td><td>≤ "+(x.lowStock||0)+"</td><td class=actions>"+
      "<button onclick=\\"adjust('"+x.id+"',1)\\">+1</button> "+
      "<button class=secondary onclick=\\"adjust('"+x.id+"',-1)\\">-1</button> "+
      "<button class=ghost onclick=\\"setStock('"+x.id+"',"+x.stock+")\\">Sửa</button></td></tr>";
  }).join("")||'<tr><td colspan="6" class="muted">Chưa có SP kho</td></tr>';
}
async function refreshAll(){
  try{await Promise.all([loadOrders(),loadInv()]);
    document.getElementById("lastUpdated").textContent="Cập nhật: "+new Date().toLocaleString("vi-VN");
  }catch(e){alert(e.message)}
}
async function setStatus(orderId,status){
  const pwd=getPwd();if(!pwd){logout();return}
  const body={status};if(status==="cancelled")body.reason=prompt("Lý do hủy:","Hủy bởi admin")||"Hủy bởi admin";
  const res=await fetch("/api/orders/"+encodeURIComponent(orderId)+"/status",{method:"PATCH",headers:{"Content-Type":"application/json","x-admin-password":pwd},body:JSON.stringify(body)});
  const data=await res.json();if(!res.ok){alert(data.error||"Lỗi");if(res.status===401)logout();return}refreshAll();
}
async function adjust(id,delta){
  const pwd=getPwd();
  const res=await fetch("/api/inventory/"+encodeURIComponent(id)+"/adjust",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pwd},body:JSON.stringify({delta})});
  const data=await res.json();if(!res.ok){alert(data.error||"Lỗi");return}loadInv();
}
async function setStock(id,cur){
  const n=prompt("Nhập tồn kho mới:", String(cur));if(n==null)return;
  const pwd=getPwd();
  const res=await fetch("/api/inventory/"+encodeURIComponent(id),{method:"PUT",headers:{"Content-Type":"application/json","x-admin-password":pwd},body:JSON.stringify({stock:Number(n)})});
  const data=await res.json();if(!res.ok){alert(data.error||"Lỗi");return}loadInv();
}
async function addProduct(){
  const id=prompt("ID sản phẩm (trùng id trên Mini App):");if(!id)return;
  const name=prompt("Tên sản phẩm:");if(!name)return;
  const stock=Number(prompt("Tồn kho ban đầu:","0")||0);
  const pwd=getPwd();
  const res=await fetch("/api/inventory",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pwd},body:JSON.stringify({id,name,stock})});
  const data=await res.json();if(!res.ok){alert(data.error||"Lỗi");return}loadInv();
}
function exportCSV(){
  const list=filteredList();if(!list.length){alert("Không có dữ liệu");return}
  const rows=[["Mã","Thời gian","Khách","SĐT","Địa chỉ","SP","Tổng","Trạng thái","Ghi chú","Lý do hủy"]];
  list.forEach(o=>{const s=o.shippingInfo||{};rows.push([o.id,o.createdAt||"",s.fullName||"",s.phone||"",s.address||"",
    (o.items||[]).map(i=>(i.name||"")+" x"+(i.quantity||1)).join("; "),o.total||0,o.status||"",o.note||"",o.cancelReason||""])});
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  a.download="don-hang.csv";a.click();
}
function printJnT(orderId){
  const o=allOrders.find(x=>x.id===orderId);if(!o){alert("Không thấy đơn");return}
  const s=o.shippingInfo||{},items=o.items||[];
  const productNames=items.length?items.map(i=>(i.name||"SP")+" x"+(i.quantity||1)).join(", "):"Mini App Thuộc Cô Ba Store";
  const total=money(o.total),phone=s.phone||"",fullName=s.fullName||"Khách",address=s.address||"—",orderCode=String(o.id);
  const barcodeValue=orderCode.replace(/[^0-9A-Za-z]/g,"").slice(-12)||orderCode;
  const sortCode=(orderCode.replace(/\\D/g,"").slice(-6)||orderCode.slice(-6)).toUpperCase();
  const w=window.open("","_blank","width=420,height=720");
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"/><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\\/script><style>@page{size:100mm 150mm;margin:0}body{font-family:Arial;width:100mm}table{width:100%;border-collapse:collapse}td{border:1.5px solid #000;padding:2mm;vertical-align:top;font-size:11px}.sort{font-size:24px;font-weight:900;text-align:center}</style></head><body><table><tr><td><b>Thuộc Cô Ba</b></td><td style="color:#e11d48;font-weight:900">J&T EXPRESS</td><td>ET</td></tr><tr><td colspan="3" style="text-align:center"><svg id="barcode"></svg><div>'+barcodeValue+'</div></td></tr><tr><td colspan="3" class="sort">'+sortCode+'</td></tr><tr><td colspan="2"><b>Gửi:</b> Kho Thuộc Cô Ba<br/>0977322861<br/>1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai<br/><br/><b>Nhận:</b> '+fullName+' '+phone+'<br/>'+address+'</td><td style="text-align:center"><canvas id="qrcode"></canvas></td></tr><tr><td colspan="2">Hàng: '+productNames+'<br/>COD</td><td style="text-align:center;font-weight:900">'+total+' đ<br/>COD</td></tr></table><script>try{JsBarcode("#barcode","'+barcodeValue+'",{format:"CODE128",width:1.3,height:40,displayValue:false})}catch(e){}try{QRCode.toCanvas(document.getElementById("qrcode"),"'+orderCode+'",{width:80,margin:0})}catch(e){}setTimeout(function(){print()},400)<\\/script></body></html>');
  w.document.close();
}
if(getPwd()){showApp();setRange("30d");refreshAll()}
</script></body></html>`;
}

const PORT = process.env.PORT || 3000;
ensureDataDir();
loadInventory();
app.listen(PORT, () => console.log("Server + DB file + Kho @", PORT, "DATA_DIR=", DATA_DIR));