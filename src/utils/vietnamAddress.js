// Lấy dữ liệu Tỉnh/Thành + Phường/Xã trực tiếp từ API mở, đã cập nhật
// theo mô hình chính quyền 2 cấp (34 tỉnh/thành, có hiệu lực từ 01/07/2025).
// Không hardcode dữ liệu tĩnh để luôn khớp với thay đổi hành chính mới nhất.

const API_BASE = "https://provinces.open-api.vn/api/v2";

// Cache đơn giản trong bộ nhớ để tránh gọi lại API nhiều lần trong 1 phiên
let provincesCache = null;
const wardsCacheByProvince = new Map();

export async function fetchProvinces() {
  if (provincesCache) return provincesCache;
  try {
    const res = await fetch(`${API_BASE}/p/`);
    if (!res.ok) throw new Error("Không lấy được danh sách tỉnh/thành");
    const data = await res.json();
    // Chuẩn hóa: { code, name }
    provincesCache = data.map((p) => ({ code: p.code, name: p.name }));
    return provincesCache;
  } catch (err) {
    console.error("fetchProvinces error:", err);
    return [];
  }
}

export async function fetchWardsByProvince(provinceCode) {
  if (!provinceCode) return [];
  if (wardsCacheByProvince.has(provinceCode)) {
    return wardsCacheByProvince.get(provinceCode);
  }
  try {
    const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
    if (!res.ok) throw new Error("Không lấy được danh sách phường/xã");
    const data = await res.json();
    const wards = (data.wards || []).map((w) => ({
      code: w.code,
      name: w.name,
    }));
    wardsCacheByProvince.set(provinceCode, wards);
    return wards;
  } catch (err) {
    console.error("fetchWardsByProvince error:", err);
    return [];
  }
}