import React from "react";
import { Box, Text } from "zmp-ui";

export default function OrdersTab({ orders = [], onGoToMenu }) {
  return (
    <Box style={{ padding: 16 }}>
      <Text.Title size="large" style={{ marginBottom: 16, color: "#8B4513" }}>
        Đơn hàng của bạn ({orders.length})
      </Text.Title>

      {orders.length === 0 ? (
        <Box style={{ textAlign: "center", marginTop: 40 }}>
          <Text style={{ color: "#666", marginBottom: 16 }}>Bạn chưa có đơn hàng nào.</Text>
          <Box
            onClick={onGoToMenu}
            style={{
              display: "inline-block",
              background: "#8B4513",
              color: "#FFF",
              padding: "10px 20px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Mua sắm ngay
          </Box>
        </Box>
      ) : (
        orders.map((order) => (
          <Box
            key={order.id}
            style={{
              background: "#FFF",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <Box style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontWeight: "bold", color: "#333" }}>Mã: {order.id}</Text>
              <Text style={{ color: "#888", fontSize: 12 }}>{order.date}</Text>
            </Box>
            <Text style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
              Trạng thái: <span style={{ fontWeight: "bold", color: "#8B4513" }}>{order.status}</span>
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#D9534F" }}>
              Tổng tiền: {Number(order.total || 0).toLocaleString("vi-VN")}đ
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}