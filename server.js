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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
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
  try {
    const result = await pool.query("SELECT data FROM orders ORDER BY created_at DESC");
    res.json(result.rows.map((r) => r.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot get orders" });
  }
});

app.post("/api/orders/:orderId/cancel", async (req, res) => {
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
.cancelled{background:#fee2e2;color:#991b1b}
.actions{display:flex;flex-wrap:wrap;gap:4px}.actions button{font-size:11px;padding:4px 8px}
#loginBox{max-width:380px;margin:48px auto}#app{display:none}.muted{color:var(--m);font-size:12px}
.err{color:#b91c1c;font-size:13px;margin-top:8px}.products{font-size:11px;color:#555;margin-top:4px;line-height:1.4}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px}
.stat{background:#fff;border:1px solid var(--b);border-radius:12px;padding:12px 14px}
.stat .label{font-size:11px;color:var(--m);font-weight:600}.stat .value{font-size:18px;font-weight:800;color:var(--p);margin-top:4px}
.stat .sub{font-size:11px;color:var(--m);margin-top:2px}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
</style></head><body>
<div id="loginBox" class="card">
  <h1>🔐 Admin – Thuộc Cô Ba</h1>
  <p class="muted">PostgreSQL · Lịch sử đơn dài hạn</p>
  <input id="pwd" type="password" placeholder="Mật khẩu" style="width:100%;margin:8px 0"/>
  <button onclick="login()" style="width:100%">Đăng nhập</button>
  <div id="loginErr" class="err"></div>
</div>

<div id="app">
  <div class="toolbar">
    <div>
      <h1>📦 Đơn hàng Mini App</h1>
      <div class="muted" id="lastUpdated">—</div>
    </div>
    <div class="row">
      <button class="secondary" onclick="loadOrders()">↻ Tải lại</button>
      <button class="ghost" onclick="exportCSV()">⬇ Xuất CSV</button>
      <button class="secondary" onclick="logout()">Thoát</button>
    </div>
  </div>

  <div class="stats" id="statsCards"></div>

  <div class="card">
    <div style="font-weight:700;color:var(--p);margin-bottom:10px">📅 Lịch sử & bộ lọc</div>
    <div class="filters">
      <button class="ghost" id="fToday" onclick="setRange('today')">Hôm nay</button>
      <button class="ghost" id="f7" onclick="setRange('7d')">7 ngày</button>
      <button class="ghost" id="f30" onclick="setRange('30d')">30 ngày</button>
      <button class="ghost" id="fAll" onclick="setRange('all')">Tất cả</button>
      <span class="muted">hoặc</span>
      <input type="date" id="fromDate"/>
      <span class="muted">→</span>
      <input type="date" id="toDate"/>
      <button class="ghost" onclick="setRange('custom')">Áp dụng</button>
    </div>
    <div class="filters">
      <input type="search" id="q" placeholder="Tìm mã đơn, tên, SĐT, địa chỉ, SP..." style="flex:1;min-width:200px" oninput="applyFilters()"/>
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
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Mã đơn</th><th>Thời gian</th><th>Khách / Sản phẩm</th>
            <th>Tổng</th><th>TT</th><th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </div>
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
  showApp(); setRange("30d"); loadOrders();
}
function logout(){
  sessionStorage.removeItem("admin_pwd");
  document.getElementById("app").style.display="none";
  document.getElementById("loginBox").style.display="block";
}
function showApp(){
  document.getElementById("loginBox").style.display="none";
  document.getElementById("app").style.display="block";
}
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()}
function endOfDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x.getTime()}
function setRange(mode){
  rangeMode=mode; const now=new Date();
  ["fToday","f7","f30","fAll"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove("active-filter");
  });
  if(mode==="today"){ fromTs=startOfDay(now); toTs=endOfDay(now); document.getElementById("fToday").classList.add("active-filter"); }
  else if(mode==="7d"){ fromTs=startOfDay(new Date(now.getTime()-6*864e5)); toTs=endOfDay(now); document.getElementById("f7").classList.add("active-filter"); }
  else if(mode==="30d"){ fromTs=startOfDay(new Date(now.getTime()-29*864e5)); toTs=endOfDay(now); document.getElementById("f30").classList.add("active-filter"); }
  else if(mode==="all"){ fromTs=null; toTs=null; document.getElementById("fAll").classList.add("active-filter"); }
  else if(mode==="custom"){
    const f=document.getElementById("fromDate").value, t=document.getElementById("toDate").value;
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
    if(fromTs!=null && ts<fromTs) return false;
    if(toTs!=null && ts>toTs) return false;
    if(st && o.status!==st) return false;
    if(q){
      const s=o.shippingInfo||{};
      const items=(o.items||[]).map(i=>i.name||"").join(" ");
      const hay=[o.id,s.fullName,s.phone,s.address,o.note,o.cancelReason,items].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function renderStats(list){
  const c={pending:0,preparing:0,shipping:0,completed:0,cancelled:0};
  let revenue=0, active=0, cancelAmt=0;
  list.forEach(o=>{
    if(c[o.status]!=null) c[o.status]++;
    const t=Number(o.total||0);
    if(o.status==="completed") revenue+=t;
    if(o.status==="cancelled") cancelAmt+=t; else active+=t;
  });
  document.getElementById("statsCards").innerHTML=
    '<div class="stat"><div class="label">Tổng đơn (lọc)</div><div class="value">'+list.length+'</div></div>'+
    '<div class="stat"><div class="label">Doanh thu đã giao</div><div class="value">'+money(revenue)+'đ</div></div>'+
    '<div class="stat"><div class="label">Giá trị còn hiệu lực</div><div class="value">'+money(active)+'đ</div></div>'+
    '<div class="stat"><div class="label">Chờ xác nhận</div><div class="value">'+c.pending+'</div></div>'+
    '<div class="stat"><div class="label">Đang xử lý / giao</div><div class="value">'+(c.preparing+c.shipping)+'</div><div class="sub">CB '+c.preparing+' · Giao '+c.shipping+'</div></div>'+
    '<div class="stat"><div class="label">Đã hủy</div><div class="value">'+c.cancelled+'</div><div class="sub">'+money(cancelAmt)+'đ</div></div>';
}
function applyFilters(){
  const list=filteredList();
  renderStats(list);
  const label={today:"Hôm nay","7d":"7 ngày","30d":"30 ngày",all:"Toàn bộ",custom:"Tùy chọn"}[rangeMode]||"";
  document.getElementById("filterInfo").textContent=label+" · Hiển thị "+list.length+" / "+allOrders.length+" đơn";
  const tbody=document.getElementById("tbody");
  if(!list.length){ tbody.innerHTML='<tr><td colspan="6" class="muted">Không có đơn trong bộ lọc</td></tr>'; return; }
  tbody.innerHTML=list.map(o=>{
    const s=o.shippingInfo||{}, st=o.status||"pending";
    const items=o.items||[];
    const products=items.length?'<div class="products">'+items.map(i=>escapeHtml(i.name||"SP")+" ×"+(i.quantity||1)).join("<br/>")+"</div>":"";
    const note=o.note?'<div class="products" style="color:#b45309">Ghi chú: '+escapeHtml(o.note)+"</div>":"";
    const cancel=st==="cancelled"&&o.cancelReason?'<div class="products" style="color:#991b1b">Hủy: '+escapeHtml(o.cancelReason)+"</div>":"";
    return "<tr><td><b>"+escapeHtml(o.id)+"</b></td><td>"+(o.createdAt?new Date(o.createdAt).toLocaleString("vi-VN"):"—")+
      "</td><td>"+escapeHtml(s.fullName||"—")+"<br/><span class=\\"muted\\">"+escapeHtml(s.phone||"")+
      "</span><br/><span class=\\"muted\\">"+escapeHtml(s.address||"")+"</span>"+products+note+cancel+
      "</td><td><b>"+money(o.total)+" đ</b><div class=\\"muted\\">"+(o.paymentMethod||"COD")+
      "</div></td><td><span class=\\"badge "+st+"\\">"+(STATUS_LABEL[st]||st)+
      "</span></td><td class=\\"actions\\">"+
      "<button onclick=\\"setStatus('"+o.id+"','preparing')\\">Chuẩn bị</button> "+
      "<button onclick=\\"setStatus('"+o.id+"','shipping')\\">Đang giao</button> "+
      "<button class=ok onclick=\\"setStatus('"+o.id+"','completed')\\">Đã giao</button> "+
      "<button class=danger onclick=\\"setStatus('"+o.id+"','cancelled')\\">Hủy</button> "+
      "<button class=jnt onclick=\\"printJnT('"+o.id+"')\\">In J&T</button></td></tr>";
  }).join("");
}
async function loadOrders(){
  try{
    const res=await fetch("/api/orders");
    allOrders=await res.json();
    document.getElementById("lastUpdated").textContent="Cập nhật: "+new Date().toLocaleString("vi-VN");
    applyFilters();
  }catch(e){ alert("Không tải được đơn: "+e.message); }
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
    if(!res.ok){ alert(data.error||"Lỗi"); if(res.status===401) logout(); return; }
    loadOrders();
  }catch(e){ alert(e.message); }
}
function exportCSV(){
  const list=filteredList();
  if(!list.length){ alert("Không có dữ liệu"); return; }
  const rows=[["Mã","Thời gian","Khách","SĐT","Địa chỉ","SP","Tổng","Trạng thái","Ghi chú","Lý do hủy"]];
  list.forEach(o=>{
    const s=o.shippingInfo||{};
    rows.push([o.id,o.createdAt||"",s.fullName||"",s.phone||"",s.address||"",
      (o.items||[]).map(i=>(i.name||"")+" x"+(i.quantity||1)).join("; "),
      o.total||0,o.status||"",o.note||"",o.cancelReason||""]);
  });
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(",")).join("\\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  a.download="don-hang-thuoc-co-ba.csv"; a.click();
}
function printJnT(orderId){
  const o=allOrders.find(x=>x.id===orderId);
  if(!o){ alert("Không tìm thấy đơn"); return; }
  const s=o.shippingInfo||{}, items=o.items||[];
  const productNames=items.length?items.map(i=>(i.name||"SP")+" x"+(i.quantity||1)).join(", "):"Mini App Thuộc Cô Ba Store";
  const total=money(o.total), phone=s.phone||"", fullName=s.fullName||"Khách hàng", address=s.address||"—";
  const orderCode=String(o.id);
  const barcodeValue=orderCode.replace(/[^0-9A-Za-z]/g,"").slice(-12)||orderCode;
  const sortCode=(orderCode.replace(/\\D/g,"").slice(-6)||orderCode.slice(-6)).toUpperCase();
  const w=window.open("","_blank","width=420,height=720");
  w.document.write(\`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/>
<title>J&T \${orderCode}</title>
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
try{QRCode.toCanvas(document.getElementById("qrcode"),"\${orderCode}",{width:90,margin:0})}catch(e){}
window.onload=function(){setTimeout(function(){window.print()},400)};
<\\/script></body></html>\`);
  w.document.close();
}
if(getPwd()){ showApp(); setRange("30d"); loadOrders(); }
</script>
</body></html>`);
});

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API (PostgreSQL). Admin: /admin");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server chạy cổng", PORT));