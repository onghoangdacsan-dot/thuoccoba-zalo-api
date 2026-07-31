import React from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

const ProductCard = React.memo(({ product, onAdd, onBuy, onSelect }) => (
  <Box
    onClick={() => onSelect(product)}
    style={{
      background: "#FFF",
      borderRadius: 14,
      overflow: "hidden",
      border: `1px solid ${BAMBOO_BORDER}`,
      display: "flex",
      flexDirection: "column"
    }}
  >
    <Box style={{ position: "relative" }}>
      {product.tag && (
        <Box style={{
          position: "absolute", top: 8, left: 8,
          background: PRIMARY_COLOR, color: "#FFF",
          fontSize: 10, fontWeight: "bold",
          padding: "3px 8px", borderRadius: 6, zIndex: 2
        }}>
          {product.tag}
        </Box>
      )}
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
      />
    </Box>

    <Box style={{ padding: "10px 12px 12px" }}>
      <Text style={{
        fontSize: 12.5, fontWeight: 600, color: "#222",
        lineHeight: 1.4, marginBottom: 6,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        minHeight: 36
      }}>
        {product.name}
      </Text>

      <Text style={{ fontSize: 14, fontWeight: 900, color: PRIMARY_COLOR, marginBottom: 2 }}>
        {product.displayPrice}
      </Text>

      <Text style={{ fontSize: 10.5, color: "#888" }}>
        ⭐ {product.rating} · Đã bán {product.sold}
      </Text>

      <Box style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Box
          onClick={(e) => { e.stopPropagation(); onAdd(product, 1); }}
          style={{
            flex: 1, border: `1.5px solid ${PRIMARY_COLOR}`, color: PRIMARY_COLOR,
            textAlign: "center", padding: "10px 0", borderRadius: 10,
            fontSize: 12, fontWeight: 700
          }}
        >
          + Giỏ
        </Box>
        <Box
          onClick={(e) => { e.stopPropagation(); onBuy(product, 1); }}
          style={{
            flex: 1, background: PRIMARY_COLOR, color: "#FFF",
            textAlign: "center", padding: "11px 0", borderRadius: 10,
            fontSize: 13, fontWeight: 700
          }}
        >
          Mua
        </Box>
      </Box>
    </Box>
  </Box>
));

export default ProductCard;
