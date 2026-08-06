import React from "react";

/**
 * Phiếu in đơn hàng kiểu J&T / Shopee / TikTok
 * Sử dụng: <OrderPrint order={orderData} onClose={() => setShowPrint(false)} />
 */
export default function OrderPrint({ order, onClose }) {
  if (!order) return null;

  const ship = order.shippingInfo || {};
  const items = order.items || [];
  const total = Number(order.total || 0).toLocaleString("vi-VN");
  const orderId = order.id || order.orderId || "—";
  const createdAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString("vi-VN")
    : order.date || "—";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Nút đóng + In (không in ra) */}
      <div
        className="no-print"
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={handlePrint}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🖨️ In phiếu
        </button>
        <button
          onClick={onClose}
          style={{
            background: "#666",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Đóng
        </button>
      </div>

      {/* ===== PHIẾU IN ===== */}
      <div
        id="print-area"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          padding: "18px 20px",
          borderRadius: 4,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 13,
          color: "#000",
          lineHeight: 1.4,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header shop */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>
            THUỘC CÔ BA
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Đặc sản mắm truyền thống OCOP 4 Sao
          </div>
          <div style={{ fontSize: 11, marginTop: 4, color: "#333" }}>
            1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai
          </div>
          <div style={{ fontSize: 11 }}>Hotline: 0909.xxx.xxx</div>
        </div>

        {/* Mã đơn + thời gian */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12 }}>
          <div>
            <strong>Mã đơn:</strong> {orderId}
          </div>
          <div>{createdAt}</div>
        </div>

        {/* Mã vạch giả (có thể thay bằng barcode thật sau) */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            border: "1px solid #000",
            padding: "8px 0",
            marginBottom: 14,
            background: "#f9f9f9",
          }}
        >
          *{orderId}*
        </div>

        {/* Người nhận - nổi bật */}
        <div
          style={{
            border: "2px solid #000",
            padding: "10px 12px",
            marginBottom: 14,
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            NGƯỜI NHẬN:
          </div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{ship.fullName || "—"}</div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: "4px 0" }}>
            {ship.phone || "—"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>
            {ship.address || "—"}
          </div>
        </div>

        {/* Danh sách sản phẩm */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, borderBottom: "1px solid #000", paddingBottom: 4 }}>
            SẢN PHẨM
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 0" }}>Tên sản phẩm</th>
                <th style={{ textAlign: "center", width: 40 }}>SL</th>
                <th style={{ textAlign: "right", width: 80 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "5px 0", borderBottom: "1px dashed #ccc" }}>
                      {item.name}
                    </td>
                    <td style={{ textAlign: "center", borderBottom: "1px dashed #ccc" }}>
                      {item.quantity || 1}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px dashed #ccc" }}>
                      {Number((item.price || 0) * (item.quantity || 1)).toLocaleString("vi-VN")}đ
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ padding: "8px 0", color: "#666" }}>
                    Không có thông tin sản phẩm
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tổng tiền */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 15,
            fontWeight: 900,
            borderTop: "2px solid #000",
            paddingTop: 8,
            marginBottom: 12,
          }}
        >
          <span>TỔNG THU (COD)</span>
          <span>{total} đ</span>
        </div>

        {/* Ghi chú */}
        <div style={{ fontSize: 11, color: "#333", marginBottom: 10 }}>
          <strong>Ghi chú:</strong> Thanh toán khi nhận hàng (COD). Kiểm tra hàng trước khi thanh toán.
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            borderTop: "1px dashed #000",
            paddingTop: 8,
            color: "#444",
          }}
        >
          Cảm ơn quý khách đã tin tưởng Thuộc Cô Ba!
          <br />
          Hotline hỗ trợ: 0909.xxx.xxx
        </div>
      </div>

      {/* CSS chỉ hiện khi in */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            border-radius: 0;
            padding: 10mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}