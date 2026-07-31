import React, { useState, useMemo } from "react";
import { Box, Text } from "zmp-ui";
import { PRODUCTS, CATEGORIES, BANNERS } from "../constants/data";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

export default function MenuTab({ onAddToCart, onGoToCart, cartCount = 0 }) {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [priceSort, setPriceSort] = useState("default");

  // Lọc theo danh mục
  const categoryFiltered = useMemo(() => {
    if (activeCategory === "Tất cả") return PRODUCTS;
    return PRODUCTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  // Sắp xếp theo giá
  const filteredProducts = useMemo(() => {
    const result = [...categoryFiltered];
    if (priceSort === "asc") result.sort((a, b) => a.price - b.price);
    else if (priceSort === "desc") result.sort((a, b) => b.price - a.price);
    return result;
  }, [categoryFiltered, priceSort]);

  return (
    <Box style={{ background: "#FFFDF9", minHeight: "100vh", paddingBottom: 20 }}>
      {/* Banner đầu trang */}
      {BANNERS?.[0] && (
        <Box
          style={{
            position: "relative",
            height: 150,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <img
            src={BANNERS[0].image}
            alt={BANNERS[0].title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <Box
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(47,24,16,0.8) 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 10, color: "#FFD54F", fontWeight: "bold" }}>
              {BANNERS[0].badge}
            </Text>
            <Text style={{ fontSize: 18, color: "#FFF", fontWeight: 900 }}>
              {BANNERS[0].title}
            </Text>
            <Text style={{ fontSize: 12, color: "#EEE" }}>{BANNERS[0].highlight}</Text>
          </Box>
        </Box>
      )}

      <Box style={{ padding: "0 16px" }}>
        {/* Danh mục sản phẩm */}
        <Box
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          {CATEGORIES.map((cat) => (
            <Box
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: "bold",
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `1px solid ${BAMBOO_BORDER}`,
                background: activeCategory === cat.name ? PRIMARY_COLOR : "#FFF",
                color: activeCategory === cat.name ? "#FFF" : "#444",
              }}
            >
              {cat.icon} {cat.name}
            </Box>
          ))}
        </Box>

        {/* Bộ lọc sắp xếp giá */}
        <Box style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "default", label: "Mặc định" },
            { key: "asc", label: "Giá tăng dần" },
            { key: "desc", label: "Giá giảm dần" },
          ].map((opt) => (
            <Box
              key={opt.key}
              onClick={() => setPriceSort(opt.key)}
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

        <Text style={{ fontSize: 14, fontWeight: 900, color: PRIMARY_COLOR, marginBottom: 10, display: "block" }}>
          🍶 THỰC ĐƠN ({filteredProducts.length})
        </Text>

        {/* Danh sách sản phẩm */}
        {filteredProducts.length === 0 ? (
          <Box style={{ textAlign: "center", marginTop: 40 }}>
            <Text style={{ color: "#666" }}>Chưa có sản phẩm nào trong danh mục này.</Text>
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
              }}
            >
              <Box
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  background: "#F4EBE1",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </Box>

              <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box>
                  <Box style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    {product.isBestSeller && (
                      <Text style={{ fontSize: 9, background: "#D97706", color: "#FFF", padding: "1px 6px", borderRadius: 4, fontWeight: "bold" }}>
                        {product.tag}
                      </Text>
                    )}
                  </Box>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#333" }}>
                    {product.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    ⭐ {product.rating} · Đã bán {product.sold}
                  </Text>
                </Box>

                <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#D9534F" }}>
                    {product.displayPrice}
                  </Text>
                  <Box
                    onClick={() => onAddToCart && onAddToCart(product)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      background: PRIMARY_COLOR,
                      color: "#FFF",
                      fontSize: 11,
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Thêm giỏ
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Nút xem giỏ hàng nổi (nếu có sản phẩm) */}
      {cartCount > 0 && (
        <Box
          onClick={() => onGoToCart && onGoToCart()}
          style={{
            position: "fixed",
            bottom: 76,
            left: 16,
            right: 16,
            background: PRIMARY_COLOR,
            color: "#FFF",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(139,69,19,0.3)",
            zIndex: 90,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 13 }}>
            🛒 Xem giỏ hàng ({cartCount})
          </Text>
          <Text style={{ color: "#FFF", fontSize: 13 }}>›</Text>
        </Box>
      )}
    </Box>
  );
}
