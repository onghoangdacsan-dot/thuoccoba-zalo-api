function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thuộc Cô Ba · Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#F5F0E8;
  --panel:#FFFFFF;
  --card:#FFFFFF;
  --line:#E8DFD2;
  --sidebar:#2C1810;
  --sidebar-text:#F5EDE4;
  --gold:#C4A35A;
  --gold2:#8B4513;
  --brown:#6B3E26;
  --text:#1C1410;
  --muted:#7A6A5A;
  --soft:#FBF7F2;
}
*{box-sizing:border-box}
body{margin:0;font-family:'Be Vietnam Pro',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
button,input,select{font:inherit}
button{cursor:pointer;border:none;border-radius:10px;padding:9px 14px;font-weight:600;transition:.15s}
button:hover{filter:brightness(1.05)}
.layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
.sidebar{background:var(--sidebar);padding:22px 14px;position:sticky;top:0;height:100vh;color:var(--sidebar-text)}
.brand{display:flex;gap:12px;align-items:center;padding:6px 10px 24px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:16px}
.brand-badge{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#E8C87A,var(--gold2));display:flex;align-items:center;justify-content:center;font-weight:800;color:#2C1810;font-size:14px}
.brand h1{font-size:15px;margin:0;color:#FFF;font-weight:700}
.brand span{font-size:11px;color:rgba(245,237,228,.65)}
.nav button{width:100%;text-align:left;background:transparent;color:rgba(245,237,228,.7);margin-bottom:4px;padding:11px 14px;border-radius:10px}
.nav button.on,.nav button:hover{background:rgba(196,163,90,.2);color:#F5E6C8}
.main{padding:24px 28px 48px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.topbar h2{margin:0;font-size:24px;font-weight:800;color:var(--brown);letter-spacing:-.02em}
.sub{color:var(--muted);font-size:12px;margin-top:4px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.btn-gold{background:linear-gradient(135deg,#C4A35A,#8B4513);color:#FFF;box-shadow:0 2px 8px rgba(139,69,19,.2)}
.btn-ghost{background:#FFF;border:1px solid var(--line);color:var(--brown)}
.hero{
  border-radius:16px;margin-bottom:20px;padding:22px 24px;
  background:linear-gradient(120deg,#FFF9F0 0%,#F3E6D4 50%,#EDE0CC 100%);
  border:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;
  box-shadow:0 1px 3px rgba(44,24,16,.04);
}
.hero h3{margin:0 0 6px;font-size:18px;color:var(--brown);font-weight:800}
.hero p{margin:0;color:var(--muted);font-size:13px;max-width:520px;line-height:1.55}
.hero-chip{background:#FFF;border:1px solid var(--line);color:var(--gold2);padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700}
.kpis{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:12px;margin-bottom:18px}
@media(max-width:1100px){.layout{grid-template-columns:1fr}.sidebar{display:none}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}.main{padding:16px}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:0 1px 3px rgba(44,24,16,.04)}
.kpi .label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.kpi .value{font-size:22px;font-weight:800;margin-top:8px;color:var(--gold2)}
.kpi .hint{font-size:11px;color:var(--muted);margin-top:4px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:0 1px 3px rgba(44,24,16,.04)}
.panel-title{font-size:14px;font-weight:700;margin:0 0 14px;color:var(--brown)}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.chip{background:var(--soft);border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:8px 14px;font-size:12px}
.chip.on{background:var(--gold2);border-color:var(--gold2);color:#FFF}
input,select{background:#FFF;border:1px solid var(--line);color:var(--text);border-radius:10px;padding:9px 12px}
input:focus,select:focus{outline:2px solid rgba(139,69,19,.25);border-color:var(--gold2)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--muted);font-weight:600;padding:12px 8px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.03em}
td{padding:14px 8px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--text)}
tr:hover td{background:var(--soft)}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}
.pending{background:#FEF3C7;color:#92400E}
.preparing{background:#DBEAFE;color:#1E40AF}
.shipping{background:#E0E7FF;color:#3730A3}
.completed{background:#DCFCE7;color:#166534}
.cancelled{background:#FEE2E2;color:#991B1B}
.row-btns{display:flex;flex-wrap:wrap;gap:4px}
.row-btns button{font-size:11px;padding:6px 10px;border-radius:8px}
.b-prep{background:#1E40AF;color:#FFF}.b-ship{background:#4338CA;color:#FFF}
.b-ok{background:#166534;color:#FFF}.b-bad{background:#B91C1C;color:#FFF}.b-jnt{background:#C2410C;color:#FFF}
.muted{color:var(--muted);font-size:12px}
.products{font-size:11px;color:#6B5B4B;margin-top:4px;line-height:1.45}
.chart{display:flex;align-items:flex-end;gap:10px;height:140px;padding:8px 4px 0}
.bar-wrap{flex:1;text-align:center}
.bar{background:linear-gradient(180deg,#C4A35A,var(--gold2));border-radius:8px 8px 4px 4px;min-height:6px;box-shadow:0 2px 6px rgba(139,69,19,.15)}
.bar-label{font-size:11px;color:var(--muted);margin-top:8px;font-weight:500}
#loginBox{max-width:400px;margin:12vh auto;background:#FFF;border:1px solid var(--line);border-radius:18px;padding:32px;box-shadow:0 8px 30px rgba(44,24,16,.08)}
#loginBox h1{margin:0 0 6px;font-size:22px;color:var(--brown)}
#loginBox p{color:var(--muted);font-size:13px;margin:0}
#loginBox input{width:100%;margin:16px 0;padding:12px 14px}
#loginBox button{width:100%;background:linear-gradient(135deg,#C4A35A,#8B4513);color:#FFF;padding:12px}
.err{color:#B91C1C;font-size:13px;margin-top:8px}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.banner-card{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--soft);min-height:130px;position:relative}
.banner-card .bg{position:absolute;inset:0;opacity:.4;background-size:cover;background-position:center}
.banner-card .body{position:relative;padding:16px}
.banner-card h4{margin:0 0 4px;font-size:14px;color:var(--brown)}.banner-card p{margin:0;font-size:12px;color:var(--muted)}
.hidden{display:none!important}
</style>
</head>
<body>
<div id="loginBox">
  <h1>Thuộc Cô Ba</h1>
  <p>Command Center · Quản trị đơn hàng</p>
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
      ? '<div class="products" style="color:#991B1B">Hủy: ' + escapeHtml(o.cancelReason) + '</div>'
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