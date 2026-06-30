/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOOPAD_API_BASE_URL?: string;
  readonly VITE_LOOPAD_DATA_SOURCE?: "fixture" | "http";
  readonly VITE_LOOPAD_FIXTURE_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
