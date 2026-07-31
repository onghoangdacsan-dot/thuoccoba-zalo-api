import { defineConfig } from "vite";
import zmpVitePlugin from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [zmpVitePlugin(), react()],
  server: {
    fs: {
      // Dòng này sẽ xóa bỏ lỗi "outside of Vite serving allow list"
      strict: false,
      allow: [".."],
    },
  },
});