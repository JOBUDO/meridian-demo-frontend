import { defineConfig } from "vite";
export default defineConfig({
  base: "/meridian-demo-frontend/",
  test: {
    include: ["tests/**/*.test.{js,jsx}"],
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
  },
});