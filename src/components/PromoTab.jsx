import React, { useState } from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513";
const BAMBOO_BORDER = "#DEB887";

export default function PromoTab() {
  // Trạng thái lưu mã
  const [copiedCode, setCopiedCode] = useState(null);

  const handleSaveVoucher = (code) => {
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const vouchers = [
    {
      id: 1,
      code: "COBAFREESHIP",
      title: "Miễn phí vận chuyển",
      desc: "Tự động áp dụng cho đơn hàng từ 500.000 đ",
      badge: "TỰ ĐỘNG",
      color: "#16A34A"
    },
    {
      id: 2,
      code: "COBAWELCOME",
      title: "Giảm 15.000 đ đơn đầu tiên",
      desc: "Dành cho khách hàng mới mua lần đầu tại Thuộc Cô Ba",
      badge: "MỚI",
      color: "#D97706"
    },
    {
      id: 3,
      code: "COBAVIP50",
      title: "Giảm 50.000 đ đơn từ 1.000.000 đ",
      desc: "Áp dụng cho khách mua sỉ hoặc đơn hàng lớn",
      badge: "VIP",
      color: "#DC2626"
    }
  ];

  return (
    <Box style={{ padding: 16, paddingBottom: 60, boxSizing: "border-box", width: "100%", overflowX: "hidden" }}>
      
      {/* Tiêu đề */}
      <Box style={{ marginBottom: 12, textAlign: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: 900, color: PRIMARY_COLOR, display: "block" }}>
          🎁 KHO ƯU ĐÃI & KHUYẾN MÃI
        </Text>
        <Text style={{ fontSize: 11, color: "#666", marginTop: 2, display: "block" }}>
          Săn mã giảm giá và tận hưởng đặc quyền mua sắm tại Thuộc Cô Ba
        </Text>
      </Box>

      {/* Banner ưu đãi hoành tráng chiếm tỷ lệ lớn (chiều cao lớn, lấp đầy khoảng trống) */}
      <Box style={{
        width: "100%", 
        minHeight: 260, 
        borderRadius: 16, 
        overflow: "hidden",
        marginBottom: 16, 
        position: "relative", 
        boxShadow: "0 6px 16px rgba(139, 69, 19, 0.15)",
        background: "linear-gradient(135deg, #4A2E18 0%, #8B4513 50%, #D97706 100%)",
        display: "flex", 
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 20, 
        boxSizing: "border-box",
        border: "2px solid #FDE68A"
      }}>
        {/* Phần nhãn trên banner */}
        <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ 
            fontSize: 10, fontWeight: "bold", background: "#FEF3C7", color: "#92400E", 
            padding: "4px 10px", borderRadius: 20, letterSpacing: "0.5px" 
          }}>
            🌟 ĐẶC QUYỀN ĐẶC SẢN
          </Text>
          <Text style={{ fontSize: 10, color: "#FEF3C7", fontStyle: "italic" }}>
            Số lượng có hạn
          </Text>
        </Box>

        {/* Nội dung chính banner */}
        <Box style={{ textAlign: "center", margin: "10px 0" }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#FFF", marginBottom: 6, display: "block", lineHeight: 1.3 }}>
            SIÊU HỘI MẮM NGON <br/> GIẢM SÂU THẢ GA
          </Text>
          <Text style={{ fontSize: 12, color: "#FEF3C7", display: "block", lineHeight: 1.4, padding: "0 10px" }}>
            Tận hưởng hương vị truyền thống đậm đà chuẩn vị quê nhà cùng chuỗi ưu đãi độc quyền lên đến <strong style={{ color: "#FDE68A" }}>50.000 đ</strong> mỗi ngày!
          </Text>
        </Box>

        {/* Nút hành động kêu gọi trên banner */}
        <Box style={{ display: "flex", justifyContent: "center" }}>
          <Box 
            onClick={() => {
              const el = document.getElementById("voucher-list-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              background: "#FFF", color: PRIMARY_COLOR, padding: "8px 20px",
              borderRadius: 20, fontSize: 11, fontWeight: "900", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
            }}
          >
            XEM VÀ LƯU MÃ NGAY 👇
          </Box>
        </Box>
      </Box>

      {/* Danh sách mã giảm giá */}
      <div id="voucher-list-section">
        <Text style={{ fontSize: 14, fontWeight: "900", color: PRIMARY_COLOR, marginBottom: 10, display: "block" }}>
          🏷️ Danh Sách Mã Giảm Giá
        </Text>
      </div>

      <Box style={{ display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box", width: "100%" }}>
        {vouchers.map((v) => (
          <Box
            key={v.id}
            style={{
              background: "#FFF", borderRadius: 12, border: `1px solid ${BAMBOO_BORDER}`,
              display: "flex", overflow: "hidden", boxSizing: "border-box", width: "100%",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
            }}
          >
            {/* Cột trái nhãn mã voucher */}
            <Box style={{
              width: 115, background: v.color, color: "#FFF", display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 4px", textAlign: "center", flexShrink: 0
            }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", background: "rgba(0,0,0,0.2)", padding: "2px 5px", borderRadius: 4, marginBottom: 4, display: "block" }}>
                {v.badge}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: "-0.5px", whiteSpace: "nowrap", display: "block" }}>
                {v.code}
              </Text>
            </Box>

            {/* Cột phải chi tiết */}
            <Box style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
              <Box>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 4, display: "block" }}>
                  {v.title}
                </Text>
                <Text style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block", wordBreak: "break-word" }}>
                  {v.desc}
                </Text>
              </Box>

              <Box style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <Box
                  onClick={() => handleSaveVoucher(v.code)}
                  style={{
                    background: copiedCode === v.code ? "#16A34A" : "#F4EBE1",
                    color: copiedCode === v.code ? "#FFF" : PRIMARY_COLOR,
                    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: "bold",
                    cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {copiedCode === v.code ? "Đã lưu mã ✓" : "Lưu mã"}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

    </Box>
  );
}