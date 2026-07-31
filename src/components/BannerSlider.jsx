import React, { useState, useEffect } from "react";
import { Box, Text } from "zmp-ui";

const PRIMARY_COLOR = "#8B4513"; // Màu chủ đạo phong cách mộc / OCOP

export default function BannerSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Danh sách các banner: Ảnh sắc nét kết hợp thông điệp cam kết & vận chuyển siêu tốc
  const banners = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
      tag: "CAM KẾT VÀNG",
      title: "100% NGUYÊN CHẤT",
      subtitle: "Cam kết không chất bảo quản – An toàn tuyệt đối cho sức khỏe gia đình bạn.",
      bgColor: "linear-gradient(135deg, #2D5A27 0%, #4A7C59 100%)", // Xanh tự nhiên, uy tín
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
      tag: "GIAO HÀNG HỎA TỐC",
      title: "VẬN CHUYỂN SIÊU TỐC",
      subtitle: "Nhận hàng nhanh chóng tận tay – Đảm bảo chất lượng nguyên vẹn tới khách hàng.",
      bgColor: "linear-gradient(135deg, #8B4513 0%, #D2691E 100%)", // Màu nâu ấm cúng, đặc sản
    }
  ];

  // Tự động chạy slide chuyển đổi qua lại giữa các banner sau mỗi 4 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <Box style={{ width: "100%", padding: "0 16px", marginBottom: 16, marginTop: 8 }}>
      {/* Khung chứa Banner chính */}
      <Box 
        style={{
          position: "relative",
          width: "100%",
          height: 160,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          background: banners[currentSlide].bgColor,
          display: "flex",
          alignItems: "center"
        }}
      >
        {/* Ảnh nền sắc nét có hiệu ứng phủ màu làm nổi bật chữ */}
        <img 
          src={banners[currentSlide].image} 
          alt={banners[currentSlide].title}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "55%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.85,
            mixBlendMode: "luminosity" // Làm cho ảnh hài hòa với màu nền gradient thương hiệu
          }}
        />

        {/* Lớp phủ chuyển màu gradient nhẹ bên trái để chữ hiển thị cực kỳ rõ nét */}
        <Box style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "75%",
          height: "100%",
          background: "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
          zIndex: 1
        }} />

        {/* Nội dung thông điệp trên banner */}
        <Box style={{ position: "relative", zIndex: 2, padding: "0 16px", width: "70%" }}>
          <Box style={{ 
            display: "inline-block", 
            background: "#FFD700", 
            color: "#333", 
            fontSize: 9, 
            fontWeight: "900", 
            padding: "3px 8px", 
            borderRadius: 4, 
            marginBottom: 6,
            letterSpacing: 0.5
          }}>
            {banners[currentSlide].tag}
          </Box>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFF", lineHeight: 1.2, marginBottom: 4, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
            {banners[currentSlide].title}
          </Text>
          <Text style={{ fontSize: 11, color: "#F3F4F6", lineHeight: 1.3, fontWeight: "500", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {banners[currentSlide].subtitle}
          </Text>
        </Box>

        {/* Các dấu chấm chỉ mục chuyển slide (Dots indicator) */}
        <Box style={{ 
          position: "absolute", 
          bottom: 8, 
          right: 12, 
          zIndex: 3, 
          display: "flex", 
          gap: 4 
        }}>
          {banners.map((_, index) => (
            <Box 
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: currentSlide === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: currentSlide === index ? "#FFD700" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}