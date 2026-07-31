import React from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513";

export default function ProductDetailModal({
  product,
  quantity,
  onChangeQuantity,
  onClose,
  onAddToCart,
  onBuyNow
}) {
  if (!product) return null;

  return (
    <Box style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 1000, display: "flex", alignItems: "flex-end"
    }}>
      <Box style={{
        background: "#FFF", width: "100%", maxHeight: "88vh",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, overflowY: "auto", borderTop: `4px solid ${PRIMARY_COLOR}`
      }}>
        <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: 900, color: PRIMARY_COLOR }}>CHI TIẾT SẢN PHẨM</Text>
          <Text onClick={onClose} style={{ fontSize: 20, fontWeight: "bold" }}>✕</Text>
        </Box>

        <Box style={{ width: "100%", height: 200, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
          <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>

        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 6, lineHeight: 1.4 }}>
          {product.name}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: 900, color: PRIMARY_COLOR, marginBottom: 14 }}>
          {product.displayPrice}
        </Text>

        <Box style={{ background: "#FDF8F0", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 4 }}>📖 Mô tả</Text>
          <Text style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{product.desc}</Text>
        </Box>

        <Box style={{ background: "#FEF3C7", padding: 12, borderRadius: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: "#B45309", marginBottom: 4 }}>💡 Cách dùng</Text>
          <Text style={{ fontSize: 12, color: "#78350F", lineHeight: 1.5 }}>{product.usage}</Text>
        </Box>

        <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold" }}>Số lượng</Text>
          <Box style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Box
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              style={{
                width: 34, height: 34, background: "#F4EBE1", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", fontSize: 18
              }}
            >−</Box>
            <Text style={{ fontSize: 15, fontWeight: "bold", minWidth: 24, textAlign: "center" }}>
              {quantity}
            </Text>
            <Box
              onClick={() => onChangeQuantity(quantity + 1)}
              style={{
                width: 34, height: 34, background: PRIMARY_COLOR, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFF", fontWeight: "bold", fontSize: 18
              }}
            >+</Box>
          </Box>
        </Box>

        <Box style={{ display: "flex", gap: 10 }}>
          <Box
            onClick={() => { onAddToCart(product, quantity); onClose(); }}
            style={{
              flex: 1, border: `1.5px solid ${PRIMARY_COLOR}`, color: PRIMARY_COLOR,
              textAlign: "center", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: "bold"
            }}
          >
            THÊM VÀO GIỎ
          </Box>
          <Box
            onClick={() => onBuyNow(product, quantity)}
            style={{
              flex: 1, background: PRIMARY_COLOR, color: "#FFF",
              textAlign: "center", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: "bold"
            }}
          >
            MUA NGAY
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
