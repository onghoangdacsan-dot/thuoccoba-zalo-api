import React from "react";
import { Box, Text } from "zmp-ui";
import ProductCard from "./ProductCard";
import { CATEGORIES } from "../constants/data";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

export default function HomeTab({
  searchKeyword,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  currentBanner,
  bestSellers,
  filteredProducts,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  onSyncZalo,
}) {
  const banners = [
    {
      badge: "CHUẨN CHẤT LƯỢNG",
      title: "OCOP 4 SAO & HACCP",
      highlight:
        "Sản phẩm OCOP 4 sao, đạt chuẩn ATVSTP, HACCP và bảo hộ bởi Cục Sở hữu trí tuệ.",
      image: "./10.jpg",
    },
    {
      badge: "ĐẶC SẢN TRUYỀN THỐNG",
      title: "MẮM NGUYÊN CHẤT LÀNG CHÀI",
      highlight:
        "Cam kết không chất bảo quản – Hương vị mắm truyền thống đậm đà chuẩn vị.",
      image: "./11.jpg",
    },
    {
      badge: "GIAO HÀNG HỎA TỐC",
      title: "VẬN CHUYỂN SIÊU TỐC",
      highlight: "Nhận hàng nhanh chóng tận tay – Đảm bảo chất lượng nguyên vẹn.",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
    },
  ];

  const activeBanner = banners[currentBanner % banners.length];

  return (
    <Box
      style={{
        background: "#FFFDF9",
        minHeight: "100vh",
        paddingBottom: 30,
        boxSizing: "border-box",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <Box
        style={{
          background: "#F4EBE1",
          padding: "14px 16px",
          borderBottom: `2px solid ${BAMBOO_BORDER}`,
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            width: "100%",
          }}
        >
          <Box style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <Box
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${PRIMARY_COLOR}`,
                flexShrink: 0,
                backgroundColor: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(139,69,19,0.15)",
                position: "relative",
              }}
            >
              <img
                src="/logo.png"
                alt="Logo Thuộc Cô Ba"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150";
                }}
              />
            </Box>

            <Box style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: PRIMARY_COLOR,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Đặc sản Thuộc Cô Ba
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: PRIMARY_COLOR,
                  fontWeight: "bold",
                  marginTop: 2,
                }}
              >
                🌿 OCOP 4 SAO Bình Định
              </Text>
            </Box>
          </Box>

          <Box
            onClick={onSyncZalo}
            style={{
              background: "#0068FF",
              color: "#FFF",
              fontSize: 11,
              padding: "7px 11px",
              borderRadius: 8,
              fontWeight: "bold",
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 104, 255, 0.3)",
            }}
          >
            Đồng bộ Zalo
          </Box>
        </Box>

        <Box
          style={{
            background: "#FFF",
            borderRadius: 24,
            padding: "9px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: `1.5px solid ${BAMBOO_BORDER}`,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <Text style={{ fontSize: 15 }}>🔍</Text>
          <input
            type="text"
            placeholder="Tìm mắm mực, mắm ruốc..."
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: 13,
              background: "transparent",
            }}
          />
        </Box>
      </Box>

      {/* Banner */}
      <Box
        style={{
          margin: "14px 16px",
          height: 150,
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          background: "#2F1810",
          boxSizing: "border-box",
          width: "calc(100% - 32px)",
        }}
      >
        <img
          src={activeBanner.image}
          alt="Banner"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.88,
          }}
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80";
          }}
        />
        <Box
          style={{
            position: "absolute",
            inset: 0,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "#FFF",
            width: "72%",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)",
            boxSizing: "border-box",
          }}
        >
          <Box
            style={{
              background: PRIMARY_COLOR,
              padding: "2px 8px",
              borderRadius: 4,
              width: "fit-content",
              marginBottom: 5,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>
              {activeBanner.badge}
            </Text>
          </Box>
          <Text
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#FFD54F",
              marginBottom: 2,
            }}
          >
            {activeBanner.title}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {activeBanner.highlight}
          </Text>
        </Box>
      </Box>

      {/* Danh mục */}
      <Box
        style={{
          padding: "10px 0",
          margin: "0 16px 14px",
          background: "#F4EBE1",
          borderRadius: 14,
          border: `1px solid ${BAMBOO_BORDER}`,
          boxSizing: "border-box",
          width: "calc(100% - 32px)",
        }}
      >
        <Box
          style={{
            display: "flex",
            overflowX: "auto",
            padding: "0 10px",
            gap: 10,
          }}
        >
          {CATEGORIES.map((cat) => (
            <Box
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              style={{ textAlign: "center", minWidth: 72, cursor: "pointer" }}
            >
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: selectedCategory === cat.name ? "#FCE7D5" : "#FFF",
                  margin: "0 auto 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  border:
                    selectedCategory === cat.name
                      ? `2px solid ${PRIMARY_COLOR}`
                      : `1px solid ${BAMBOO_BORDER}`,
                }}
              >
                {cat.icon}
              </Box>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: selectedCategory === cat.name ? "bold" : 500,
                  color: selectedCategory === cat.name ? PRIMARY_COLOR : "#444",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.name}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Sản phẩm bán chạy */}
      <Box style={{ padding: "0 16px", marginBottom: 16, boxSizing: "border-box", width: "100%" }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: PRIMARY_COLOR,
            marginBottom: 12,
          }}
        >
          🔥 SẢN PHẨM BÁN CHẠY
        </Text>
        <Box
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 6,
          }}
        >
          {bestSellers.map((product) => (
            <Box
              key={product.id}
              onClick={() => onSelectProduct(product)}
              style={{
                minWidth: 145,
                maxWidth: 145,
                background: "#FFF",
                borderRadius: 12,
                padding: 10,
                border: `1px solid ${BAMBOO_BORDER}`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 2px 6px rgba(139,69,19,0.06)",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            >
              <img
                src={product.image}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: "#222",
                  height: 32,
                  overflow: "hidden",
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {product.name}
              </Text>

              <Box style={{ height: 10 }} />

              <Text style={{ fontSize: 13, fontWeight: 900, color: "#D97706" }}>
                {product.displayPrice || `${product.price?.toLocaleString()} đ`}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Danh sách sản phẩm */}
      <Box style={{ padding: "0 16px 20px", boxSizing: "border-box", width: "100%" }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: PRIMARY_COLOR,
            marginBottom: 12,
          }}
        >
          {searchKeyword ? `🔍 "${searchKeyword}"` : `📦 ${selectedCategory}`}
        </Text>
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAddToCart}
              onBuy={onBuyNow}
              onSelect={onSelectProduct}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}