import React from "react";
import { Page, Box, Text, useNavigate } from "zmp-ui";

export default function MenuPage() {
  const navigate = useNavigate();
  const categories = [
    { id: 1, name: "Mắm Mực Đặc Biệt", count: "5 sản phẩm" },
    { id: 2, name: "Mắm Ruốc Muối Xổi", count: "8 sản phẩm" },
    { id: 3, name: "Mắm Nêm Cá Cơm", count: "4 sản phẩm" },
    { id: 4, name: "Mắm Cái Nguyên Con", count: "6 sản phẩm" },
  ];

  return (
    <Page style={{ backgroundColor: "#F8F9FA", paddingBottom: "70px" }}>
      <Box style={{ background: "#8B0000", padding: "14px 16px", textAlign: "center" }}>
        <Text style={{ fontSize: "16px", fontWeight: "900", color: "#FFFFFF" }}>DANH MỤC SẢN PHẨM</Text>
      </Box>

      <Box style={{ padding: "12px" }}>
        {categories.map((cat) => (
          <Box key={cat.id} style={{ background: "#FFF", padding: "16px", borderRadius: "10px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <Box>
              <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "4px" }}>{cat.name}</Text>
              <Text style={{ fontSize: "11px", color: "#666" }}>{cat.count}</Text>
            </Box>
            <Text style={{ fontSize: "14px", color: "#8B0000", fontWeight: "bold" }}>➔</Text>
          </Box>
        ))}
      </Box>

      {/* BOTTOM NAVIGATION */}
      <Box style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#8B0000", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 1000 }}>
        <Box onClick={() => navigate("/")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏠</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Trang chủ</Text></Box>
        <Box onClick={() => navigate("/menu")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>📋</Text><Text style={{ fontSize: "9px", color: "#FFD700", fontWeight: "bold", marginTop: "1px" }}>Menu</Text></Box>
        <Box onClick={() => navigate("/cart")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🛒</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Giỏ hàng</Text></Box>
        <Box onClick={() => navigate("/store")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>🏪</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Cửa hàng</Text></Box>
        <Box onClick={() => navigate("/profile")} style={{ textAlign: "center", cursor: "pointer" }}><Text style={{ fontSize: "15px" }}>👤</Text><Text style={{ fontSize: "9px", color: "#FFF", marginTop: "1px" }}>Tài khoản</Text></Box>
      </Box>
    </Page>
  );
}