// ===================== VALIDATION =====================

// Số điện thoại VN: 10 số, bắt đầu bằng 0 (hoặc +84 rồi 9 số)
const PHONE_REGEX = /^(0\d{9}|\+84\d{9})$/;

export function validateShippingInfo({ fullName, phone, address }) {
  const errors = {};

  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = "Vui lòng nhập họ tên đầy đủ (tối thiểu 2 ký tự).";
  }

  const cleanedPhone = (phone || "").trim().replace(/[\s.-]/g, "");
  if (!PHONE_REGEX.test(cleanedPhone)) {
    errors.phone = "Số điện thoại không hợp lệ (VD: 0905123456).";
  }

  if (!address || address.trim().length < 8) {
    errors.address = "Vui lòng nhập địa chỉ giao hàng chi tiết hơn.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
