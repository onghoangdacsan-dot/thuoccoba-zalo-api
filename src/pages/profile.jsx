import React from "react";
import { Page, Box, Text, useNavigate } from "zmp-ui";

export default function ProfilePage() {
  const navigate = useNavigate();

  return (
    <Page style={{ backgroundColor: "#F8F9FA", paddingBottom: "70px" }}>
      <Box style={{ background: "#8B0000", padding: "20px 16px", textAlign: "center" }}>
        <Box style={{ width: "60px", height: "60px", background: "#FFD700", borderRadius: "50%", margin: "0 auto 8px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>👤</Box>
        <Text style={{ fontSize: "16px", fontWeight: "900", color: "#FFFFFF" }}>Khách Hàng Thân Thiết</Text>
        <Text style={{ fontSize: "11px", color: "#FFD700", marginTop: "2px" }}>Thành viên Thuộc Cô Ba</Text>
      </Box>

      <Box style={{ padding: "12px" }}>
        <Box style={{ background: "#FFF", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <Box style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: "13px", color: "#333" }}>📦 Đơn hàng của tôi</Text>
            <Text style={{ fontSize: "13px", color: "#999" }}>➔</Text>
          </Box>
          <Box style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: "13px", color: "#333" }}>📍 Địa chỉ nhận hàng</Text>
            <Text style={{ fontSize: "13px", color: "#999" }}>➔</Text>
          </Box>
          <Box style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between" }}>
            <Text style={{ fontSize: "13px", color: "#333" }}>⚙️ Cài đặt tài khoản</Text>
            <Text style={{ fontSize: "13px", color: "#999" }}>➔</Text>
          </Box>
        </Box>
      </Box>

      {/* BOTTOM NAVIGATION */}
      <Box style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#8B0000", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 1000 }}>
        <Box onClick={() => navigate("/")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏠</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Trang chủ</Text></Box>
        <Box onClick={() => navigate("/menu")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>📋</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Menu</Text></Box>
        <Box onClick={() => navigate("/cart")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🛒</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Giỏ hàng</Text></Box>
        <Box onClick={() => navigate("/store")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏪</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Cửa hàng</Text></Box>
        <Box onClick={() => navigate("/profile")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>👤</Text><Text style={{ fontSize: "9px", color: "#FFD700", fontWeight: "bold", marginTop: "1px" }}>Tài khoản</Text></Box>
      </Box>
    </Page>
  );
}