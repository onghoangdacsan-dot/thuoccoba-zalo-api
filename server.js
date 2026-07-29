const express = require("express");
const CryptoJS = require("crypto-js");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_KEY = "fe49f1b0e06649e498929a7379cfdfbf";

app.post("/api/orders", (req, res) => {
  try {
    const orderId = "ORD_" + Date.now();
    console.log("Tạo đơn:", orderId, req.body);
    res.json({ orderId, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot create order" });
  }
});

app.post("/api/create-mac", (req, res) => {
  try {
    const body = req.body;
    const dataMac = Object.keys(body)
      .sort()
      .map((key) => {
        const value =
          typeof body[key] === "object"
            ? JSON.stringify(body[key])
            : body[key];
        return `${key}=${value}`;
      })
      .join("&");
    const mac = CryptoJS.HmacSHA256(dataMac, PRIVATE_KEY).toString();
    res.json({ mac });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot create mac" });
  }
});

app.post("/api/zalo-notify", (req, res) => {
  try {
    const { data, mac } = req.body || {};
    if (!data || !mac) {
      return res.json({ returnCode: 0, returnMessage: "Missing data or mac" });
    }
    const { appId, orderId, method } = data;
    const str = `appId=${appId}&orderId=${orderId}&method=${method}`;
    const reqMac = CryptoJS.HmacSHA256(str, PRIVATE_KEY).toString();
    if (reqMac === mac) {
      console.log("Zalo Notify OK:", orderId, method);
      return res.json({ returnCode: 1, returnMessage: "Success" });
    }
    return res.json({ returnCode: 0, returnMessage: "Invalid mac" });
  } catch (err) {
    console.error(err);
    return res.json({ returnCode: 0, returnMessage: "Error" });
  }
});

app.post("/api/zalo-callback", (req, res) => {
  try {
    console.log("Zalo Callback:", req.body);
    return res.json({ returnCode: 1, returnMessage: "Success" });
  } catch (err) {
    return res.json({ returnCode: 0, returnMessage: "Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Thuộc Cô Ba Zalo API đang chạy");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server chạy cổng", PORT);
});
