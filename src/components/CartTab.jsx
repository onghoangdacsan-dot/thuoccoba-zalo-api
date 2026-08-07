import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, Icon, useSnackbar } from "zmp-ui";
import { Payment, events, EventName } from "zmp-sdk/apis";
import { validateShippingInfo } from "../utils/validation";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

// Đã đổi thành "COD" cho production
const PAYMENT_METHOD_ID = "COD";

const ZALO_ARTICLES = [
  {
    id: 1,
    title: "Tuyệt chiêu làm Xoài non lắc mắm ruốc muối xổi siêu cuốn!",
    desc: "Bí quyết độc quyền từ Thuộc Cô Ba giúp món xoài lắc chua cay mặn ngọt chuẩn vị...",
    icon: "🥭",
    link: "https://post.oa.zalo.me/d?id=9cd034fbf5be1ce045af&pageId=1624808365073207434",
    badge: "HOT",
  },
  {
    id: 2,
    title: "Thịt ba rọi xào mắm ruốc sả ớt - Đưa cơm ngày mưa",
    desc: "Bữa cơm gia đình thêm đậm đà với hũ mắm ruốc muối xổi thơm lừng, xào cùng thịt heo...",
    icon: "🥘",
    link: "https://post.oa.zalo.me/d?id=16bbb7cc76899fd7c698&pageId=1624808365073207434",
    badge: "GỢI Ý",
  },
  {
    id: 3,
    title: "Bí quyết chọn mắm ruốc ngon chuẩn vị miền Nam",
    desc: "Khám phá cách phân biệt và lựa chọn loại mắm ruốc chuẩn chất lượng để làm gia vị...",
    icon: "📜",
    link: "https://post.oa.zalo.me/d?id=c4ca734ab20f5b51021e&pageId=1624808365073207434",
    badge: "MẸO HAY",
  },
];

