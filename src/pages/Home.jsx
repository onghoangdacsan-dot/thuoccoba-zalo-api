import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Page, useSnackbar } from "zmp-ui";
import { getUserInfo, Payment, events, EventName, followOA } from "zmp-sdk/apis";

import { PRODUCTS } from "../constants/data";
import { loadState, saveState } from "../utils/storage";
import { useCart } from "../hooks/useCart";

import HomeTab from "../components/HomeTab";
import MenuTab from "../components/MenuTab";
import CartTab from "../components/CartTab";
import PromoTab from "../components/PromoTab";
import ProfileTab from "../components/ProfileTab";
import BottomNav from "../components/BottomNav";
import ProductDetailModal from "../components/ProductDetailModal";
import SuccessModal from "../components/SuccessModal";
import ShippingNoticeModal from "../components/ShippingNoticeModal";

const LIGHT_BG = "#FDF8F0";
const BANNER_INTERVAL_MS = 3800;
const API = "https://thuoccoba-zalo-api-production.up.railway.app";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState("home");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [currentBanner, setCurrentBanner] = useState(0);
  const [priceSort, setPriceSort] = useState("default");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [flyingItem, setFlyingItem] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [serverOrders, setServerOrders] = useState([]);

  const [isFollowingOA, setIsFollowingOA] = useState(() =>
    loadState("followingOA", false)
  );
  const [userInfo, setUserInfo] = useState(() =>
    loadState("userInfo", { id: "", name: "", phone: "", avatar: "/logo.png.png" })
  );
  const [shippingInfo, setShippingInfo] = useState(() =>
    loadState("shippingInfo", { fullName: "", phone: "", address: "" })
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);

  const [showShippingNotice, setShowShippingNotice] = useState(() => {
    try {
      return sessionStorage.getItem("shipping_notice_shown") !== "1";
    } catch {
      return true;
    }
  });

  const { openSnackbar } = useSnackbar();
  const processedTransRef = useRef(new Set());

  const userKey =
    userInfo?.id ||
    shippingInfo?.phone ||
    userInfo?.phone ||
    null;

  const {
    cartItems,
    orderHistory,
    orderCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    placeOrder,
  } = useCart(userKey);

  const fetchOrdersFromServer = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/orders`);
      if (!res.ok) return;
      const list = await res.json();

      const myPhone = (shippingInfo?.phone || userInfo?.phone || "").trim();

      const mapped = (list || [])
        .map((o) => ({
          id: o.id,
          date: o.createdAt
            ? new Date(o.createdAt).toLocaleString("vi-VN")
            : "",
          items: o.items || [],
          shippingInfo: o.shippingInfo || {},
          paymentMethod: o.paymentMethod || "COD",
          total: o.total || 0,
          status: o.status || "pending",
          createdAt: o.createdAt,
          userId: o.userId || null,
        }))
        .filter((o) => {
          if (!myPhone) return false;
          const orderPhone = (o.shippingInfo?.phone || "").trim();
          return orderPhone && orderPhone === myPhone;
        });

      setServerOrders(mapped);
    } catch (e) {
      console.warn("Không tải đơn từ server:", e);
    }
  }, [shippingInfo?.phone, userInfo?.phone]);

  useEffect(() => {
    if (currentTab === "profile") {
      fetchOrdersFromServer();
    }
  }, [currentTab, fetchOrdersFromServer]);

  useEffect(() => {
    saveState("followingOA", isFollowingOA);
  }, [isFollowingOA]);

  useEffect(() => {
    saveState("userInfo", userInfo);
  }, [userInfo]);

  useEffect(() => {
    saveState("shippingInfo", shippingInfo);
  }, [shippingInfo]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % 3);
    }, BANNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const matchesCategory =
        selectedCategory === "Tất cả" || p.category === selectedCategory;
      const matchesSearch =
        !keyword || p.name.toLowerCase().includes(keyword);
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (priceSort === "asc") return a.price - b.price;
      if (priceSort === "desc") return b.price - a.price;
      return 0;
    });
  }, [selectedCategory, searchKeyword, priceSort]);

  const bestSellers = useMemo(
    () => PRODUCTS.filter((p) => p.isBestSeller),
    []
  );

  const subTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const calculatedShipping =
    cartItems.length === 0 ? 0 : subTotal >= 500000 ? 0 : 20000;

  // Ưu đãi đơn đầu COBAWELCOME: −15.000đ · cần quan tâm OA · chỉ 1 lần
  const welcomeUsed =
    loadState("promo_welcome_used", false) || orderCount >= 1;

  let autoDiscount = 0;
  if (isFollowingOA && !welcomeUsed && orderCount < 1 && subTotal > 0) {
    autoDiscount += 15000;
  }

  const finalTotal = Math.max(0, subTotal + calculatedShipping - autoDiscount);

  const handleCloseShippingNotice = useCallback(() => {
    setShowShippingNotice(false);
    try {
      sessionStorage.setItem("shipping_notice_shown", "1");
    } catch (e) {}
  }, []);

  const handleAddToCart = useCallback(
    (product, quantity = 1) => {
      setFlyingItem(product);
      setTimeout(() => setFlyingItem(null), 700);
      addToCart(product, quantity);
    },
    [addToCart]
  );

  const handleBuyNow = useCallback(
    (product, quantity = 1) => {
      handleAddToCart(product, quantity);
      setSelectedProduct(null);
      setCurrentTab("cart");
    },
    [handleAddToCart]
  );

  const handleSyncZalo = useCallback(() => {
    return new Promise((resolve) => {
      try {
        getUserInfo({
          success: (data) => {
            const zaloUser = data?.userInfo;
            if (zaloUser) {
              const zaloName = zaloUser.name || "";
              const zaloPhone = zaloUser.phoneNumber || zaloUser.phone || "";
              const zaloAvatar = zaloUser.avatar || "";
              const zaloId = zaloUser.id || "";

              setUserInfo((prev) => ({
                ...prev,
                id: zaloId || prev.id,
                name: zaloName || prev.name,
                avatar: zaloAvatar || prev.avatar,
                phone: zaloPhone || prev.phone,
              }));

              setShippingInfo((prev) => ({
                ...prev,
                fullName: zaloName || prev.fullName || "",
                phone: zaloPhone || prev.phone || "",
              }));

              alert(
                `Đã lấy thông tin từ Zalo: ${zaloName}. Vui lòng kiểm tra lại địa chỉ nhận hàng.`
              );
              resolve(true);
            } else {
              alert("Không lấy được thông tin từ Zalo. Vui lòng nhập thủ công.");
              resolve(false);
            }
          },
          fail: () => {
            alert("Không thể lấy thông tin từ Zalo. Vui lòng nhập thủ công.");
            resolve(false);
          },
        });
      } catch (error) {
        alert("Không thể lấy thông tin từ Zalo trên thiết bị này.");
        resolve(false);
      }
    });
  }, []);

  const handleFollowOA = useCallback((zaloOAId) => {
    try {
      followOA({
        id: zaloOAId,
        success: () => {
          setIsFollowingOA(true);
          openSnackbar({
            type: "success",
            text: "Cảm ơn bạn đã quan tâm Zalo OA Mắm Thuộc Cô Ba!",
          });
        },
        fail: () => {
          openSnackbar({
            type: "error",
            text: "Không thể cập nhật trạng thái quan tâm. Thử lại sau.",
          });
        },
      });
    } catch (err) {
      openSnackbar({
        type: "error",
        text: "Tính năng này chỉ hoạt động trong ứng dụng Zalo.",
      });
    }
  }, [openSnackbar]);

  const handlePlaceOrder = useCallback(
    (paymentResult) => {
      const itemsSnapshot = [...cartItems];

      const order = placeOrder({
        items: itemsSnapshot,
        shippingInfo,
        paymentMethod: "COD",
        finalTotal,
        zaloOrderId: paymentResult?.orderId || paymentResult?.transId || "",
        resultCode: paymentResult?.resultCode,
      });

      // Đánh dấu đã dùng ưu đãi đơn đầu — không áp dụng lần 2
      if (isFollowingOA && orderCount < 1) {
        saveState("promo_welcome_used", true);
      }

      clearCart();
      setShowSuccessModal(true);
      setTimeout(() => fetchOrdersFromServer(), 800);

      return order;
    },
    [
      placeOrder,
      clearCart,
      cartItems,
      shippingInfo,
      finalTotal,
      fetchOrdersFromServer,
      isFollowingOA,
      orderCount,
    ]
  );

  const handlePaymentDone = useCallback(
    async (data) => {
      try {
        const result = await Payment.checkTransaction({ data });
        const transKey =
          result?.transId || result?.orderId || JSON.stringify(data);

        if (processedTransRef.current.has(transKey)) {
          console.warn("PaymentDone trùng, bỏ qua:", transKey);
          return;
        }
        processedTransRef.current.add(transKey);

        switch (result.resultCode) {
          case 1:
          case 0:
            openSnackbar({ type: "success", text: "Đặt hàng thành công!" });
            handlePlaceOrder(result);
            break;
          case -1:
            openSnackbar({
              type: "error",
              text: result.msg || "Thanh toán thất bại",
            });
            break;
          case -2:
            openSnackbar({ type: "info", text: "Bạn đã hủy thanh toán" });
            break;
          default:
            openSnackbar({
              type: "error",
              text: result.msg || "Có lỗi xảy ra",
            });
        }
      } catch (err) {
        console.error("checkTransaction error:", err);
        openSnackbar({
          type: "error",
          text: "Không thể kiểm tra kết quả thanh toán",
        });
      }
    },
    [handlePlaceOrder, openSnackbar]
  );

  useEffect(() => {
    events.on(EventName.PaymentDone, handlePaymentDone);
    return () => {
      events.off(EventName.PaymentDone, handlePaymentDone);
    };
  }, [handlePaymentDone]);

  const createOrderOnServer = useCallback(
    async (payload) => {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Tạo đơn hàng thất bại");
      const data = await res.json();
      fetchOrdersFromServer();
      return data;
    },
    [fetchOrdersFromServer]
  );

  const createMacOnServer = useCallback(async (orderData) => {
    const res = await fetch(`${API}/api/create-mac`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error("Tạo MAC thất bại");
    const data = await res.json();
    return data.mac;
  }, []);

  const handleSelectOrderStatus = useCallback((statusKey) => {
    setOrderStatusFilter(statusKey);
  }, []);

  const displayOrders = serverOrders.length > 0 ? serverOrders : orderHistory;

  return (
    <Page
      style={{
        backgroundColor: LIGHT_BG,
        paddingBottom: 90,
        minHeight: "100vh",
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        @keyframes flyToCart {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(0.2) translateY(-450px) translateX(-60px); opacity: 0; }
        }
      `}</style>

      {flyingItem && (
        <img
          src={flyingItem.image}
          alt=""
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            zIndex: 9999,
            width: 48,
            height: 48,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #8B4513",
            animation: "flyToCart 0.7s forwards",
          }}
        />
      )}

      <ShippingNoticeModal
        visible={showShippingNotice}
        onClose={handleCloseShippingNotice}
        isFollowingOA={isFollowingOA}
        onFollowOA={handleFollowOA}
      />

      <SuccessModal
        visible={showSuccessModal}
        paymentMethod={paymentMethod}
        onContinueShopping={() => setShowSuccessModal(false)}
        onViewOrders={() => {
          setShowSuccessModal(false);
          setCurrentTab("profile");
        }}
      />

      <ProductDetailModal
        product={selectedProduct}
        quantity={detailQuantity}
        onChangeQuantity={setDetailQuantity}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {currentTab === "home" && (
        <HomeTab
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          currentBanner={currentBanner}
          bestSellers={bestSellers}
          filteredProducts={filteredProducts}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            setDetailQuantity(1);
          }}
          onSyncZalo={handleSyncZalo}
        />
      )}

      {currentTab === "menu" && (
        <MenuTab
          priceSort={priceSort}
          onChangeSort={setPriceSort}
          filteredProducts={filteredProducts}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            setDetailQuantity(1);
          }}
        />
      )}

      {currentTab === "cart" && (
        <CartTab
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          shippingInfo={shippingInfo}
          onChangeShippingInfo={setShippingInfo}
          onSyncZalo={handleSyncZalo}
          onPlaceOrder={handlePlaceOrder}
          onGoToMenu={() => setCurrentTab("menu")}
          createOrderOnServer={createOrderOnServer}
          createMacOnServer={createMacOnServer}
          autoDiscount={autoDiscount}
        />
      )}

      {currentTab === "promo" && (
        <PromoTab
          isFollowingOA={isFollowingOA}
          onFollowOA={handleFollowOA}
          orderCount={orderCount}
        />
      )}

      {currentTab === "profile" && (
        <ProfileTab
          userInfo={{
            id: userInfo?.id || "",
            fullName:
              shippingInfo?.fullName ||
              userInfo?.name ||
              userInfo?.fullName ||
              "Khách hàng Thuộc Cô Ba",
            name:
              shippingInfo?.fullName ||
              userInfo?.name ||
              userInfo?.fullName ||
              "Khách hàng Thuộc Cô Ba",
            phone: shippingInfo?.phone || userInfo?.phone || "",
            avatar: userInfo?.avatar || "/logo.png.png",
          }}
          shippingInfo={shippingInfo}
          onChangeShippingInfo={setShippingInfo}
          onSyncZalo={handleSyncZalo}
          isFollowingOA={isFollowingOA}
          onFollowOA={handleFollowOA}
          orderHistory={displayOrders}
          orderStatusFilter={orderStatusFilter}
          onSelectOrderStatus={handleSelectOrderStatus}
          onRefreshOrders={fetchOrdersFromServer}
        />
      )}

      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
      />
    </Page>
  );
}