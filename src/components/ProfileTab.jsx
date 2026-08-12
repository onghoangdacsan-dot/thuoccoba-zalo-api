import React from "react";
import { Box, Text } from "zmp-ui";
import { openChat, openWebview } from "zmp-sdk/apis";
import profileBanner from "../assets/banners/banner-profile.jpg";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";
const ZALO_OA_ID = "1624808365073207434";
const WAREHOUSE_ADDRESS = "1117/5 Võ Nguyên Giáp, Hoài Nhơn, Gia Lai";

const ORDER_STATUSES = [
  { key: "pending", icon: "⏳", label: "Chờ xác nhận" },
  { key: "preparing", icon: "📦", label: "Đang chuẩn bị" },
  { key: "shipping", icon: "🚚", label: "Đang giao" },
  { key: "completed", icon: "✅", label: "Đã giao" },
];

export default function ProfileTab({
  userInfo,
  onSyncZalo,
  isFollowingOA,
  onFollowOA,
  orderHistory = [],
  orderStatusFilter,
  onSelectOrderStatus,
}) {
  const myPhone = (userInfo && userInfo.phone ? String(userInfo.phone) : "").trim();
  const myId = userInfo && userInfo.id ? String(userInfo.id) : "";

  // Chỉ lấy đơn của chính user hiện tại
  const myOrders = (orderHistory || []).filter((order) => {
    if (!order) return false;

    if (order.userId && myId) {
      return String(order.userId) === myId;
    }

    const orderPhone =
      order.shippingInfo && order.shippingInfo.phone
        ? String(order.shippingInfo.phone).trim()
        : "";

    if (myPhone && orderPhone) {
      return orderPhone === myPhone;
    }

    // Không đủ thông tin để khớp → không hiện (tránh lộ đơn người khác)
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
        fail: () => {
          window.open(mapUrl, "_blank");
        },
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

  const handleOpenZaloChat = () => {
    try {
      openChat({
        type: "oa",
        id: ZALO_OA_ID,
        success: () => {},
        fail: () => {
          try {
            openWebview({
              url: "https://zalo.me/" + ZALO_OA_ID,
              success: () => {},
              fail: () => {
                window.open("https://zalo.me/" + ZALO_OA_ID, "_blank");
              },
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
    if (
      !status ||
      status === "pending" ||
      status === "Đang xử lý" ||
      status === "Chờ xác nhận" ||
      status === "cho_xac_nhan" ||
      status === "waiting"
    ) {
      return "pending";
    }
    if (
      status === "preparing" ||
      status === "Đang chuẩn bị" ||
      status === "dang_chuan_bi"
    ) {
      return "preparing";
    }
    if (
      status === "shipping" ||
      status === "Đang giao" ||
      status === "dang_giao"
    ) {
      return "shipping";
    }
    if (
      status === "completed" ||
      status === "Đã giao" ||
      status === "delivered" ||
      status === "da_giao"
    ) {
      return "completed";
    }
    return "pending";
  };

  const countByStatus = (statusKey) =>
    myOrders.filter((o) => normalizeStatus(o.status) === statusKey).length;

  const visibleOrders = orderStatusFilter
    ? myOrders.filter((o) => normalizeStatus(o.status) === orderStatusFilter)
    : myOrders;

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
            padding: "14px 8px",
            display: "flex",
            justifyContent: "space-around",
            border: "1.5px solid " + BAMBOO_BORDER,
            boxShadow: "0 2px 6px rgba(139,69,19,0.04)",
          }}
        >
          {ORDER_STATUSES.map((item) => (
            <Box
              key={item.key}
              onClick={() =>
                onSelectOrderStatus &&
                onSelectOrderStatus(
                  orderStatusFilter === item.key ? null : item.key
                )
              }
              style={{
                textAlign: "center",
                cursor: "pointer",
                flex: 1,
                padding: "4px 0",
                borderRadius: 8,
                background:
                  orderStatusFilter === item.key ? "#FCE7D5" : "transparent",
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 4, display: "block" }}>
                {item.icon}
              </Text>
              <Text
                style={{
                  fontSize: 10,
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
              <Text style={{ fontSize: 12, color: "#888" }}>
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

              return (
                <Box
                  key={order.id || idx}
                  style={{
                    background: "#FFF",
                    border: "1px solid " + BAMBOO_BORDER,
                    borderRadius: 10,
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
                      }}
                    >
                      Mã đơn: {order.id}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#666" }}>
                      {order.date ||
                        (order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                          : "")}
                    </Text>
                  </Box>

                  <Box
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid #F4EBE1",
                      paddingTop: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#D97706",
                      }}
                    >
                      Tổng: {Number(total).toLocaleString()} đ
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#16A34A",
                      }}
                    >
                      {statusObj.icon} {statusObj.label}
                    </Text>
                  </Box>
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
            onClick={handleOpenZaloChat}
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
    </Box>
  );
}