export default function CartTab({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  shippingInfo = {},
  onChangeShippingInfo,
  onSyncZalo,
  onPlaceOrder,
  onGoToMenu,
  createOrderOnServer,
  createMacOnServer,
}) {
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { openSnackbar } = useSnackbar();

  // Chặn xử lý trùng lặp: đánh dấu các giao dịch (transId/orderId) đã xử lý
  const processedTransRef = useRef(new Set());

  const subTotal = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );
  const calculatedShipping =
    cartItems.length === 0 ? 0 : subTotal >= 500000 ? 0 : 20000;
  const finalTotal = subTotal + calculatedShipping;

  // Lắng nghe kết quả thanh toán từ Checkout SDK
  const handlePaymentDone = useCallback(
    async (data) => {
      try {
        const result = await Payment.checkTransaction({ data });

        const transKey =
          result?.transId || result?.orderId || JSON.stringify(data);

        if (processedTransRef.current.has(transKey)) {
          console.warn(
            "PaymentDone: giao dịch đã được xử lý trước đó, bỏ qua:",
            transKey
          );
          setIsProcessing(false);
          return;
        }
        processedTransRef.current.add(transKey);

        switch (result.resultCode) {
          case 1:
          case 0:
            openSnackbar({ type: "success", text: "Đặt hàng thành công!" });
            if (typeof onPlaceOrder === "function") {
              onPlaceOrder(result);
            }
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
      } finally {
        setIsProcessing(false);
      }
    },
    [onPlaceOrder, openSnackbar]
  );

  useEffect(() => {
    events.on(EventName.PaymentDone, handlePaymentDone);
    return () => {
      events.off(EventName.PaymentDone, handlePaymentDone);
    };
  }, [handlePaymentDone]);

  const handleConfirm = async () => {
    const { isValid, errors: validationErrors } =
      validateShippingInfo(shippingInfo);
    setErrors(validationErrors || {});
    if (!isValid) return;

    if (cartItems.length === 0) {
      openSnackbar({ type: "error", text: "Giỏ hàng đang trống" });
      return;
    }

    if (typeof createOrderOnServer !== "function") {
      openSnackbar({
        type: "error",
        text: "Thiếu createOrderOnServer. Kiểm tra component cha.",
      });
      return;
    }

    if (typeof createMacOnServer !== "function") {
      openSnackbar({
        type: "error",
        text: "Thiếu createMacOnServer. Kiểm tra component cha.",
      });
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const myOrder = await createOrderOnServer({
        items: cartItems,
        shippingInfo,
        subTotal,
        shippingFee: calculatedShipping,
        total: finalTotal,
        paymentMethod: "COD",
      });

      const items = cartItems.map((item) => ({
        id: String(item.id),
        amount: (item.price || 0) * (item.quantity || 0),
      }));

      const paymentMethod = {
        id: PAYMENT_METHOD_ID,
        isCustom: false,
      };

      // ===== ĐÃ THÊM DANH SÁCH SẢN PHẨM VÀO EXTRADATA =====
      const extradata = {
        orderId: myOrder?.orderId || "",
        fullName: shippingInfo.fullName || "",
        phone: shippingInfo.phone || "",
        address: shippingInfo.address || "",
        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const orderData = {
        amount: finalTotal,
        desc: `Đơn hàng #${myOrder?.orderId || ""} - Mắm Thuộc Cô Ba`,
        item: items,
        extradata: JSON.stringify(extradata),
        method: JSON.stringify(paymentMethod),
      };

      const mac = await createMacOnServer(orderData);
      orderData.mac = mac;

      await Payment.createOrder({
        ...orderData,
        success: (data) => {
          console.log("createOrder success:", data);
        },
        fail: (err) => {
          console.error("createOrder fail:", err);
          openSnackbar({
            type: "error",
            text: err?.message || "Không thể tạo yêu cầu thanh toán",
          });
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("handleConfirm error:", error);
      openSnackbar({
        type: "error",
        text: error?.message || "Có lỗi xảy ra khi đặt hàng",
      });
      setIsProcessing(false);
    }
  };

  const handleOpenZaloArticle = (url) => {
    if (window?.ZaloJavaScriptInterface?.openWebview) {
      window.ZaloJavaScriptInterface.openWebview({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <Box
      style={{
        padding: 16,
        paddingBottom: 60,
        boxSizing: "border-box",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <Box
        onClick={onGoToMenu}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: 14,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: PRIMARY_COLOR }}>
          ←
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: PRIMARY_COLOR }}>
          Mắm Thuộc Cô Ba
        </Text>
      </Box>

      {cartItems.length === 0 ? (
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px 20px",
            background: "#FFF",
            borderRadius: 14,
            border: `1px solid ${BAMBOO_BORDER}`,
            gap: 14,
            textAlign: "center",
            marginBottom: 16,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <Text style={{ fontSize: 36 }}>🛒</Text>
          <Text style={{ fontSize: 15, fontWeight: "bold", color: "#444" }}>
            Giỏ hàng đang trống!
          </Text>
          <Box
            onClick={onGoToMenu}
            style={{
              background: PRIMARY_COLOR,
              color: "#FFF",
              padding: "10px 24px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(139,69,19,0.3)",
            }}
          >
            KHÁM PHÁ SẢN PHẨM
          </Box>
        </Box>
      ) : (
        <>
          {/* Danh sách sản phẩm */}
          {cartItems.map((item) => (
            <Box
              key={item.id}
              style={{
                background: "#FFF",
                padding: 12,
                borderRadius: 12,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: `1px solid ${BAMBOO_BORDER}`,
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              <Box style={{ flex: 1, paddingRight: 8, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    lineHeight: 1.3,
                    marginBottom: 6,
                    display: "block",
                    wordBreak: "break-word",
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: PRIMARY_COLOR,
                    display: "block",
                  }}
                >
                  {item.displayPrice}
                </Text>
              </Box>

              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <Text
                  onClick={() => onRemoveItem?.(item.id)}
                  style={{ fontSize: 14, cursor: "pointer" }}
                >
                  🗑️
                </Text>
                <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Box
                    onClick={() => onUpdateQuantity?.(item.id, -1)}
                    style={{
                      width: 26,
                      height: 26,
                      background: "#F4EBE1",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    −
                  </Box>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {item.quantity}
                  </Text>
                  <Box
                    onClick={() => onUpdateQuantity?.(item.id, 1)}
                    style={{
                      width: 26,
                      height: 26,
                      background: PRIMARY_COLOR,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFF",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}

          {/* Thông tin nhận hàng */}
          <Box
            style={{
              background: "#FFF",
              padding: 14,
              borderRadius: 12,
              marginTop: 14,
              border: `1px solid ${BAMBOO_BORDER}`,
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <Box
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: 900, color: PRIMARY_COLOR }}
              >
                📍 THÔNG TIN NHẬN HÀNG
              </Text>
              <Box
                onClick={onSyncZalo}
                style={{
                  background: "#0068FF",
                  color: "#FFF",
                  fontSize: 10,
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                Đồng bộ Zalo
              </Box>
            </Box>

            <input
              type="text"
              placeholder="Họ tên người nhận"
              value={shippingInfo.fullName || ""}
              onChange={(e) =>
                onChangeShippingInfo?.({
                  ...shippingInfo,
                  fullName: e.target.value,
                })
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${errors.fullName ? "#DC2626" : "#D1D5DB"}`,
                borderRadius: 6,
                padding: 9,
                fontSize: 13,
                marginBottom: 4,
                outline: "none",
              }}
            />
            {errors.fullName && (
              <Text style={{ fontSize: 11, color: "#DC2626", marginBottom: 6 }}>
                {errors.fullName}
              </Text>
            )}

            <input
              type="text"
              placeholder="Số điện thoại"
              value={shippingInfo.phone || ""}
              onChange={(e) =>
                onChangeShippingInfo?.({
                  ...shippingInfo,
                  phone: e.target.value,
                })
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${errors.phone ? "#DC2626" : "#D1D5DB"}`,
                borderRadius: 6,
                padding: 9,
                fontSize: 13,
                marginBottom: 4,
                outline: "none",
              }}
            />
            {errors.phone && (
              <Text style={{ fontSize: 11, color: "#DC2626", marginBottom: 6 }}>
                {errors.phone}
              </Text>
            )}

            <input
              type="text"
              placeholder="Địa chỉ nhận hàng"
              value={shippingInfo.address || ""}
              onChange={(e) =>
                onChangeShippingInfo?.({
                  ...shippingInfo,
                  address: e.target.value,
                })
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${errors.address ? "#DC2626" : "#D1D5DB"}`,
                borderRadius: 6,
                padding: 9,
                fontSize: 13,
                outline: "none",
              }}
            />
            {errors.address && (
              <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>
                {errors.address}
              </Text>
            )}
          </Box>

          {/* Phương thức thanh toán */}
          <Box
            style={{
              background: "#FFF",
              padding: 14,
              borderRadius: 12,
              marginTop: 14,
              border: `1px solid ${BAMBOO_BORDER}`,
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: PRIMARY_COLOR,
                marginBottom: 10,
              }}
            >
              💳 PHƯƠNG THỨC THANH TOÁN
            </Text>
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 8,
                background: "#FCE7D5",
                border: `1.5px solid ${PRIMARY_COLOR}`,
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              <Text style={{ fontSize: 18 }}>💵</Text>
              <Box>
                <Text style={{ fontSize: 13, fontWeight: "bold" }}>
                  Thanh toán khi nhận hàng (COD)
                </Text>
                <Text style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                  Thanh toán bằng tiền mặt khi shipper giao hàng tận nơi.
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Tổng tiền + nút đặt hàng */}
          <Box
            style={{
              background: "#FFF",
              padding: 14,
              borderRadius: 12,
              marginTop: 14,
              border: `1px solid ${BAMBOO_BORDER}`,
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <Box
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                fontSize: 12,
                color: "#666",
              }}
            >
              <Text>Tạm tính</Text>
              <Text>{subTotal.toLocaleString()} đ</Text>
            </Box>
            <Box
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                fontSize: 12,
                color: "#666",
              }}
            >
              <Text>
                Phí vận chuyển{" "}
                {subTotal >= 500000 && (
                  <span style={{ color: "#16A34A", fontWeight: "bold" }}>
                    (Miễn phí)
                  </span>
                )}
              </Text>
              <Text
                style={{
                  color: calculatedShipping === 0 ? "#16A34A" : "inherit",
                  fontWeight: calculatedShipping === 0 ? "bold" : "normal",
                }}
              >
                {calculatedShipping === 0
                  ? "0 đ"
                  : `${calculatedShipping.toLocaleString()} đ`}
              </Text>
            </Box>

            <Box
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
                fontSize: 15,
                fontWeight: 900,
                color: PRIMARY_COLOR,
                borderTop: `1px dashed ${BAMBOO_BORDER}`,
                paddingTop: 8,
              }}
            >
              <Text>Tổng thanh toán</Text>
              <Text>{finalTotal.toLocaleString()} đ</Text>
            </Box>

            <Box
              onClick={!isProcessing ? handleConfirm : undefined}
              style={{
                width: "100%",
                background: PRIMARY_COLOR,
                color: "#FFF",
                textAlign: "center",
                padding: "14px 0",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: "bold",
                cursor: isProcessing ? "not-allowed" : "pointer",
                boxSizing: "border-box",
                opacity: isProcessing ? 0.7 : 1,
                boxShadow: "0 2px 6px rgba(139,69,19,0.3)",
              }}
            >
              {isProcessing ? "Đang xử lý..." : "XÁC NHẬN ĐẶT HÀNG NGAY"}
            </Box>
          </Box>
        </>
      )}

      {/* Blog Zalo OA */}
      <Box
        style={{
          background: "#FFF",
          padding: 14,
          borderRadius: 12,
          marginTop: 16,
          border: "1px solid #FCD34D",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🥗</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#B45309" }}>
              Món ngon mỗi ngày cùng Mắm Ruốc
            </Text>
          </Box>
          <Text
            style={{
              fontSize: 10,
              background: "#FEF3C7",
              color: "#D97706",
              padding: "3px 8px",
              borderRadius: 12,
              fontWeight: "bold",
            }}
          >
            Zalo OA Blog
          </Text>
        </Box>

        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          {ZALO_ARTICLES.map((article, index) => (
            <Box
              key={article.id}
              onClick={() => handleOpenZaloArticle(article.link)}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: index === 0 ? "#FFFBEB" : "#F9FAFB",
                border:
                  index === 0 ? "1px solid #FDE68A" : "1px solid #E5E7EB",
                padding: 10,
                borderRadius: 8,
                cursor: "pointer",
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  background:
                    index === 0
                      ? "#FEF3C7"
                      : index === 1
                      ? "#FCE7D5"
                      : "#E0F2FE",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {article.icon}
                <Box
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    background:
                      index === 0
                        ? "#EF4444"
                        : index === 1
                        ? "#D97706"
                        : "#0284C7",
                    color: "#FFF",
                    fontSize: 7,
                    padding: "1px 3px",
                    borderRadius: 3,
                    fontWeight: "bold",
                  }}
                >
                  {article.badge}
                </Box>
              </Box>

              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#333",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {article.title}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#666",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginTop: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {article.desc}
                </Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    color: "#0068FF",
                    fontWeight: "bold",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Xem chi tiết trên Zalo OA{" "}
                  <Icon icon="zi-arrow-right" style={{ fontSize: 10 }} />
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}