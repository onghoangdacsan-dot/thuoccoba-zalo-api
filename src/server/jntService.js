/**
 * src/server/jntService.js
 * -------------------------
 * Service tạo đơn hàng qua API J&T Express
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");

const CONFIG = {
  eccompanyid: process.env.JNT_ECCOMPANYID,
  customerid: process.env.JNT_CUSTOMERID,
  key: process.env.JNT_KEY,
  apiUrl: process.env.JNT_API_URL,
};

function calcDataDigest(logisticsInterfaceStr, key) {
  const md5Binary = crypto
    .createHash("md5")
    .update(logisticsInterfaceStr + key, "utf8")
    .digest();
  return md5Binary.toString("base64");
}

function formatDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function generateTxLogisticId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.floor(Math.random() * 1000);
  return `DH${stamp}${rand}`;
}

async function createOrder(orderData) {
  if (!CONFIG.eccompanyid || !CONFIG.customerid || !CONFIG.key) {
    throw new Error(
      "Thiếu cấu hình JNT_ECCOMPANYID / JNT_CUSTOMERID / JNT_KEY trong file .env"
    );
  }

  const now = new Date();
  const sendStart = new Date(now.getTime() + 60 * 60 * 1000);
  const sendEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const logisticsInterfaceObj = {
    eccompanyid: CONFIG.eccompanyid,
    customerid: CONFIG.customerid,
    txlogisticid: orderData.txlogisticid || generateTxLogisticId(),
    ordertype: 1,
    servicetype: 1,
    sender: orderData.sender,
    receiver: orderData.receiver,
    createordertime: formatDateTime(now),
    sendstarttime: formatDateTime(sendStart),
    sendendtime: formatDateTime(sendEnd),
    paytype: orderData.paytype || "PP_PM",
    itemsvalue: String(orderData.itemsvalue),
    goodsvalue: String(orderData.itemsvalue),
    items: orderData.items,
    weight: String(orderData.weight),
    remark: orderData.remark || "",
  };

  const logisticsInterfaceStr = JSON.stringify(logisticsInterfaceObj);
  const dataDigest = calcDataDigest(logisticsInterfaceStr, CONFIG.key);

  const form = new FormData();
  form.append("logistics_interface", logisticsInterfaceStr);
  form.append("data_digest", dataDigest);
  form.append("msg_type", "ORDERCREATE");
  form.append("eccompanyid", CONFIG.eccompanyid);

  const response = await axios.post(CONFIG.apiUrl, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  return response.data;
}

module.exports = { createOrder };