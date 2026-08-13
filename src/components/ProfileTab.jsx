import React, { useState } from "react";
import { Box, Text, useSnackbar } from "zmp-ui";
import { openChat, openWebview } from "zmp-sdk/apis";
import profileBanner from "../assets/banners/banner-profile.jpg";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";
const ZALO_OA_ID = "1624808365073207434";
const WAREHOUSE_ADDRESS = "1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai";
const API = "https://thuoccoba-zalo-api-production.up.railway.app";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const ORDER_STATUSES = [
  { key: "pending", icon: "⏳", label: "Chờ xác nhận" },
  { key: "preparing", icon: "📦", label: "Đang chuẩn bị" },
  { key: "shipping", icon: "🚚", label: "Đang giao" },
  { key: "completed", icon: "✅", label: "Đã giao" },
  { key: "cancelled", icon: "❌", label: "Đã hủy" },
];

const CANCEL_REASONS = [
  "Đặt nhầm sản phẩm / số lượng",
  "Muốn đổi địa chỉ giao hàng",
  "Thời gian giao không phù hợp",
  "Tìm được giá tốt hơn",
  "Đổi ý, không muốn mua nữa",
  "Lý do khác",
];

function canModifyOrder(order) {
  if (!order) return false;
  const st = String(order.status || "pending").toLowerCase();
  if (st !== "pending" && st !== "chờ xác nhận" && st !== "đang xử lý" && st !== "waiting") {
    return false;
  }
  const created = new Date(order.createdAt || order.date).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= TWO_HOURS_MS;
}

function getRemainMinutes(order) {
  const created = new Date(order.createdAt || order.date).getTime();
  if (Number.isNaN(created)) return 0;
  const left = TWO_HOURS_MS - (Date.now() - created);
  return Math.max(0, Math.ceil(left / 60000));
}

