import React, { useState } from "react";
import { Page, Box } from "zmp-ui";
import { createOrder } from "zmp-sdk/apis";
import HomeTab from "../components/HomeTab";
import ProfileTab from "../components/ProfileTab";
import BottomNav from "../components/BottomNav";
import { PRODUCTS, BEST_SELLERS } from "../constants/data";

export default function HomePage() {
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "Khách hàng Thuộc Cô Ba",
    phone: "0905123456",
    address: "Bình Định"
  });

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("home");

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [currentBanner, setCurrentBanner] = useState(0);

  const handleUpdateShippingInfo = (newInfo) => {
    setShippingInfo(prev => ({ ...prev, ...newInfo }));
  };

  // TÍCH HỢP CHECKOUT SDK: Gọi hàm thanh toán chuẩn của Zalo trước khi lưu đơn hàng
  const handleBuyNowOrCheckout = (product, quantity = 1) => {
    const qty = typeof quantity === "number" ? quantity : 1;
    const unitPrice = product.price || 0;
    const totalAmount = unitPrice * qty;

    const cartItems = [{
      id: String(product.id || "1"),
      name: product.name,
      price: unitPrice,
      quantity: qty
    }];

    try {
      createOrder({
        desc: `Thanh toán đơn hàng Đặc sản Thuộc Cô Ba`,
        item: cartItems.map(item => ({
          id: item.id,
          amount: item.price,
          quantity: item.quantity,
          name: item.name
        })),
        amount: totalAmount,
        success: (data) => {
          console.log("Checkout SDK thành công:", data);

          // Tạo và lưu đơn hàng thực tế sau khi Checkout SDK hoàn tất
          const newOrder = {
            id: Date.now().toString().slice(-6),
            createdAt: Date.now(),
            status: "pending",
            items: cartItems,
            finalTotal: totalAmount,
            shippingInfo: shippingInfo
          };

          setOrders(prevOrders => [newOrder, ...prevOrders]);
          alert(`Giao dịch thanh toán thành công! Đơn hàng #${newOrder.id} đã được tạo.`);
          
          // Chuyển sang Tab Cá Nhân để theo dõi đơn hàng
          setActiveTab("profile");
        },
        fail: (error) => {
          console.log("Checkout SDK thất bại hoặc bị hủy:", error);
          alert("Giao dịch thanh toán chưa hoàn tất hoặc đã bị hủy.");
        }
      });
    } catch (err) {
      console.error("Lỗi tích hợp Checkout SDK:", err);
    }
  };

  const handleCancelOrder = (orderId) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: "cancelled" } : order
      )
    );
    alert(`Đã hủy thành công đơn hàng #${orderId}`);
  };

  const filteredProducts = PRODUCTS.filter(p => {
    const matchesCategory = selectedCategory === "Tất cả" || p.category === selectedCategory;
    const matchesKeyword = p.name.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesCategory && matchesKeyword;
  });

  return (
    <Page className="relative flex flex-col h-screen">
      <Box style={{ flex: 1, paddingBottom: 70, overflowY: "auto" }}>
        {activeTab === "home" && (
          <HomeTab
            searchKeyword={searchKeyword}
            onSearchChange={setSearchKeyword}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            currentBanner={currentBanner}
            bestSellers={BEST_SELLERS}
            filteredProducts={filteredProducts}
            onAddToCart={handleBuyNowOrCheckout}
            onBuyNow={handleBuyNowOrCheckout}
            onSelectProduct={(product) => console.log("Chọn sản phẩm:", product)}
            onUpdateShippingInfo={handleUpdateShippingInfo}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            shippingInfo={shippingInfo}
            onUpdateShippingInfo={handleUpdateShippingInfo}
            orders={orders}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </Box>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </Page>
  );
}