import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
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
  };
});
