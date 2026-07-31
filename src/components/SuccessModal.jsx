import React from "react";

export default function SuccessModal({ visible, paymentMethod, onContinueShopping, onViewOrders }) {
  if (!visible) return null;

  const getPaymentName = (method) => {
    switch (method) {
      case "momo": return "Ví điện tử MoMo";
      case "zalopay": return "Ví ZaloPay";
      default: return "Thanh toán khi nhận hàng (COD)";
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#fff", width: "100%", maxWidth: "320px",
        borderRadius: "12px", padding: "20px", textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
        
        {/* 7. HÀNG TRÊN: ĐẶT HÀNG THÀNH CÔNG */}
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a", margin: "0 0 10px 0" }}>
          Đặt hàng thành công!
        </h3>
        
        {/* 7. HÀNG DƯỚI: PHƯƠNG THỨC THANH TOÁN */}
        <p style={{ fontSize: "13px", color: "#555", margin: "0 0 20px 0", backgroundColor: "#f9fafb", padding: "8px", borderRadius: "6px" }}>
          Phương thức thanh toán: <strong style={{ color: "#333" }}>{getPaymentName(paymentMethod)}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={onViewOrders}
            style={{
              width: "100%", backgroundColor: "#8B4513", color: "#fff",
              border: "none", padding: "10px", borderRadius: "8px",
              fontSize: "14px", fontWeight: "bold", cursor: "pointer"
            }}
          >
            Xem lịch sử đơn hàng
          </button>
          <button
            onClick={onContinueShopping}
            style={{
              width: "100%", backgroundColor: "#f3f4f6", color: "#333",
              border: "none", padding: "10px", borderRadius: "8px",
              fontSize: "14px", fontWeight: "500", cursor: "pointer"
            }}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
}