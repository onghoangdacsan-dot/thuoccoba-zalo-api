const express = require("express");
const CryptoJS = require("crypto-js");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_KEY = "fe49f1b0e06649e498929a7379cfdfbf";
const ADMIN_PASSWORD = "thuoccoba2026";

const ordersDB = new Map();

// Giải mã token số điện thoại từ Zalo Mini App
app.post("/api/get-phone-number", async (req, res) => {
  try {
    const { token, accessToken } = req.body;
    const APP_SECRET_KEY = process.env.ZALO_APP_SECRET_KEY; // lấy từ Zalo Developer Console

    if (!token || !accessToken) {
      return res.status(400).json({ error: "Thiếu token hoặc accessToken" });
    }

    const params = new URLSearchParams();
    params.append("code", token);
    params.append("secret_key", APP_SECRET_KEY);

    const zaloRes = await fetch("https://graph.zalo.me/v2.0/me/info?" + params.toString(), {
      method: "GET",
      headers: { access_token: accessToken },
    });

    const data = await zaloRes.json();
    console.log("Zalo phone decode response:", data);

    if (data?.data?.number) {
      return res.json({ phoneNumber: data.data.number });
    }
    return res.status(400).json({ error: data?.message || "Không giải mã được số điện thoại" });
  } catch (err) {
    console.error("get-phone-number error:", err);
    res.status(500).json({ error: "Lỗi server khi lấy số điện thoại" });
  }
});

