import React from "react";
import { useNavigate, useLocation, BottomNavigation } from "zmp-ui";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname || "/";

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      backgroundColor: "#f8f9fa",
      overflow: "hidden" 
    }}>
      {/* Vùng nội dung cuộn ở trên */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "70px" }}>
        {children}
      </div>

      {/* Thanh menu cố định ở đáy */}
      <div style={{ 
        flexShrink: 0, 
        position: "fixed", 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 9999,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        backgroundColor: "#fff"
      }}>
        <BottomNavigation
          activeKey={activeTab}
          onChange={(key) => navigate(key)}
          fixed
        >
          <BottomNavigation.Item 
            key="/" 
            label="Trang chủ" 
            icon={<i className="zi-home" style={{ fontSize: "20px" }} />} 
          />
          <BottomNavigation.Item 
            key="/menu" 
            label="Menu" 
            icon={<i className="zi-list-square" style={{ fontSize: "20px" }} />} 
          />
          <BottomNavigation.Item 
            key="/cart" 
            label="Giỏ hàng" 
            icon={<i className="zi-cart" style={{ fontSize: "20px" }} />} 
          />
          <BottomNavigation.Item 
            key="/store" 
            label="Cửa hàng" 
            icon={<i className="zi-location" style={{ fontSize: "20px" }} />} 
          />
          <BottomNavigation.Item 
            key="/profile" 
            label="Tài khoản" 
            icon={<i className="zi-user" style={{ fontSize: "20px" }} />} 
          />
        </BottomNavigation>
      </div>
    </div>
  );
}