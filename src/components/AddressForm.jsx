import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, Page, useSnackbar } from "zmp-ui";
import { getUserInfo, getPhoneNumber, getAccessToken } from "zmp-sdk/apis";
import { fetchProvinces, fetchWardsByProvince } from "../utils/vietnamAddress";

const PRIMARY_COLOR = "#8B4513";
const ACCENT_COLOR = "#E05638";
const BORDER_COLOR = "#E5E7EB";

const API = "https://thuoccoba-zalo-api-production.up.railway.app";

function buildFullAddress(detailAddress, wardName, provinceName) {
  return [detailAddress, wardName, provinceName]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ");
}

export default function AddressForm({ initialAddress, onSave, onClose }) {
  const { openSnackbar } = useSnackbar();

  const [fullName, setFullName] = useState(initialAddress?.fullName || "");
  const [phone, setPhone] = useState(initialAddress?.phone || "");
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(
    initialAddress?.provinceCode ? String(initialAddress.provinceCode) : ""
  );
  const [selectedWard, setSelectedWard] = useState(
    initialAddress?.wardCode ? String(initialAddress.wardCode) : ""
  );
  const [detailAddress, setDetailAddress] = useState(
    initialAddress?.detailAddress || ""
  );
  const [isDefault, setIsDefault] = useState(initialAddress?.isDefault ?? true);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingProvinces(true);
    fetchProvinces().then((list) => {
      if (mounted) {
        setProvinces(Array.isArray(list) ? list : []);
        setLoadingProvinces(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      return;
    }
    let mounted = true;
    setLoadingWards(true);
    fetchWardsByProvince(selectedProvince).then((list) => {
      if (mounted) {
        setWards(Array.isArray(list) ? list : []);
        setLoadingWards(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedProvince]);

  const handleRequestZaloInfo = useCallback(() => {
    openSnackbar({ type: "info", text: "Đang lấy thông tin từ Zalo..." });

    try {
      getUserInfo({
        success: (data) => {
          const zaloUser = data?.userInfo;
          if (zaloUser?.name) setFullName(zaloUser.name);
        },
        fail: (err) => {
          console.warn("getUserInfo fail:", err);
        },
      });
    } catch (err) {
      console.warn(err);
    }

    try {
      getPhoneNumber({
        success: async (res) => {
          try {
            const accessToken = await new Promise((resolve) => {
              getAccessToken({
                success: (token) => resolve(token),
                fail: () => resolve(null),
              });
            });

            const response = await fetch(`${API}/api/get-phone-number`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: res.token, accessToken }),
            });
            const result = await response.json();
            if (result?.phoneNumber || result?.phone) {
              setPhone(result.phoneNumber || result.phone);
              openSnackbar({ type: "success", text: "Đã lấy số điện thoại từ Zalo!" });
            } else {
              openSnackbar({
                type: "error",
                text: result?.error || "Không giải mã được số điện thoại",
              });
            }
          } catch (err) {
            openSnackbar({ type: "error", text: "Lỗi khi gọi server: " + err.message });
          }
        },
        fail: (err) => {
          openSnackbar({
            type: "error",
            text: "Không lấy được SĐT. Vui lòng nhập thủ công.",
          });
          console.warn("getPhoneNumber fail:", err);
        },
      });
    } catch (err) {
      openSnackbar({ type: "error", text: err.message });
    }
  }, [openSnackbar]);

  const handleSubmit = () => {
    if (!fullName.trim()) {
      openSnackbar({ type: "error", text: "Vui lòng nhập họ và tên" });
      return;
    }
    if (!phone.trim()) {
      openSnackbar({ type: "error", text: "Vui lòng nhập số điện thoại" });
      return;
    }
    if (!selectedProvince) {
      openSnackbar({ type: "error", text: "Vui lòng chọn Tỉnh/Thành" });
      return;
    }
    if (!selectedWard) {
      openSnackbar({ type: "error", text: "Vui lòng chọn Phường/Xã" });
      return;
    }
    if (!detailAddress.trim()) {
      openSnackbar({ type: "error", text: "Vui lòng nhập số nhà/tên đường" });
      return;
    }

    const provinceObj = provinces.find(
      (p) => String(p.code) === String(selectedProvince)
    );
    const wardObj = wards.find((w) => String(w.code) === String(selectedWard));

    const provinceName = provinceObj?.name || provinceObj?.full_name || "";
    const wardName = wardObj?.name || wardObj?.full_name || "";

    if (!provinceName || !wardName) {
      openSnackbar({
        type: "error",
        text: "Không lấy được tên tỉnh/phường. Chọn lại Tỉnh và Phường/Xã.",
      });
      return;
    }

    const fullAddress = buildFullAddress(
      detailAddress.trim(),
      wardName,
      provinceName
    );

    const addressData = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      provinceCode: String(selectedProvince),
      provinceName,
      wardCode: String(selectedWard),
      wardName,
      detailAddress: detailAddress.trim(),
      address: fullAddress,
      isDefault,
    };

    onSave?.(addressData);
  };

  return (
    <Page style={{ background: "#FFF", minHeight: "100vh" }}>
      <Box
        style={{
          background: ACCENT_COLOR,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box
          onClick={onClose}
          style={{ color: "#FFF", fontSize: 20, cursor: "pointer", padding: 4 }}
        >
          ‹
        </Box>
        <Text style={{ color: "#FFF", fontSize: 17, fontWeight: 700 }}>
          Địa chỉ mới
        </Text>
        <Box style={{ width: 28 }} />
      </Box>

      <Box style={{ padding: 16, paddingBottom: 40 }}>
        <Box
          onClick={handleRequestZaloInfo}
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <Text style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 600 }}>
            📱 Lấy tên & số điện thoại từ Zalo
          </Text>
          <Text style={{ fontSize: 13, color: "#1D4ED8" }}>›</Text>
        </Box>

        <Text style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 10, display: "block" }}>
          Liên hệ
        </Text>

        <Box
          style={{
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 11, color: "#999", marginBottom: 4, display: "block" }}>
            Họ và tên
          </Text>
          <input
            type="text"
            placeholder="Nhập họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 15,
              padding: "4px 0",
            }}
          />
        </Box>

        <Box
          style={{
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 11, color: "#999", marginBottom: 4, display: "block" }}>
            Số điện thoại
          </Text>
          <input
            type="tel"
            placeholder="Nhập số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 15,
              padding: "4px 0",
            }}
          />
        </Box>

        <Text style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 10, display: "block" }}>
          Địa chỉ
        </Text>

        <Box style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <Box
            style={{
              flex: 1,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, color: "#999", marginBottom: 4, display: "block" }}>
              Tỉnh / Thành
            </Text>
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedWard("");
              }}
              disabled={loadingProvinces}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 14,
                background: "transparent",
                padding: "4px 0",
              }}
            >
              <option value="">{loadingProvinces ? "Đang tải..." : "Chọn tỉnh"}</option>
              {provinces.map((p) => (
                <option key={String(p.code)} value={String(p.code)}>
                  {p.name || p.full_name}
                </option>
              ))}
            </select>
          </Box>

          <Box
            style={{
              flex: 1,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, color: "#999", marginBottom: 4, display: "block" }}>
              Phường / Xã
            </Text>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              disabled={!selectedProvince || loadingWards}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 14,
                background: "transparent",
                padding: "4px 0",
              }}
            >
              <option value="">{loadingWards ? "Đang tải..." : "Chọn phường/xã"}</option>
              {wards.map((w) => (
                <option key={String(w.code)} value={String(w.code)}>
                  {w.name || w.full_name}
                </option>
              ))}
            </select>
          </Box>
        </Box>

        <Box
          style={{
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 11, color: "#999", marginBottom: 4, display: "block" }}>
            Số nhà / Tên đường
          </Text>
          <input
            type="text"
            placeholder="Số nhà, tên đường, tòa nhà... (VD: 19 Âu Cơ)"
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 15,
              padding: "4px 0",
            }}
          />
        </Box>

        <Box
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderTop: `1px solid ${BORDER_COLOR}`,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 14, color: "#111" }}>Địa chỉ mặc định</Text>
          <Box
            onClick={() => setIsDefault((prev) => !prev)}
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              background: isDefault ? ACCENT_COLOR : "#D1D5DB",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <Box
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#FFF",
                position: "absolute",
                top: 3,
                left: isDefault ? 21 : 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </Box>
        </Box>

        <Box
          onClick={handleSubmit}
          style={{
            width: "100%",
            background: PRIMARY_COLOR,
            color: "#FFF",
            textAlign: "center",
            padding: "14px 0",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Tạo địa chỉ
        </Box>
      </Box>
    </Page>
  );
}