app.post("/api/orders", (req, res) => {
  try {
    const orderId = "ORD_" + Date.now();
    const order = {
      id: orderId,
      items: req.body.items || [],
      shippingInfo: req.body.shippingInfo || {},
      subTotal: req.body.subTotal || 0,
      shippingFee: req.body.shippingFee || 0,
      total: req.body.total || req.body.finalTotal || 0,
      paymentMethod: req.body.paymentMethod || "COD",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ordersDB.set(orderId, order);
    console.log("Tạo đơn:", orderId);
    res.json({ orderId, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot create order" });
  }
});

app.get("/api/orders", (req, res) => {
  const list = Array.from(ordersDB.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

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
    if (!data || !mac) {
      return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    }

    const { appId, orderId, method, extradata, resultCode } = data;
    const str = `appId=${appId}&orderId=${orderId}&method=${method}`;
    const reqMac = CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString();

    if (reqMac !== mac) {
      return res.json({ returnCode: 0, returnMessage: "Invalid mac" });
    }

    console.log("Zalo Notify OK:", orderId, method, "resultCode:", resultCode);

    try {
      const extra =
        typeof extradata === "string" ? JSON.parse(extradata) : extradata;
      const myOrderId = extra?.orderId;

      if (myOrderId && ordersDB.has(myOrderId)) {
        const order = ordersDB.get(myOrderId);
        if (String(resultCode) === "1" || resultCode === 1) {
          order.status = "preparing";
          order.confirmedAt = new Date().toISOString();
          order.updatedAt = order.confirmedAt;
          ordersDB.set(myOrderId, order);
          console.log("Đã tự động chuyển đơn sang 'preparing':", myOrderId);
        }
      } else {
        console.warn(
          "Không tìm thấy đơn nội bộ khớp với extradata.orderId:",
          myOrderId
        );
      }
    } catch (parseErr) {
      console.error("Không parse được extradata:", parseErr);
    }

    return res.json({ returnCode: 1, returnMessage: "Success" });
  } catch (err) {
    console.error("zalo-notify error:", err);
    return res.json({ returnCode: 0, returnMessage: "Error" });
  }
});

app.post("/api/zalo-callback", (req, res) => {
  console.log("Zalo Callback:", req.body);
  res.json({ returnCode: 1, returnMessage: "Success" });
});

app.get(["/admin", "/admin.html"], (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Admin – Thuộc Cô Ba</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fdf8f0;margin:0;padding:16px}
h1{color:#8b4513;font-size:1.25rem}.card{background:#fff;border:1px solid #deb887;border-radius:12px;padding:16px;margin-bottom:16px}
input,button{font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid #ccc}
button{background:#8b4513;color:#fff;border:none;cursor:pointer;font-weight:600}
button.secondary{background:#666}button.ok{background:#16a34a}button.jnt{background:#ea580c}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border-bottom:1px solid #f0e6d8;padding:10px 6px;text-align:left;vertical-align:top}
th{color:#8b4513}.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:#fef3c7;color:#92400e}.preparing{background:#dbeafe;color:#1e40af}
.shipping{background:#e0e7ff;color:#3730a3}.completed{background:#dcfce7;color:#166534}
.actions{display:flex;flex-wrap:wrap;gap:4px}.actions button{font-size:11px;padding:4px 8px}
#loginBox{max-width:360px;margin:40px auto}#app{display:none}.muted{color:#888;font-size:12px}.err{color:#b91c1c;font-size:13px;margin-top:8px}
.products{font-size:11px;color:#555;margin-top:4px}
</style></head><body>
<div id="loginBox" class="card">
<h1>🔐 Admin – Thuộc Cô Ba</h1>
<p class="muted">Mật khẩu quản lý đơn hàng</p>
<input id="pwd" type="password" placeholder="Mật khẩu" style="width:100%;margin:8px 0"/>
<button onclick="login()" style="width:100%">Đăng nhập</button>
<div id="loginErr" class="err"></div>
</div>
<div id="app">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<h1>📦 Đơn hàng Mini App</h1>
<div>
<button class="secondary" onclick="loadOrders()">↻ Tải lại</button>
<button class="secondary" onclick="logout()">Thoát</button>
</div></div>
<div class="card">
<div id="stats" class="muted" style="margin-bottom:12px"></div>
<div style="overflow-x:auto"><table>
<thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách / Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
<tbody id="tbody"></tbody>
</table></div></div></div>
<script>
const STATUS_LABEL={pending:"Chờ xác nhận",preparing:"Đang chuẩn bị",shipping:"Đang giao",completed:"Đã giao"};
function getPwd(){return sessionStorage.getItem("admin_pwd")||""}
function login(){const p=document.getElementById("pwd").value.trim();if(!p){document.getElementById("loginErr").textContent="Nhập mật khẩu";return}sessionStorage.setItem("admin_pwd",p);document.getElementById("loginErr").textContent="";showApp();loadOrders()}
function logout(){sessionStorage.removeItem("admin_pwd");document.getElementById("app").style.display="none";document.getElementById("loginBox").style.display="block"}
function showApp(){document.getElementById("loginBox").style.display="none";document.getElementById("app").style.display="block"}
async function loadOrders(){try{const res=await fetch("/api/orders");const list=await res.json();render(list)}catch(e){alert("Không tải được đơn: "+e.message)}}
function render(list){
  const c={pending:0,preparing:0,shipping:0,completed:0};
  list.forEach(o=>{if(c[o.status]!=null)c[o.status]++});
  document.getElementById("stats").textContent="Tổng "+list.length+" · Chờ "+c.pending+" · Chuẩn bị "+c.preparing+" · Giao "+c.shipping+" · Xong "+c.completed;
  const tbody=document.getElementById("tbody");
  if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="muted">Chưa có đơn</td></tr>';return}
  tbody.innerHTML=list.map(o=>{
    const s=o.shippingInfo||{};
    const st=o.status||"pending";
    const total=Number(o.total||0).toLocaleString("vi-VN");
    const time=o.createdAt?new Date(o.createdAt).toLocaleString("vi-VN"):"—";
    const items=o.items||[];
    const productsHtml=items.length
      ? '<div class="products">'+items.map(i=>((i.name||"SP")+" x"+(i.quantity||1))).join("<br/>")+"</div>"
      : '<div class="products muted">Chưa có SP</div>';
    return '<tr>'+
      '<td><b>'+o.id+'</b></td>'+
      '<td>'+time+'</td>'+
      '<td>'+(s.fullName||"—")+'<br/><span class="muted">'+(s.phone||"")+'</span><br/><span class="muted">'+(s.address||"")+'</span>'+productsHtml+'</td>'+
      '<td><b>'+total+' đ</b></td>'+
      '<td><span class="badge '+st+'">'+(STATUS_LABEL[st]||st)+'</span></td>'+
      '<td class="actions">'+
        '<button onclick="setStatus(\\''+o.id+'\\',\\'preparing\\')">Chuẩn bị</button> '+
        '<button onclick="setStatus(\\''+o.id+'\\',\\'shipping\\')">Đang giao</button> '+
        '<button class="ok" onclick="setStatus(\\''+o.id+'\\',\\'completed\\')">Đã giao</button> '+
        '<button class="jnt" onclick="printJnT(\\''+o.id+'\\')">In phiếu J&T</button>'+
      '</td></tr>';
  }).join("");
}
async function setStatus(orderId,status){
  const pwd=getPwd();if(!pwd){logout();return}
  try{
    const res=await fetch("/api/orders/"+encodeURIComponent(orderId)+"/status",{
      method:"PATCH",
      headers:{"Content-Type":"application/json","x-admin-password":pwd},
      body:JSON.stringify({status})
    });
    const data=await res.json();
    if(!res.ok){alert(data.error||"Lỗi");if(res.status===401)logout();return}
    loadOrders();
  }catch(e){alert(e.message)}
}
function printJnT(orderId){
  fetch("/api/orders").then(res=>res.json()).then(list=>{
    const o=list.find(item=>item.id===orderId);
    if(!o){alert("Không tìm thấy đơn hàng");return}
    const s=o.shippingInfo||{};
    const items=o.items||[];
    const productNames=items.length
      ? items.map(i=>((i.name||"SP")+" x"+(i.quantity||1))).join(", ")
      : "Mini App Thuộc Cô Ba Store";
    const total=Number(o.total||0).toLocaleString("vi-VN");
    const phone=s.phone||"";
    const fullName=s.fullName||"Khách hàng";
    const address=s.address||"—";
    const orderCode=String(o.id||orderId);
    const barcodeValue=orderCode.replace(/[^0-9A-Za-z]/g,"").slice(-12) || orderCode;
    const sortCode=(orderCode.replace(/\\D/g,"").slice(-6) || orderCode.slice(-6)).toUpperCase();

    const w=window.open("","_blank","width=420,height=720");
    w.document.write(\`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Vận đơn J&T - \${orderCode}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\\/script>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    width: 100mm;
    min-height: 150mm;
    padding: 0;
    color: #000;
    background: #fff;
  }
  table.main { width: 100%; border-collapse: collapse; }
  table.main td, table.main th { border: 1.5px solid #000; vertical-align: top; }
  .header td { text-align: center; font-weight: 900; font-size: 12px; padding: 3mm 2mm; }
  .tiktok { color: #000; }
  .jt { color: #e11d48; font-size: 13px; }
  .et { font-size: 14px; letter-spacing: 1px; }
  .barcode-cell { text-align: center; padding: 2mm; }
  .barcode-num { font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-top: 1mm; }
  .sort-code { text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 2px; padding: 3mm; }
  .info { font-size: 10.5px; line-height: 1.35; padding: 2mm; }
  .info b { font-size: 11px; }
  .label { font-weight: 900; font-size: 10px; margin-bottom: 1mm; }
  .right-box { text-align: center; padding: 2mm; width: 32mm; }
  .hub { font-size: 16px; font-weight: 900; margin-bottom: 2mm; }
  #qrcode { margin: 0 auto; }
  .meta { font-size: 10px; line-height: 1.4; padding: 2mm; }
  .cod-title { font-size: 10px; font-weight: 700; }
  .cod-value { font-size: 14px; font-weight: 900; margin-top: 1mm; }
  .sign { height: 16mm; font-size: 10px; padding: 2mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<table class="main">
  <tr class="header">
    <td class="tiktok" style="width:38%">Mini App<br/>Thuộc Cô Ba Store</td>
    <td class="jt" style="width:38%">J&amp;T EXPRESS</td>
    <td class="et" style="width:24%">ET</td>
  </tr>
  <tr>
    <td colspan="3" class="barcode-cell">
      <svg id="barcode"></svg>
      <div class="barcode-num">\${barcodeValue}</div>
    </td>
  </tr>
  <tr>
    <td colspan="3" class="sort-code">\${sortCode}</td>
  </tr>
  <tr>
    <td colspan="2" class="info">
      <div class="label">Thông tin người gửi:</div>
      <div><b>Kho Thuộc Cô Ba</b> &nbsp; (+84)0977322861</div>
      <div>1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai</div>
      <div style="margin-top:2mm" class="label">Thông tin người nhận:</div>
      <div><b>\${fullName}</b> &nbsp; (+84)\${phone}</div>
      <div>\${address}</div>
    </td>
    <td class="right-box">
      <div class="hub">SGN</div>
      <canvas id="qrcode" width="90" height="90"></canvas>
    </td>
  </tr>
  <tr>
    <td colspan="2" class="meta">
      <div>TL tính phí: 0.500 KG</div>
      <div>Nội dung hàng hóa: \${productNames}</div>
      <div>PTTT/Tổng cước phí: COD</div>
      <div>TT số thứ tự: \${orderCode}</div>
      <div>Nhận xét:</div>
    </td>
    <td class="right-box">
      <div class="cod-title">Tiền thu hộ:</div>
      <div class="cod-value">\${total} đ</div>
      <div style="font-weight:900;margin-top:2mm">COD</div>
      <div class="sign" style="margin-top:3mm;border-top:1px dashed #000">Người nhận ký:</div>
    </td>
  </tr>
</table>
<script>
  try {
    JsBarcode("#barcode", "\${barcodeValue}", {
      format: "CODE128",
      width: 1.4,
      height: 42,
      displayValue: false,
      margin: 0
    });
  } catch(e) {}
  try {
    QRCode.toCanvas(document.getElementById("qrcode"), "\${orderCode}", {
      width: 90,
      margin: 0
    });
  } catch(e) {}
  window.onload = function() {
    setTimeout(function(){ window.print(); }, 400);
  };
<\\/script>
</body>
</html>\`);
    w.document.close();
  }).catch(e=>alert("Lỗi tải thông tin in: "+e.message));
}
if(getPwd()){showApp();loadOrders()}
</script></body></html>`);
});

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API đang chạy. Admin: /admin");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server chạy cổng", PORT));