import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server:
    command === "serve"
      ? {
          proxy: {
            "/api": {
              target: requiredEnv("LOOPAD_API_PROXY_TARGET"),
              changeOrigin: true
            }
          }
        }
      : undefined
}));
