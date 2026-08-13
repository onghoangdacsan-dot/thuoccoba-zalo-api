import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, Icon, useSnackbar } from "zmp-ui";
import { Payment, events, EventName } from "zmp-sdk/apis";
import AddressForm from "./AddressForm";

const PRIMARY = "#8B4513";
const BORDER = "#E8D5C0";
const BG = "#FBF7F2";
const MUTED = "#6B7280";
const TEXT = "#1F2937";

const PAYMENT_METHOD_ID = "COD";

const ZALO_ARTICLES = [
  {
    id: 1,
    title: "Tuyệt chiêu làm Xoài non lắc mắm ruốc muối xổi siêu cuốn!",
    desc: "Bí quyết độc quyền từ Thuộc Cô Ba giúp món xoài lắc chua cay mặn ngọt chuẩn vị...",
    icon: "🥭",
    link: "https://post.oa.zalo.me/d?id=9cd034fbf5be1ce045af&pageId=1624808365073207434",
    badge: "HOT",
    badgeColor: "#EF4444",
  },
  {
    id: 2,
    title: "Thịt ba rọi xào mắm ruốc sả ớt - Đưa cơm ngày mưa",
    desc: "Bữa cơm gia đình thêm đậm đà với hũ mắm ruốc muối xổi thơm lừng...",
    icon: "🥘",
    link: "https://post.oa.zalo.me/d?id=16bbb7cc76899fd7c698&pageId=1624808365073207434",
    badge: "GỢI Ý",
    badgeColor: "#D97706",
  },
  {
    id: 3,
    title: "Bí quyết chọn mắm ruốc ngon chuẩn vị miền Nam",
    desc: "Khám phá cách phân biệt và lựa chọn loại mắm ruốc chuẩn chất lượng...",
    icon: "📜",
    link: "https://post.oa.zalo.me/d?id=c4ca734ab20f5b51021e&pageId=1624808365073207434",
    badge: "MẸO HAY",
    badgeColor: "#0284C7",
  },
];

