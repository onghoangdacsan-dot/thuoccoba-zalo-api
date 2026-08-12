import { useState, useEffect, useCallback } from "react";
import { loadState, saveState } from "../utils/storage";

export function useCart(userId = null) {
  const ordersKey = userId ? `orders_${userId}` : "orders_guest";
  const orderCountKey = userId ? `orderCount_${userId}` : "orderCount_guest";

  const [cartItems, setCartItems] = useState(() => loadState("cart", []));
  const [orderHistory, setOrderHistory] = useState(() => loadState(ordersKey, []));
  const [orderCount, setOrderCount] = useState(() => loadState(orderCountKey, 0));

  useEffect(() => {
    setOrderHistory(loadState(ordersKey, []));
    setOrderCount(loadState(orderCountKey, 0));
  }, [userId, ordersKey, orderCountKey]);

  useEffect(() => {
    saveState("cart", cartItems);
  }, [cartItems]);

  useEffect(() => {
    saveState(ordersKey, orderHistory);
  }, [orderHistory, ordersKey]);

  useEffect(() => {
    saveState(orderCountKey, orderCount);
  }, [orderCount, orderCountKey]);

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

  const placeOrder = useCallback(
    (orderData) => {
      const items =
        orderData?.items?.length > 0 ? orderData.items : [...cartItems];
      const newOrderId =
        orderData?.zaloOrderId || orderData?.orderId || "ORD_" + Date.now();

      if (!items.length) {
        console.warn("placeOrder: không có sản phẩm");
        setCartItems([]);
        return null;
      }

      const alreadyExists = orderHistory.some((o) => o.id === newOrderId);
      if (alreadyExists) {
        console.warn("placeOrder: đơn đã tồn tại:", newOrderId);
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
        userId: userId || null,
      };

      setOrderHistory((prev) => [newOrder, ...prev]);
      setOrderCount((prev) => prev + 1);
      setCartItems([]);

      return newOrder;
    },
    [cartItems, orderHistory, userId]
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