import React, { useEffect, useState } from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY = "#8B4513";
const ORANGE = "#C45C26";
const CREAM = "#FFF9F3";
const GOLD = "#E8B84A";
const ZALO_OA_ID = "1624808365073207434";

// Ảnh xe máy giao hàng (có thể đổi URL logo/ảnh shop)
const MOTO_IMG =
  "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80";

export default function ShippingNoticeModal({
  visible,
  onClose,
  isFollowingOA = false,
  onFollowOA,
}) {
  const [show, setShow] = useState(false);
  const [anim, setAnim] = useState("in");

  useEffect(() => {
    if (visible) {
      setShow(true);
      setAnim("in");
    }
  }, [visible]);

  const handleClose = () => {
    setAnim("out");
    setTimeout(() => {
      setShow(false);
      onClose?.();
    }, 280);
  };

  const handleFollow = (e) => {
    e?.stopPropagation?.();
    if (typeof onFollowOA === "function") onFollowOA(ZALO_OA_ID);
  };

  if (!show) return null;

  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background:
          anim === "in" ? "rgba(40, 22, 10, 0.8)" : "rgba(40, 22, 10, 0)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 16px 20px",
        boxSizing: "border-box",
        transition: "background 0.28s ease",
      }}
    >
      <style>{`
        @keyframes noticePopIn {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes noticePopOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9) translateY(12px); }
        }
      `}</style>

      <Box
        style={{
          width: "100%",
          maxWidth: 340,
          maxHeight: "86vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          borderRadius: 14,
          border: `3px solid ${ORANGE}`,
          background: CREAM,
          boxShadow: "0 16px 40px rgba(139,69,19,0.35)",
          animation:
            anim === "in"
              ? "noticePopIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards"
              : "noticePopOut 0.25s ease forwards",
        }}
      >
        <Box style={{ margin: 4, border: `1.5px solid ${ORANGE}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Logo */}
          <Box style={{ textAlign: "center", padding: "14px 12px 8px" }}>
            <Box
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${PRIMARY}, ${ORANGE})`,
                borderRadius: 999,
                padding: "8px 16px",
                border: `2px solid ${GOLD}`,
                boxShadow: "0 4px 12px rgba(139,69,19,0.25)",
              }}
            >
              <Text style={{ fontSize: 16, display: "block" }}>🫙</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#FFF",
                  display: "block",
                  whiteSpace: "nowrap",
                }}
              >
                Thuộc Cô Ba
              </Text>
            </Box>
            <Text
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: ORANGE,
                display: "block",
                marginTop: 8,
                letterSpacing: 0.8,
              }}
            >
              OCOP 4 SAO · MẮM TRUYỀN THỐNG
            </Text>
          </Box>

          {/* Title */}
          <Box style={{ textAlign: "center", padding: "4px 14px 10px" }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: PRIMARY,
                display: "block",
                lineHeight: 1.2,
              }}
            >
              GIAO HÀNG MIỄN PHÍ
            </Text>
          </Box>

          <Box style={{ padding: "0 10px 10px" }}>
            <Box
              style={{
                background: ORANGE,
                borderRadius: 8,
                padding: "8px 10px",
                textAlign: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFF",
                  display: "block",
                  lineHeight: 1.4,
                }}
              >
                Phạm vi bán kính từ 2 km quanh cửa hàng
              </Text>
            </Box>
          </Box>

          {/* Zones + moto */}
          <Box
            style={{
              display: "flex",
              gap: 8,
              padding: "0 12px 12px",
              alignItems: "stretch",
            }}
          >
            <Box style={{ flex: 1, minWidth: 0 }}>
              {[
                {
                  title: "Bán kính từ 2 km",
                  sub: "Freeship · giao trong ngày",
                },
                {
                  title: "Gia Lai & Bình Định",
                  sub: "Giao nhanh 1–2 ngày",
                },
                {
                  title: "Toàn quốc",
                  sub: "COD · freeship đơn từ 500k",
                },
              ].map((row) => (
                <Box
                  key={row.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#FFF",
                    borderRadius: 10,
                    padding: "8px 10px",
                    marginBottom: 6,
                    border: "1px solid #F0E0D0",
                  }}
                >
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: ORANGE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#FFF", display: "block" }}>📍</Text>
                  </Box>
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: PRIMARY,
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#7A6A5A",
                        display: "block",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.sub}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Ảnh xe vận chuyển hàng */}
            <Box
              style={{
                width: 108,
                flexShrink: 0,
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${ORANGE}`,
                background: "#FFF",
                position: "relative",
              }}
            >
              <img
                src={MOTO_IMG}
                alt="Giao hàng"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 120,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <Box
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(transparent, rgba(139,69,19,0.85))",
                  padding: "8px 6px 6px",
                  textAlign: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#FFF",
                    display: "block",
                  }}
                >
                  Giao nhanh
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Lưu ý */}
          <Box style={{ padding: "0 12px 10px" }}>
            <Box
              style={{
                background: "#FFF",
                borderRadius: 10,
                padding: "9px 11px",
                border: `1px dashed ${ORANGE}`,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: "#5C4033",
                  lineHeight: 1.45,
                  display: "block",
                }}
              >
                <Text style={{ fontWeight: 800, color: ORANGE }}>Lưu ý: </Text>
                Vận chuyển trong và ngoài nước
              </Text>
            </Box>
          </Box>

          {/* OA — 1 dòng, không rớt chữ */}
          <Box style={{ padding: "0 12px 12px" }}>
            {!isFollowingOA ? (
              <Box
                onClick={handleFollow}
                style={{
                  background: "#0068FF",
                  borderRadius: 10,
                  padding: "12px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#FFF",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Quan tâm OA · Nhận ưu đãi
                </Text>
              </Box>
            ) : (
              <Box
                style={{
                  background: "#ECFDF5",
                  borderRadius: 10,
                  padding: "11px 10px",
                  textAlign: "center",
                  border: "1px solid #6EE7B7",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#065F46",
                    display: "block",
                  }}
                >
                  ✓ Đã quan tâm Zalo OA
                </Text>
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box
            style={{
              background: `linear-gradient(90deg, ${PRIMARY}, ${ORANGE})`,
              padding: "12px 14px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#FFF",
                display: "block",
                whiteSpace: "nowrap",
              }}
            >
              Cảm ơn quý khách đã tin tưởng
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: GOLD,
                fontWeight: 700,
                display: "block",
                marginTop: 3,
              }}
            >
              Mắm Thuộc Cô Ba
            </Text>
          </Box>
        </Box>
      </Box>

      <Box
        onClick={handleClose}
        style={{
          marginTop: 14,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "#FFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 24, color: "#333", display: "block", lineHeight: 1 }}>×</Text>
      </Box>
    </Box>
  );
}