function Card({ children, onClick, style = {} }) {
  return (
    <Box
      onClick={onClick}
      style={{
        background: "#FFF",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 12,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 3px rgba(139,69,19,0.04)",
        boxSizing: "border-box",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [note, setNote] = useState("");
  const { openSnackbar } = useSnackbar();
  const processedTransRef = useRef(new Set());

  const subTotal = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );
  const shippingFee = cartItems.length === 0 ? 0 : subTotal >= 500000 ? 0 : 20000;
  const finalTotal = subTotal + shippingFee;

  const name = String(shippingInfo?.fullName || "").trim();
  const phone = String(shippingInfo?.phone || "").trim();
  const addressLine = String(
    shippingInfo?.address ||
      [shippingInfo?.detailAddress, shippingInfo?.wardName, shippingInfo?.provinceName]
        .filter(Boolean)
        .join(", ") ||
      ""
  ).trim();

  const hasAddress = Boolean(name && phone && addressLine);

  const handleSaveAddress = (addressData) => {
    onChangeShippingInfo?.({
      ...shippingInfo,
      fullName: addressData.fullName,
      phone: addressData.phone,
      address: addressData.address,
      provinceCode: addressData.provinceCode,
      provinceName: addressData.provinceName,
      wardCode: addressData.wardCode,
      wardName: addressData.wardName,
      detailAddress: addressData.detailAddress,
      isDefault: addressData.isDefault,
    });
    setShowAddressForm(false);
    openSnackbar({ type: "success", text: "Đã lưu địa chỉ nhận hàng!" });
  };

  const handlePaymentDone = useCallback(
    async (data) => {
      try {
        const result = await Payment.checkTransaction({ data });
        const transKey = result?.transId || result?.orderId || JSON.stringify(data);

        if (processedTransRef.current.has(transKey)) {
          setIsProcessing(false);
          return;
        }
        processedTransRef.current.add(transKey);

        switch (result.resultCode) {
          case 1:
          case 0:
            openSnackbar({ type: "success", text: "Đặt hàng thành công!" });
            if (typeof onPlaceOrder === "function") onPlaceOrder(result);
            break;
          case -1:
            openSnackbar({ type: "error", text: result.msg || "Thanh toán thất bại" });
            break;
          case -2:
            openSnackbar({ type: "info", text: "Bạn đã hủy thanh toán" });
            break;
          default:
            openSnackbar({ type: "error", text: result.msg || "Có lỗi xảy ra" });
        }
      } catch (err) {
        console.error("checkTransaction error:", err);
        openSnackbar({ type: "error", text: "Không thể kiểm tra kết quả thanh toán" });
      } finally {
        setIsProcessing(false);
      }
    },
    [onPlaceOrder, openSnackbar]
  );

  useEffect(() => {
    events.on(EventName.PaymentDone, handlePaymentDone);
    return () => events.off(EventName.PaymentDone, handlePaymentDone);
  }, [handlePaymentDone]);

  const handleConfirm = async () => {
    if (!hasAddress) {
      openSnackbar({ type: "error", text: "Vui lòng thêm địa chỉ nhận hàng" });
      setShowAddressForm(true);
      return;
    }
    if (cartItems.length === 0) {
      openSnackbar({ type: "error", text: "Giỏ hàng đang trống" });
      return;
    }
    if (typeof createOrderOnServer !== "function" || typeof createMacOnServer !== "function") {
      openSnackbar({
        type: "error",
        text: "Thiếu cấu hình thanh toán. Kiểm tra component cha.",
      });
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const myOrder = await createOrderOnServer({
        items: cartItems,
        shippingInfo,
        note,
        subTotal,
        shippingFee,
        total: finalTotal,
        paymentMethod: "COD",
      });

      const items = cartItems.map((item) => ({
        id: String(item.id),
        amount: (item.price || 0) * (item.quantity || 0),
      }));

      const extradata = {
        orderId: myOrder?.orderId || "",
        fullName: name,
        phone,
        address: addressLine,
        note: note || "",
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
        method: JSON.stringify({ id: PAYMENT_METHOD_ID, isCustom: false }),
      };

      const mac = await createMacOnServer(orderData);
      orderData.mac = mac;

      await Payment.createOrder({
        ...orderData,
        success: (data) => console.log("createOrder success:", data),
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

  if (showAddressForm) {
    return (
      <AddressForm
        initialAddress={shippingInfo}
        onSave={handleSaveAddress}
        onClose={() => setShowAddressForm(false)}
      />
    );
  }

  return (
    <Box
      style={{
        background: BG,
        minHeight: "100%",
        padding: "12px 14px 140px",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Header */}
      <Box
        onClick={onGoToMenu}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          cursor: "pointer",
        }}
      >
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "#FFF",
            border: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16, color: PRIMARY, display: "block" }}>←</Text>
        </Box>
        <Box>
          <Text style={{ fontSize: 15, fontWeight: 800, color: TEXT, display: "block" }}>
            Thanh toán
          </Text>
          <Text style={{ fontSize: 11, color: MUTED, display: "block", marginTop: 1 }}>
            Mắm Thuộc Cô Ba
          </Text>
        </Box>
      </Box>

      {/* Địa chỉ */}
      <Card
        onClick={() => setShowAddressForm(true)}
        style={{
          cursor: "pointer",
          borderColor: hasAddress ? BORDER : "#FECACA",
          background: hasAddress ? "#FFF" : "#FEF2F2",
        }}
      >
        <Box style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: hasAddress ? "#FEF3C7" : "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 16, display: "block" }}>{hasAddress ? "📍" : "⚠️"}</Text>
          </Box>

          <Box style={{ flex: 1, minWidth: 0 }}>
            {hasAddress ? (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT,
                    display: "block",
                    lineHeight: 1.4,
                  }}
                >
                  {name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: PRIMARY,
                    fontWeight: 600,
                    display: "block",
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {phone}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    display: "block",
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {addressLine}
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#DC2626",
                    display: "block",
                  }}
                >
                  Chưa có địa chỉ nhận hàng
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    display: "block",
                    marginTop: 3,
                  }}
                >
                  Nhấn để thêm địa chỉ giao hàng
                </Text>
              </>
            )}
          </Box>

          <Text style={{ fontSize: 18, color: "#9CA3AF", display: "block", marginTop: 6 }}>›</Text>
        </Box>
      </Card>

      {/* Lời nhắn */}
      <Card>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: TEXT,
            display: "block",
            marginBottom: 8,
          }}
        >
          Lời nhắn cho shop
        </Text>
        <input
          type="text"
          placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: TEXT,
            background: "transparent",
            padding: 0,
          }}
        />
      </Card>

      {/* Vận chuyển */}
      <Card>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: TEXT,
            display: "block",
            marginBottom: 12,
          }}
        >
          Phương thức vận chuyển
        </Text>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: 12,
            background: "#FFF7ED",
            border: `1.5px solid ${PRIMARY}`,
          }}
        >
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 18, display: "block" }}>🚚</Text>
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: TEXT, display: "block" }}>
              Giao nhanh
            </Text>
            <Text style={{ fontSize: 11, color: MUTED, display: "block", marginTop: 2 }}>
              Nhận hàng trong 1–2 ngày
            </Text>
          </Box>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: shippingFee === 0 ? "#16A34A" : PRIMARY,
              display: "block",
              flexShrink: 0,
            }}
          >
            {shippingFee === 0 ? "Miễn phí" : `${shippingFee.toLocaleString("vi-VN")}đ`}
          </Text>
        </Box>
      </Card>

      {/* Giỏ hàng */}
      {cartItems.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "36px 20px" }}>
          <Box
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Text style={{ fontSize: 32, display: "block" }}>🛒</Text>
          </Box>
          <Text
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: TEXT,
              display: "block",
              marginBottom: 6,
            }}
          >
            Giỏ hàng trống
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              display: "block",
              marginBottom: 18,
            }}
          >
            Thêm sản phẩm mắm truyền thống để tiếp tục
          </Text>
          <Box
            onClick={onGoToMenu}
            style={{
              display: "inline-block",
              background: PRIMARY,
              color: "#FFF",
              padding: "12px 28px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(139,69,19,0.25)",
            }}
          >
            Khám phá sản phẩm
          </Box>
        </Card>
      ) : (
        <>
          <Card style={{ padding: "12px 14px" }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: TEXT,
                display: "block",
                marginBottom: 12,
              }}
            >
              Sản phẩm ({cartItems.length})
            </Text>
            {cartItems.map((item, idx) => (
              <Box
                key={item.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  paddingTop: idx === 0 ? 0 : 12,
                  paddingBottom: idx === cartItems.length - 1 ? 0 : 12,
                  borderBottom:
                    idx === cartItems.length - 1 ? "none" : `1px solid ${BORDER}`,
                }}
              >
                <Box
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: "#F5EDE4",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 22, display: "block" }}>🫙</Text>
                  )}
                </Box>

                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: TEXT,
                      display: "block",
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: PRIMARY,
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    {item.displayPrice ||
                      `${Number(item.price || 0).toLocaleString("vi-VN")}đ`}
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
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      cursor: "pointer",
                      display: "block",
                    }}
                  >
                    Xóa
                  </Text>
                  <Box style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Box
                      onClick={() => onUpdateQuantity?.(item.id, -1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                        color: TEXT,
                      }}
                    >
                      −
                    </Box>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        minWidth: 20,
                        textAlign: "center",
                        display: "block",
                      }}
                    >
                      {item.quantity}
                    </Text>
                    <Box
                      onClick={() => onUpdateQuantity?.(item.id, 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: PRIMARY,
                        color: "#FFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      +
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Card>

          {/* Thanh toán */}
          <Card>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: TEXT,
                display: "block",
                marginBottom: 12,
              }}
            >
              Phương thức thanh toán
            </Text>
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                background: "#FFF7ED",
                border: `1.5px solid ${PRIMARY}`,
              }}
            >
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 18, display: "block" }}>💵</Text>
              </Box>
              <Box style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 700, color: TEXT, display: "block" }}>
                  COD — Thanh toán khi nhận hàng
                </Text>
                <Text style={{ fontSize: 11, color: MUTED, display: "block", marginTop: 2 }}>
                  Trả tiền mặt cho shipper khi giao tận nơi
                </Text>
              </Box>
              <Box
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 10, color: "#FFF", display: "block" }}>✓</Text>
              </Box>
            </Box>
          </Card>

          {/* Tóm tắt tiền */}
          <Card>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: TEXT,
                display: "block",
                marginBottom: 12,
              }}
            >
              Chi tiết thanh toán
            </Text>
            {[
              ["Tạm tính", `${subTotal.toLocaleString("vi-VN")}đ`],
              [
                "Phí vận chuyển",
                shippingFee === 0 ? "Miễn phí" : `${shippingFee.toLocaleString("vi-VN")}đ`,
              ],
            ].map(([label, value]) => (
              <Box
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: MUTED, display: "block" }}>{label}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: value === "Miễn phí" ? "#16A34A" : TEXT,
                    fontWeight: value === "Miễn phí" ? 700 : 500,
                    display: "block",
                  }}
                >
                  {value}
                </Text>
              </Box>
            ))}
            <Box
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                paddingTop: 12,
                borderTop: `1px dashed ${BORDER}`,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 700, color: TEXT, display: "block" }}>
                Tổng cộng
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: PRIMARY,
                  display: "block",
                }}
              >
                {finalTotal.toLocaleString("vi-VN")}đ
              </Text>
            </Box>
          </Card>
        </>
      )}

      {/* Blog OA */}
      <Card style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 800, color: "#B45309", display: "block" }}>
            🥗 Món ngon mỗi ngày
          </Text>
          <Box
            style={{
              background: "#FEF3C7",
              color: "#D97706",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
            }}
          >
            Zalo OA
          </Box>
        </Box>

        {ZALO_ARTICLES.map((article, index) => (
          <Box
            key={article.id}
            onClick={() => handleOpenZaloArticle(article.link)}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "#FFF",
              border: "1px solid #FDE68A",
              padding: 10,
              borderRadius: 12,
              cursor: "pointer",
              marginBottom: index === ZALO_ARTICLES.length - 1 ? 0 : 8,
            }}
          >
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
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
                  background: article.badgeColor,
                  color: "#FFF",
                  fontSize: 7,
                  padding: "1px 4px",
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {article.badge}
              </Box>
            </Box>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: TEXT,
                  display: "block",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {article.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: MUTED,
                  display: "block",
                  marginTop: 2,
                  lineHeight: 1.35,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {article.desc}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#0068FF",
                  fontWeight: 700,
                  marginTop: 4,
                  display: "block",
                }}
              >
                Xem trên Zalo OA →
              </Text>
            </Box>
          </Box>
        ))}
      </Card>

      {/* Nút Đặt hàng — cố định phía trên BottomNav */}
      {cartItems.length > 0 && (
        <Box
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 64,
            zIndex: 90,
            background: "#FFF",
            borderTop: `1px solid ${BORDER}`,
            padding: "12px 16px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: MUTED, display: "block" }}>
              Tổng thanh toán
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: PRIMARY,
                display: "block",
                marginTop: 2,
              }}
            >
              {finalTotal.toLocaleString("vi-VN")}đ
            </Text>
          </Box>
          <Box
            onClick={!isProcessing ? handleConfirm : undefined}
            style={{
              background: isProcessing ? "#A78B71" : PRIMARY,
              color: "#FFF",
              padding: "14px 24px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              cursor: isProcessing ? "not-allowed" : "pointer",
              boxShadow: isProcessing ? "none" : "0 4px 14px rgba(139,69,19,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {isProcessing ? "Đang xử lý..." : "Đặt hàng"}
          </Box>
        </Box>
      )}
    </Box>
  );
}