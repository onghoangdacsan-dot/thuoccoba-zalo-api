import React, { useState, useEffect } from "react";
import { Page, Box, Text, useNavigate } from "zmp-ui";

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCartItems(savedCart);
    } catch (e) { console.error(e); }
  }, []);

  const updateQuantity = (id, delta) => {
    const updated = cartItems.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Giỏ hàng trống!");
      return;
    }
    alert("Đặt hàng thành công! Cảm ơn bạn đã ủng hộ Thuộc Cô Ba.");
    localStorage.removeItem("cart");
    setCartItems([]);
  };

  return (
    <Page style={{ backgroundColor: "#F8F9FA", paddingBottom: "110px" }}>
      <Box style={{ background: "#8B0000", padding: "14px 16px", textAlign: "center" }}>
        <Text style={{ fontSize: "16px", fontWeight: "900", color: "#FFFFFF" }}>GIỎ HÀNG CỦA BẠN</Text>
      </Box>

      <Box style={{ padding: "12px" }}>
        {cartItems.length === 0 ? (
          <Box style={{ textAlign: "center", padding: "40px 0" }}>
            <Text style={{ fontSize: "40px", marginBottom: "10px" }}>🛒</Text>
            <Text style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>Chưa có sản phẩm nào</Text>
            <Box onClick={() => navigate("/")} style={{ display: "inline-block", background: "#8B0000", color: "#FFF", padding: "8px 20px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>MUA SẮM NGAY</Box>
          </Box>
        ) : (
          cartItems.map((item) => (
            <Box key={item.id} style={{ background: "#FFF", padding: "10px", borderRadius: "10px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Box style={{ flex: 1, paddingRight: "10px" }}>
                <Text style={{ fontSize: "12px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>{item.name}</Text>
                <Text style={{ fontSize: "13px", fontWeight: "bold", color: "#E74C3C" }}>{item.displayPrice}</Text>
              </Box>
              <Box style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Box onClick={() => updateQuantity(item.id, -1)} style={{ width: "24px", height: "24px", background: "#eee", textAlign: "center", lineHeight: "24px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>-</Box>
                <Text style={{ fontSize: "13px", fontWeight: "bold" }}>{item.quantity}</Text>
                <Box onClick={() => updateQuantity(item.id, 1)} style={{ width: "24px", height: "24px", background: "#eee", textAlign: "center", lineHeight: "24px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>+</Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {cartItems.length > 0 && (
        <Box style={{ position: "fixed", bottom: "55px", left: 0, right: 0, background: "#FFF", padding: "12px 16px", borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 999 }}>
          <Box>
            <Text style={{ fontSize: "11px", color: "#666" }}>Tổng thanh toán:</Text>
            <Text style={{ fontSize: "15px", fontWeight: "bold", color: "#E74C3C" }}>{totalPrice.toLocaleString()} đ</Text>
          </Box>
          <Box onClick={handleCheckout} style={{ background: "#E74C3C", color: "#FFF", padding: "10px 24px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>ĐẶT HÀNG NGAY</Box>
        </Box>
      )}

      {/* BOTTOM NAVIGATION */}
      <Box style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#8B0000", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 1000 }}>
        <Box onClick={() => navigate("/")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏠</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Trang chủ</Text></Box>
        <Box onClick={() => navigate("/menu")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>📋</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Menu</Text></Box>
        <Box onClick={() => navigate("/cart")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🛒</Text><Text style={{ fontSize: "9px", color: "#FFD700", fontWeight: "bold", marginTop: "1px" }}>Giỏ hàng</Text></Box>
        <Box onClick={() => navigate("/store")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏪</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Cửa hàng</Text></Box>
        <Box onClick={() => navigate("/profile")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>👤</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Tài khoản</Text></Box>
      </Box>
    </Page>
  );
}