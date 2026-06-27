import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function requiredEnv(env: Record<string, string>, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server:
      command === "serve"
        ? {
            proxy: {
              "/api": {
                target: requiredEnv(env, "LOOPAD_API_PROXY_TARGET"),
                changeOrigin: true
              }
            }
          }
        : undefined
  };
});
