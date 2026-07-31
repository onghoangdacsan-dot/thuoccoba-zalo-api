// ===================== STORAGE UTILS =====================
// Bọc localStorage trong try/catch vì:
// - Một số webview (kể cả trong Zalo) có thể chặn localStorage.
// - Người dùng có thể bật chế độ duyệt web riêng tư.
// Nếu bạn dùng zmp-sdk, có thể thay 2 hàm bên dưới bằng:
//   import { getStorage, setStorage } from "zmp-sdk/apis";
// để lưu trên Cloud Storage của Zalo (đồng bộ nhiều thiết bị).

const PREFIX = "thuoccoba_";

export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[storage] Không đọc được key "${key}":`, err);
    return fallback;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] Không lưu được key "${key}":`, err);
    return false;
  }
}

export function removeState(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    console.warn(`[storage] Không xoá được key "${key}":`, err);
  }
}
