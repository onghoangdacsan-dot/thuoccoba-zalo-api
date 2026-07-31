// ===================== DỮ LIỆU TĨNH =====================
// Ghi chú: id sản phẩm đã được đánh lại liên tục (1..11) để tránh đứt quãng
// gây khó theo dõi khi thêm/sửa dữ liệu sau này.

export const CATEGORIES = [
  { id: 1, name: "Tất cả", icon: "🔥" },
  { id: 2, name: "Mắm mực", icon: "🦑" },
  { id: 3, name: "Mắm ruốc muối xổi", icon: "🦐" },
  { id: 4, name: "Mắm nhỉ", icon: "🍶" },
  { id: 5, name: "Mắm khác", icon: "🫙" }
];

export const PRODUCTS = [
  {
    id: 1,
    name: "Mắm mực hũ 500g",
    category: "Mắm mực",
    displayPrice: "85.000 đ",
    price: 85000,
    rating: "4.9",
    sold: "1.2k",
    isBestSeller: true,
    tag: "OCOP 4★",
    desc: "Mắm mực chính gốc Bình Định, làm từ mực tươi vùng biển Tam Quan, tẩm ướp gia vị bí truyền, không chất bảo quản.",
    usage: "Dùng trực tiếp chấm thịt luộc, dưa leo, rau sống hoặc ăn với cơm nóng.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-muc.jpg"
  },
  {
    id: 2,
    name: "Mắm mực hũ 1kg",
    category: "Mắm mực",
    displayPrice: "170.000 đ",
    price: 170000,
    rating: "4.9",
    sold: "980",
    isBestSeller: false,
    tag: "Bán chạy",
    desc: "Hũ mắm mực 1kg tiện dụng, phù hợp gia đình đông người hoặc làm quà biếu.",
    usage: "Chấm rau luộc, thịt luộc, rim tóp mỡ hoặc kho cá.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-muc.jpg"
  },
  {
    id: 3,
    name: "2 hũ mắm mực 500g tặng mắm cái",
    category: "Mắm mực",
    displayPrice: "170.000 đ",
    price: 170000,
    rating: "5.0",
    sold: "1.5k",
    isBestSeller: false,
    tag: "Combo hot",
    desc: "Combo 2 hũ mắm mực 500g + tặng kèm mắm cái cá cơm nguyên con.",
    usage: "Mắm mực dùng chấm hoặc rim. Mắm cái pha nước chấm.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/11/2-hu-mam-muc-1kg-tang-mam-cai.jpg"
  },
  {
    id: 4,
    name: "Mắm ruốc muối xổi hũ 500g",
    category: "Mắm ruốc muối xổi",
    displayPrice: "80.000 đ",
    price: 80000,
    rating: "4.8",
    sold: "2.1k",
    isBestSeller: true,
    tag: "Bán chạy",
    desc: "Mắm ruốc muối xổi Bình Định, ruốc tươi 90% + muối hột biển 10%.",
    usage: "Pha chanh tỏi ớt chấm xoài, cóc, dưa leo. Xào thịt ba chỉ.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-ruoc-muoi-xoi-hu-500g.jpg"
  },
  {
    id: 5,
    name: "Mắm ruốc muối xổi 2 hũ 500g tặng mạch nha",
    category: "Mắm ruốc muối xổi",
    displayPrice: "160.000 đ",
    price: 160000,
    rating: "4.9",
    sold: "1.1k",
    isBestSeller: false,
    tag: "Combo",
    desc: "Combo 2 hũ mắm ruốc muối xổi 500g + tặng mạch nha.",
    usage: "Dùng chấm rau sống, xào thịt hoặc pha nước chấm.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/11/mam-ruoc-muoi-xoi-2-hu-500g-tang-mach-nha.jpg"
  },
  {
    id: 6,
    name: "Mắm nêm cá cơm xay 500ml",
    category: "Mắm khác",
    displayPrice: "49.000 đ",
    price: 49000,
    rating: "4.7",
    sold: "1.8k",
    isBestSeller: false,
    tag: "Giá tốt",
    desc: "Mắm nêm cá cơm xay mịn, vị đậm đà đặc trưng miền Trung.",
    usage: "Pha tỏi ớt thơm đường chanh thành nước chấm bún, bánh tráng.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-cai-ca-com-1.jpg"
  },
  {
    id: 7,
    name: "Mắm cái cá cơm nguyên con 380ml",
    category: "Mắm khác",
    displayPrice: "39.000 đ",
    price: 39000,
    rating: "4.8",
    sold: "1.4k",
    isBestSeller: false,
    tag: "OCOP",
    desc: "Mắm cái cá cơm nguyên con, màu nâu cánh gián, hậu ngọt thanh.",
    usage: "Pha nước chấm bún thịt nướng, bánh tráng cuốn, chấm rau luộc.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-cai-ca-com-1.jpg"
  },
  {
    id: 8,
    name: "Nước mắm nhỉ cá cơm chai 450ml",
    category: "Mắm nhỉ",
    displayPrice: "60.000 đ",
    price: 60000,
    rating: "5.0",
    sold: "2.5k",
    isBestSeller: true,
    tag: "OCOP 4★",
    desc: "Nước mắm nhỉ nguyên chất từ cá cơm than, độ đạm cao, màu vàng óng.",
    usage: "Dùng chấm trực tiếp hoặc nêm nếm món kho, canh, xào.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/11/nuoc-mam-nhi-ca-com-chai-450ml.jpg"
  },
  {
    id: 9,
    name: "Thùng 5 chai nước mắm nhỉ 950ml tặng 1 chai 450ml",
    category: "Mắm nhỉ",
    displayPrice: "740.000 đ",
    price: 740000,
    rating: "4.9",
    sold: "420",
    isBestSeller: false,
    tag: "Combo lớn",
    desc: "Thùng 5 chai nước mắm nhỉ 950ml + tặng 1 chai 450ml.",
    usage: "Nêm nếm và chấm hàng ngày.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-nhi-thuoc-co-ba-1.jpg"
  },
  {
    id: 10,
    name: "Combo 1kg mắm ruốc + 500g mắm mực (tặng mắm nêm)",
    category: "Mắm khác",
    displayPrice: "240.000 đ",
    price: 240000,
    rating: "4.9",
    sold: "650",
    isBestSeller: false,
    tag: "Combo hot",
    desc: "Combo 1kg mắm ruốc + 500g mắm mực + tặng mắm nêm.",
    usage: "Mắm ruốc xào/chấm, mắm mực chấm/rim, mắm nêm pha nước chấm.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-ruoc-muoi-xoi-hu-500g.jpg"
  },
  {
    id: 11,
    name: "Combo 4 loại mắm (mực + cái + nhĩ + nêm)",
    category: "Mắm khác",
    displayPrice: "240.000 đ",
    price: 240000,
    rating: "5.0",
    sold: "490",
    isBestSeller: false,
    tag: "Full set",
    desc: "Combo đầy đủ 4 loại mắm đặc sản Bình Định.",
    usage: "Đủ mọi nhu cầu: chấm, nêm, pha nước chấm, làm quà biếu.",
    image: "https://thuoccoba.com/wp-content/uploads/2025/09/mam-muc.jpg"
  }
];

export const BANNERS = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1606914469633-bd39206ea739?w=800",
    badge: "Chuẩn OCOP 4★",
    title: "Tinh hoa Đất Võ",
    highlight: "Mắm thủ công 100% từ biển Bình Định"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800",
    badge: "ATVSTP & HACCP",
    title: "Hương vị truyền thống",
    highlight: "Cam kết nguyên chất – không chất bảo quản"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    badge: "Đặc sản Tam Quan",
    title: "Quà biếu thượng hạng",
    highlight: "Đậm đà hương vị quê hương"
  }
];
