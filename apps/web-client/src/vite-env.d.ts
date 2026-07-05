/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOOPAD_API_BASE_URL: string;
  readonly VITE_LOOPAD_CHATKIT_DOMAIN_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
