import React from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

export default function MenuTab({
  priceSort = "default",
  onChangeSort,
  filteredProducts = [],
  onAddToCart,
  onBuyNow,
  onSelectProduct,
}) {
  return (
    <Box style={{ padding: 16 }}>
      <Text.Title size="large" style={{ marginBottom: 12, color: PRIMARY_COLOR }}>
        Thực đơn ({filteredProducts.length})
      </Text.Title>

      {/* Bộ lọc sắp xếp giá */}
      <Box style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "default", label: "Mặc định" },
          { key: "asc", label: "Giá tăng dần" },
          { key: "desc", label: "Giá giảm dần" },
        ].map((opt) => (
          <Box
            key={opt.key}
            onClick={() => onChangeSort && onChangeSort(opt.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: "bold",
              cursor: "pointer",
              border: `1px solid ${BAMBOO_BORDER}`,
              background: priceSort === opt.key ? PRIMARY_COLOR : "#FFF",
              color: priceSort === opt.key ? "#FFF" : "#444",
            }}
          >
            {opt.label}
          </Box>
        ))}
      </Box>

      {/* Danh sách sản phẩm */}
      {filteredProducts.length === 0 ? (
        <Box style={{ textAlign: "center", marginTop: 40 }}>
          <Text style={{ color: "#666" }}>Chưa có sản phẩm nào.</Text>
        </Box>
      ) : (
        filteredProducts.map((product) => (
          <Box
            key={product.id}
            style={{
              background: "#FFF",
              border: `1px solid ${BAMBOO_BORDER}`,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              gap: 12,
              cursor: "pointer",
            }}
            onClick={() => onSelectProduct && onSelectProduct(product)}
          >
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#F4EBE1",
                flexShrink: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Text style={{ fontSize: 24 }}>🥫</Text>
              )}
            </Box>

            <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#333" }}>
                {product.name}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#D9534F" }}>
                {Number(product.price || 0).toLocaleString("vi-VN")}đ
              </Text>

              <Box style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart && onAddToCart(product);
                  }}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    borderRadius: 6,
                    border: `1px solid ${PRIMARY_COLOR}`,
                    color: PRIMARY_COLOR,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  Thêm vào giỏ
                </Box>
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuyNow && onBuyNow(product);
                  }}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    borderRadius: 6,
                    background: PRIMARY_COLOR,
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  Mua ngay
                </Box>
              </Box>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
