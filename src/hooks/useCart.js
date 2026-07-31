import { useState, useEffect, useCallback } from "react";
import { loadState, saveState } from "../utils/storage";

export function useCart() {
  const [cartItems, setCartItems] = useState(() => loadState("cart", []));
  const [orderHistory, setOrderHistory] = useState(() => loadState("orders", []));
  const [orderCount, setOrderCount] = useState(() => loadState("orderCount", 0));

  useEffect(() => {
    saveState("cart", cartItems);
  }, [cartItems]);

  useEffect(() => {
    saveState("orders", orderHistory);
  }, [orderHistory]);

  useEffect(() => {
    saveState("orderCount", orderCount);
  }, [orderCount]);

  const addToCart = useCallback((product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  /**
   * Lưu đơn hàng + chặn trùng theo id.
   * Luôn xóa giỏ sau khi gọi (tránh hàng còn trong giỏ sau khi đặt thành công).
   */
  const placeOrder = useCallback(
    (orderData) => {
      const items =
        orderData?.items?.length > 0 ? orderData.items : [...cartItems];

      const newOrderId =
        orderData?.zaloOrderId || orderData?.orderId || "ORD_" + Date.now();

      // Giỏ / danh sách sản phẩm trống
      if (!items.length) {
        console.warn("placeOrder: không có sản phẩm");
        setCartItems([]);
        return null;
      }

      // Đơn trùng → không thêm lại, nhưng vẫn xóa giỏ
      const alreadyExists = orderHistory.some((o) => o.id === newOrderId);
      if (alreadyExists) {
        console.warn("placeOrder: đơn đã tồn tại, bỏ qua trùng:", newOrderId);
        setCartItems([]);
        return null;
      }

      const newOrder = {
        id: newOrderId,
        date: new Date().toLocaleString("vi-VN"),
        items,
        shippingInfo: orderData?.shippingInfo || {},
        paymentMethod: orderData?.paymentMethod || "COD",
        total: orderData?.finalTotal ?? orderData?.total ?? 0,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      setOrderHistory((prev) => [newOrder, ...prev]);
      setOrderCount((prev) => prev + 1);
      setCartItems([]); // xóa giỏ ngay sau khi lưu đơn

      return newOrder;
    },
    [cartItems, orderHistory]
  );

  return {
    cartItems,
    orderHistory,
    orderCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    placeOrder,
  };
}