export default function ProfileTab({
  userInfo,
  onSyncZalo,
  isFollowingOA,
  onFollowOA,
  orderHistory = [],
  orderStatusFilter,
  onSelectOrderStatus,
  onRefreshOrders,
}) {
  const { openSnackbar } = useSnackbar();
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const myPhone = (userInfo && userInfo.phone ? String(userInfo.phone) : "").trim();
  const myId = userInfo && userInfo.id ? String(userInfo.id) : "";

  const myOrders = (orderHistory || []).filter((order) => {
    if (!order) return false;
    if (order.userId && myId) return String(order.userId) === myId;
    const orderPhone =
      order.shippingInfo && order.shippingInfo.phone
        ? String(order.shippingInfo.phone).trim()
        : "";
    if (myPhone && orderPhone) return orderPhone === myPhone;
    return false;
  });

  const handleOpenGoogleMap = () => {
    const mapUrl =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(WAREHOUSE_ADDRESS);
    try {
      openWebview({
        url: mapUrl,
        success: () => {},
        fail: () => window.open(mapUrl, "_blank"),
      });
    } catch (err) {
      window.open(mapUrl, "_blank");
    }
  };

  const handleShowOcopCertificates = () => {
    alert(
      "🌿 CHỨNG NHẬN CHẤT LƯỢNG & TIÊU CHUẨN:\n\n✔️ Sản phẩm OCOP 4 Sao cấp tỉnh\n✔️ Đạt chuẩn Vệ sinh an toàn thực phẩm & HACCP\n✔️ Bảo hộ độc quyền nhãn hiệu bởi Cục Sở hữu trí tuệ\n\nCam kết 100% nguyên chất, không chất bảo quản, đậm đà hương vị truyền thống."
    );
  };

  const handleOpenZaloChat = (prefill) => {
    try {
      openChat({
        type: "oa",
        id: ZALO_OA_ID,
        message: prefill || "",
        success: () => {},
        fail: () => {
          try {
            openWebview({
              url: "https://zalo.me/" + ZALO_OA_ID,
              success: () => {},
              fail: () => window.open("https://zalo.me/" + ZALO_OA_ID, "_blank"),
            });
          } catch (e) {
            window.open("https://zalo.me/" + ZALO_OA_ID, "_blank");
          }
        },
      });
    } catch (err) {
      window.open("https://zalo.me/" + ZALO_OA_ID, "_blank");
    }
  };

  const normalizeStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (
      !status ||
      s === "pending" ||
      status === "Đang xử lý" ||
      status === "Chờ xác nhận" ||
      s === "cho_xac_nhan" ||
      s === "waiting"
    ) {
      return "pending";
    }
    if (s === "preparing" || status === "Đang chuẩn bị" || s === "dang_chuan_bi") {
      return "preparing";
    }
    if (s === "shipping" || status === "Đang giao" || s === "dang_giao") {
      return "shipping";
    }
    if (
      s === "completed" ||
      status === "Đã giao" ||
      s === "delivered" ||
      s === "da_giao"
    ) {
      return "completed";
    }
    if (s === "cancelled" || status === "Đã hủy" || s === "canceled" || s === "da_huy") {
      return "cancelled";
    }
    return "pending";
  };

  const countByStatus = (statusKey) =>
    myOrders.filter((o) => normalizeStatus(o.status) === statusKey).length;

  const visibleOrders = orderStatusFilter
    ? myOrders.filter((o) => normalizeStatus(o.status) === orderStatusFilter)
    : myOrders;

  const openCancelModal = (order) => {
    if (!canModifyOrder(order)) {
      openSnackbar({
        type: "error",
        text: "Đã quá 2 giờ hoặc đơn không còn ở trạng thái chờ xác nhận.",
      });
      return;
    }
    setCancelOrder(order);
    setCancelReason("");
  };

  const handleChangeOrder = (order) => {
    if (!canModifyOrder(order)) {
      openSnackbar({
        type: "error",
        text: "Đã quá 2 giờ — không thể đổi đơn. Vui lòng chat shop để được hỗ trợ.",
      });
      handleOpenZaloChat(
        `Xin hỗ trợ đổi đơn ${order.id} (đã quá thời gian tự đổi trên app).`
      );
      return;
    }
    handleOpenZaloChat(
      `Tôi muốn ĐỔI đơn ${order.id}.\nSĐT: ${myPhone || order.shippingInfo?.phone || ""}\nNội dung cần đổi: `
    );
  };

  const submitCancel = async () => {
    if (!cancelOrder) return;
    if (!cancelReason) {
      openSnackbar({ type: "error", text: "Vui lòng chọn lý do hủy đơn" });
      return;
    }
    if (!canModifyOrder(cancelOrder)) {
      openSnackbar({
        type: "error",
        text: "Đã quá 2 giờ — không thể hủy đơn.",
      });
      setCancelOrder(null);
      return;
    }

    setCancelling(true);
    try {
      const orderId = cancelOrder.id;
      const res = await fetch(
        `${API}/api/orders/${encodeURIComponent(orderId)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: cancelReason,
            phone: myPhone || cancelOrder.shippingInfo?.phone || "",
          }),
        }
      );
      let data = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok) {
        throw new Error(data.error || `Lỗi ${res.status}: không hủy được đơn`);
      }

      openSnackbar({ type: "success", text: "Đã hủy đơn hàng thành công" });
      setCancelOrder(null);
      setCancelReason("");
      if (typeof onRefreshOrders === "function") {
        onRefreshOrders();
      } else {
        cancelOrder.status = "cancelled";
        cancelOrder.cancelReason = cancelReason;
      }
    } catch (err) {
      console.error("submitCancel:", err);
      openSnackbar({
        type: "error",
        text: err.message || "Không hủy được. Kiểm tra mạng / server.",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box style={{ background: "#FFFDF9", minHeight: "100vh", paddingBottom: 100 }}>
      {/* Header */}
      <Box
        style={{
          aspectRatio: "16 / 9",
          position: "relative",
          background: "#2F1810",
          overflow: "hidden",
        }}
      >
        <img
          src={profileBanner}
          alt="Vùng đất làng chài - Cảng cá Tam Quan"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(47,24,16,0.55) 100%)",
            display: "flex",
            alignItems: "flex-end",
            padding: 16,
          }}
        >
          <Box style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            <Box
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #FFD54F",
                backgroundColor: "#FFF",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
            >
              <img
                src={(userInfo && userInfo.avatar) || "./logo.png.png"}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150";
                }}
              />
            </Box>

            <Box style={{ flex: 1, color: "#FFF", overflow: "hidden" }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#FFD54F",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {(userInfo && (userInfo.fullName || userInfo.name)) ||
                  "Khách hàng Thuộc Cô Ba"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#E0E0E0",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                📞 {(userInfo && userInfo.phone) || "Chưa có số điện thoại"} • OCOP 4 Sao Gia Lai
              </Text>
            </Box>

            <Box
              onClick={onSyncZalo}
              style={{
                background: "#0068FF",
                color: "#FFF",
                fontSize: 11,
                padding: "7px 12px",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,104,255,0.4)",
                flexShrink: 0,
              }}
            >
              Đồng bộ Zalo
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Membership */}
      <Box style={{ padding: "0 16px", marginTop: -16, position: "relative", zIndex: 2 }}>
        <Box
          style={{
            background: "linear-gradient(135deg, #FFF8F0 0%, #F4EBE1 100%)",
            borderRadius: 14,
            padding: "14px 16px",
            border: "1.5px solid " + BAMBOO_BORDER,
            boxShadow: "0 4px 12px rgba(139,69,19,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box style={{ display: "flex", flexDirection: "column" }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: PRIMARY_COLOR,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "block",
              }}
            >
              Hạng thành viên
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#D97706",
                marginTop: 4,
                display: "block",
              }}
            >
              Khách hàng Thân Thiết
            </Text>
          </Box>
          <Box style={{ textAlign: "right", display: "flex", flexDirection: "column" }}>
            <Text style={{ fontSize: 10, color: "#666", display: "block" }}>
              Số đơn đã đặt
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: PRIMARY_COLOR,
                marginTop: 4,
                display: "block",
              }}
            >
              {myOrders.length} đơn
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Orders */}
      <Box style={{ padding: "16px 16px 0" }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: PRIMARY_COLOR,
            marginBottom: 10,
            display: "block",
          }}
        >
          📦 ĐƠN HÀNG CỦA TÔI
        </Text>

        <Box
          style={{
            background: "#FFF",
            borderRadius: 12,
            padding: "14px 6px",
            display: "flex",
            justifyContent: "space-around",
            border: "1.5px solid " + BAMBOO_BORDER,
            boxShadow: "0 2px 6px rgba(139,69,19,0.04)",
            overflowX: "auto",
          }}
        >
          {ORDER_STATUSES.map((item) => (
            <Box
              key={item.key}
              onClick={() =>
                onSelectOrderStatus &&
                onSelectOrderStatus(orderStatusFilter === item.key ? null : item.key)
              }
              style={{
                textAlign: "center",
                cursor: "pointer",
                flex: 1,
                minWidth: 64,
                padding: "4px 2px",
                borderRadius: 8,
                background: orderStatusFilter === item.key ? "#FCE7D5" : "transparent",
              }}
            >
              <Text style={{ fontSize: 18, marginBottom: 4, display: "block" }}>
                {item.icon}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#444",
                  display: "block",
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: PRIMARY_COLOR,
                  display: "block",
                  marginTop: 2,
                }}
              >
                {countByStatus(item.key)}
              </Text>
            </Box>
          ))}
        </Box>

        <Box style={{ marginTop: 12 }}>
          {visibleOrders.length === 0 ? (
            <Box
              style={{
                background: "#FFF",
                border: "1.5px dashed " + BAMBOO_BORDER,
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: "#888", display: "block" }}>
                {!myPhone
                  ? "Vui lòng cập nhật số điện thoại để xem đơn hàng của bạn."
                  : orderStatusFilter
                  ? "Chưa có đơn hàng nào ở trạng thái này."
                  : "Chưa có đơn hàng nào."}
              </Text>
            </Box>
          ) : (
            visibleOrders.map((order, idx) => {
              const currentStatus = normalizeStatus(order.status);
              const statusObj =
                ORDER_STATUSES.find((s) => s.key === currentStatus) ||
                ORDER_STATUSES[0];
              const total = order.total || order.finalTotal || 0;
              const allowModify = canModifyOrder(order);
              const remainMin = getRemainMinutes(order);

              return (
                <Box
                  key={order.id || idx}
                  style={{
                    background: "#FFF",
                    border: "1px solid " + BAMBOO_BORDER,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  }}
                >
                  <Box
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: PRIMARY_COLOR,
                        display: "block",
                      }}
                    >
                      Mã đơn: {order.id}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#666", display: "block" }}>
                      {order.date ||
                        (order.createdAt
                          ? new Date(order.createdAt).toLocaleString("vi-VN")
                          : "")}
                    </Text>
                  </Box>

                  <Box
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid #F4EBE1",
                      paddingTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#D97706",
                        display: "block",
                      }}
                    >
                      Tổng: {Number(total).toLocaleString("vi-VN")} đ
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color:
                          currentStatus === "cancelled"
                            ? "#DC2626"
                            : currentStatus === "completed"
                            ? "#16A34A"
                            : "#B45309",
                        display: "block",
                      }}
                    >
                      {statusObj.icon} {statusObj.label}
                    </Text>
                  </Box>

                  {currentStatus === "cancelled" && order.cancelReason && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#DC2626",
                        marginTop: 8,
                        display: "block",
                      }}
                    >
                      Lý do: {order.cancelReason}
                    </Text>
                  )}

                  {allowModify && (
                    <>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#9CA3AF",
                          marginTop: 8,
                          display: "block",
                        }}
                      >
                        Còn ~{remainMin} phút để hủy / đổi đơn
                      </Text>
                      <Box style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Box
                          onClick={() => openCancelModal(order)}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "1px solid #FCA5A5",
                            background: "#FEF2F2",
                            color: "#DC2626",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Hủy đơn
                        </Box>
                        <Box
                          onClick={() => handleChangeOrder(order)}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "1px solid " + BAMBOO_BORDER,
                            background: "#FFF7ED",
                            color: PRIMARY_COLOR,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Đổi đơn
                        </Box>
                      </Box>
                    </>
                  )}

                  {currentStatus === "pending" && !allowModify && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginTop: 8,
                        display: "block",
                      }}
                    >
                      Đã quá 2 giờ — không thể tự hủy/đổi. Liên hệ shop nếu cần hỗ trợ.
                    </Text>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Utilities */}
      <Box style={{ padding: "16px 16px 0" }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: PRIMARY_COLOR,
            marginBottom: 10,
            display: "block",
          }}
        >
          🛡️ TIỆN ÍCH & CAM KẾT
        </Text>
        <Box
          style={{
            background: "#FFF",
            borderRadius: 12,
            overflow: "hidden",
            border: "1.5px solid " + BAMBOO_BORDER,
            boxShadow: "0 2px 6px rgba(139,69,19,0.04)",
          }}
        >
          <Box
            onClick={handleOpenGoogleMap}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: "1px solid #F4EBE1",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>📍</Text>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#222", display: "block" }}>
                Địa chỉ kho hàng / Sản xuất
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 3, display: "block" }}>
                {WAREHOUSE_ADDRESS} (Bấm mở Google Maps)
              </Text>
            </Box>
            <Text style={{ fontSize: 14, color: "#999" }}>›</Text>
          </Box>

          <Box
            onClick={() => onFollowOA && onFollowOA(ZALO_OA_ID)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: "1px solid #F4EBE1",
              cursor: "pointer",
              background: "#FFF8F0",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>❤️</Text>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#D97706", display: "block" }}>
                {isFollowingOA
                  ? "Đã quan tâm Zalo OA"
                  : "Quan tâm Zalo OA (Nhận ưu đãi 5%)"}
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 3, display: "block" }}>
                Bấm để quan tâm OA và nhận ưu đãi giảm giá tự động
              </Text>
            </Box>
            <Box
              style={{
                background: "#0068FF",
                color: "#FFF",
                fontSize: 10,
                padding: "5px 10px",
                borderRadius: 6,
                fontWeight: "bold",
              }}
            >
              {isFollowingOA ? "Đã theo dõi" : "Quan tâm"}
            </Box>
          </Box>

          <Box
            onClick={() =>
              alert(
                "Chính sách Bảo hiểm đơn hàng: Hoàn tiền hoặc gửi bù miễn phí 100% khi có sự cố bể vỡ trong quá trình vận chuyển."
              )
            }
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: "1px solid #F4EBE1",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>🛡️</Text>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#222", display: "block" }}>
                Bảo hiểm đơn hàng
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 3, display: "block" }}>
                Cam kết bồi hoàn 100% nếu bể vỡ, thất lạc trong vận chuyển
              </Text>
            </Box>
            <Text style={{ fontSize: 14, color: "#999" }}>›</Text>
          </Box>

          <Box
            onClick={handleShowOcopCertificates}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: "1px solid #F4EBE1",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>🌿</Text>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#222", display: "block" }}>
                Tiêu chuẩn OCOP 4 SAO, HACCP
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 3, display: "block" }}>
                Nhấn để xem chứng nhận chất lượng & an toàn vệ sinh thực phẩm
              </Text>
            </Box>
            <Text style={{ fontSize: 14, color: "#999" }}>›</Text>
          </Box>

          <Box
            onClick={() => handleOpenZaloChat()}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>📞</Text>
            <Box style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#222", display: "block" }}>
                Hỗ trợ / Chat trực tiếp Zalo OA
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 3, display: "block" }}>
                Nhắn tin trực tiếp vào khung chat Zalo OA
              </Text>
            </Box>
            <Box
              style={{
                background: "#28A745",
                color: "#FFF",
                fontSize: 10,
                padding: "5px 10px",
                borderRadius: 6,
                fontWeight: "bold",
              }}
            >
              Chat ngay
            </Box>
          </Box>
        </Box>
      </Box>

      <Box style={{ textAlign: "center", marginTop: 24, padding: "0 16px" }}>
        <Text style={{ fontSize: 11, fontWeight: "bold", color: PRIMARY_COLOR, display: "block" }}>
          ĐẶC SẢN MẮM TRUYỀN THỐNG THUỘC CÔ BA
        </Text>
        <Text style={{ fontSize: 10, color: "#888", marginTop: 4, display: "block" }}>
          Tinh hoa mắm Việt – Đậm đà hương vị quê hương miền Trung
        </Text>
      </Box>

      {/* Modal hủy đơn */}
      {cancelOrder && (
        <Box
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => !cancelling && setCancelOrder(null)}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#FFF",
              borderRadius: "20px 20px 0 0",
              padding: "20px 16px 28px",
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.12)",
            }}
          >
            {/* Handle bar */}
            <Box
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "#E5E7EB",
                margin: "0 auto 16px",
              }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#111827",
                display: "block",
                textAlign: "center",
              }}
            >
              Hủy đơn hàng
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#6B7280",
                display: "block",
                textAlign: "center",
                marginTop: 4,
                marginBottom: 6,
              }}
            >
              {cancelOrder.id}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#B45309",
                display: "block",
                textAlign: "center",
                marginBottom: 16,
                fontWeight: 600,
              }}
            >
              Còn ~{getRemainMinutes(cancelOrder)} phút để hủy
            </Text>

            {CANCEL_REASONS.map((r) => {
              const active = cancelReason === r;
              return (
                <Box
                  key={r}
                  onClick={() => setCancelReason(r)}
                  style={{
                    padding: "13px 14px",
                    borderRadius: 12,
                    marginBottom: 8,
                    border: active ? "1.5px solid #8B4513" : "1px solid #E5E7EB",
                    background: active ? "#FFF7ED" : "#FAFAFA",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Box
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: active ? "5px solid #8B4513" : "1.5px solid #D1D5DB",
                      flexShrink: 0,
                      boxSizing: "border-box",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#1F2937",
                      fontWeight: active ? 700 : 500,
                      display: "block",
                    }}
                  >
                    {r}
                  </Text>
                </Box>
              );
            })}

            <Box style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Box
                onClick={() => !cancelling && setCancelOrder(null)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "14px 0",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  background: "#FFF",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Đóng
              </Box>
              <Box
                onClick={!cancelling && cancelReason ? submitCancel : undefined}
                style={{
                  flex: 1.2,
                  textAlign: "center",
                  padding: "14px 0",
                  borderRadius: 12,
                  background: !cancelReason || cancelling ? "#FECACA" : "#DC2626",
                  color: "#FFF",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: !cancelReason || cancelling ? "not-allowed" : "pointer",
                  boxShadow:
                    !cancelReason || cancelling
                      ? "none"
                      : "0 4px 12px rgba(220,38,38,0.35)",
                }}
              >
                {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}