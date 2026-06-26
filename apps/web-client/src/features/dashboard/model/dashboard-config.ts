export const projectId = import.meta.env.VITE_PROJECT_ID ?? "loopad-demo-shop";

export const apiBaseUrl = (import.meta.env.VITE_DASHBOARD_API_BASE_URL ?? "/api").replace(
  /\/$/,
  ""
);
