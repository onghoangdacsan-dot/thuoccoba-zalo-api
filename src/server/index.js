const path = require("path");
const fs = require("fs");
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

// Route trang admin nhúng trực tiếp giao diện HTML kèm tính năng In phiếu J&T
app.get(["/admin", "/admin.html"], (req, res) => {  
  res.setHeader("Content-Type", "text/html; charset=utf-8");  
  res.send(`<!DOCTYPE html><html lang="vi"><head>  <meta charset="UTF-8" />  <meta name="viewport" content="width=device-width, initial-scale=1" />  <title>Admin – Thuộc Cô Ba</title>  <style>    *{box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fdf8f0;margin:0;padding:16px}    h1{color:#8b4513;font-size:1.25rem}.card{background:#fff;border:1px solid #deb887;border-radius:12px;padding:16px;margin-bottom:16px}    input,button{font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid #ccc}    button{background:#8b4513;color:#fff;border:none;cursor:pointer;font-weight:600}    button.secondary{background:#666}button.ok{background:#16a34a}button.jnt{background:#ea580c}    table{width:100%;border-collapse:collapse;font-size:13px}    th,td{border-bottom:1px solid #f0e6d8;padding:10px 6px;text-align:left;vertical-align:top}    th{color:#8b4513}.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}    .pending{background:#fef3c7;color:#92400e}.preparing{background:#dbeafe;color:#1e40af}    .shipping{background:#e0e7ff;color:#3730a3}.completed{background:#dcfce7;color:#166534}    .actions{display:flex;flex-wrap:wrap;gap:4px}.actions button{font-size:11px;padding:4px 8px}    #loginBox{max-width:360px;margin:40px auto}#app{display:none}.muted{color:#888;font-size:12px}.err{color:#b91c1c;font-size:13px;margin-top:8px}  </style></head><body>  <div id="loginBox" class="card">    <h1>🔐 Admin – Thuộc Cô Ba</h1>    <p class="muted">Nhập mật khẩu quản lý đơn hàng</p>    <input id="pwd" type="password" placeholder="Mật khẩu" style="width:100%;margin:8px 0" />    <button onclick="login()" style="width:100%">Đăng nhập</button>    <div id="loginErr" class="err"></div>  </div>  <div id="app">    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">      <h1>📦 Đơn hàng Mini App</h1>      <div>        <button class="secondary" onclick="loadOrders()">↻ Tải lại</button>        <button class="secondary" onclick="logout()">Thoát</button>      </div>    </div>    <div class="card">      <div id="stats" class="muted" style="margin-bottom:12px"></div>      <div style="overflow-x:auto">        <table>          <thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>          <tbody id="tbody"></tbody>        </table>      </div>    </div>  </div>  <script>    const STATUS_LABEL={pending:"Chờ xác nhận",preparing:"Đang chuẩn bị",shipping:"Đang giao",completed:"Đã giao"};    function getPwd(){return sessionStorage.getItem("admin_pwd")||""}    function login(){const p=document.getElementById("pwd").value.trim();if(!p){document.getElementById("loginErr").textContent="Nhập mật khẩu";return}sessionStorage.setItem("admin_pwd",p);document.getElementById("loginErr").textContent="";showApp();loadOrders()}    function logout(){sessionStorage.removeItem("admin_pwd");document.getElementById("app").style.display="none";document.getElementById("loginBox").style.display="block"}    function showApp(){document.getElementById("loginBox").style.display="none";document.getElementById("app").style.display="block"}    async function loadOrders(){try{const res=await fetch("/api/orders");const list=await res.json();render(list)}catch(e){alert("Không tải được đơn: "+e.message)}}    function render(list){      const c={pending:0,preparing:0,shipping:0,completed:0};list.forEach(o=>{if(c[o.status]!=null)c[o.status]++});      document.getElementById("stats").textContent="Tổng "+list.length+" · Chờ "+c.pending+" · Chuẩn bị "+c.preparing+" · Giao "+c.shipping+" · Xong "+c.completed;      const tbody=document.getElementById("tbody");      if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="muted">Chưa có đơn</td></tr>';return}      tbody.innerHTML=list.map(o=>{        const s=o.shippingInfo||{};const st=o.status||"pending";        const total=Number(o.total||0).toLocaleString("vi-VN");        const time=o.createdAt?new Date(o.createdAt).toLocaleString("vi-VN"):"—";        return "<tr><td><b>"+o.id+"</b></td><td>"+time+"</td><td>"+(s.fullName||"—")+"<br><span class=muted>"+(s.phone||"")+"</span><br><span class=muted>"+(s.address||"")+"</span></td><td><b>"+total+" đ</b></td><td><span class=\\"badge "+st+"\\">"+(STATUS_LABEL[st]||st)+"</span></td><td class=actions><button onclick=\\"setStatus('"+o.id+"','preparing')\\">Chuẩn bị</button> <button onclick=\\"setStatus('"+o.id+"','shipping')\\">Đang giao</button> <button class=ok onclick=\\"setStatus('"+o.id+"','completed')\\">Đã giao</button> <button class=jnt onclick=\\"printJnT('"+o.id+"')\\">In phiếu J&T</button></td></tr>"      }).join("")    }    async function setStatus(orderId,status){      const pwd=getPwd();if(!pwd){logout();return}      try{        const res=await fetch("/api/orders/"+encodeURIComponent(orderId)+"/status",{method:"PATCH",headers:{"Content-Type":"application/json","x-admin-password":pwd},body:JSON.stringify({status})});        const data=await res.json();        if(!res.ok){alert(data.error||"Lỗi");if(res.status===401)logout();return}        loadOrders()      }catch(e){alert(e.message)}    }    function printJnT(orderId){      fetch("/api/orders").then(res=>res.json()).then(list=>{        const o=list.find(item=>item.id===orderId);        if(!o){alert("Không tìm thấy đơn hàng");return}        const s=o.shippingInfo||{};        const printWindow=window.open('','_blank','width=400,height=600');        printWindow.document.write(\`          <html>          <head><title>In vận đơn - \${o.id}</title><style>            body{font-family:monospace;padding:10px;width:380px;margin:0 auto;color:#000}            .box{border:2px solid #000;padding:8px;margin-bottom:8px}            h2{text-align:center;margin:0 0 5px 0;font-size:16px}            .bold{font-weight:bold}.center{text-align:center}.barcode{text-align:center;font-size:18px;font-weight:bold;letter-spacing:2px;margin:5px 0}          </style></head>          <body>            <div class="box">              <h2>THUỐC CÔ BA - EXPRESS</h2>              <div class="center">Mã Vận Đơn</div>              <div class="barcode">*\${o.id}*</div>            </div>            <div class="box">              <div class="bold">NGƯỜI GỬI:</div>              <div>Kho Thuốc Cô Ba, Hoài Nhơn, Bình Định</div>              <div>ĐT: 0977322861</div>            </div>            <div class="box">              <div class="bold">NGƯỜI NHẬN:</div>              <div class="bold">\${s.fullName || 'Khách hàng'} - \${s.phone || ''}</div>              <div>Địa chỉ: \${s.address || '—'}</div>            </div>            <div class="box">              <div class="bold">NỘI DUNG HÀNG HÓA:</div>              <div>Sản phẩm đặc sản (Tổng: \${Number(o.total || 0).toLocaleString("vi-VN")} đ)</div>            </div>            <script>window.onload=function(){window.print();}<\\/script>          </body>          </html>          \`);        printWindow.document.close();      }).catch(e=>alert("Lỗi tải thông tin in: "+e.message));    }    if(getPwd()){showApp();loadOrders()}  </script></body></html>`);
});

const APP_SECRET_KEY = process.env.ZALO_APP_SECRET_KEY; 
const OA_SECRET_KEY = process.env.ZALO_OA_SECRET_KEY;   
const APP_ID = process.env.ZALO_APP_ID;                 

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

const ADMIN_PASSWORD = "thuoccoba2026"; 

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