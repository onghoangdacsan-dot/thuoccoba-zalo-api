import React from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

const TABS = [
  { tab: "home", icon: "🏠", label: "Trang chủ" },
  { tab: "menu", icon: "📦", label: "Danh mục" },
  { tab: "cart", icon: "🛒", label: "Giỏ" },
  { tab: "promo", icon: "🎁", label: "Ưu đãi" },
  { tab: "profile", icon: "👤", label: "Cá nhân" }
];

export default function BottomNav({ currentTab, onChangeTab, cartCount }) {
  return (
    <Box style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFF",
      borderTop: `1px solid ${BAMBOO_BORDER}`, display: "flex",
      justifyContent: "space-around", padding: "8px 0 14px", zIndex: 100,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.06)"
    }}>
      {TABS.map(item => (
        <Box
          key={item.tab}
          onClick={() => onChangeTab(item.tab)}
          style={{
            flex: 1, textAlign: "center", padding: "4px 0",
            color: currentTab === item.tab ? PRIMARY_COLOR : "#777"
          }}
        >
          <Text style={{ fontSize: 22, lineHeight: 1.2 }}>{item.icon}</Text>
          <Text style={{
            fontSize: 11,
            fontWeight: currentTab === item.tab ? 800 : 500,
            marginTop: 2
          }}>
            {item.tab === "cart" ? `${item.label} (${cartCount})` : item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
