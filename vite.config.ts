import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" keeps the built site working from any path (Vercel, Netlify, GitHub Pages).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
