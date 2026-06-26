export const projectId = "loopad-demo-shop";

const localApiBaseUrl = "/api";
const devPublicApiBaseUrl = "https://api.dev.loop-ad.org/api";

export const apiBaseUrl = (import.meta.env.DEV ? localApiBaseUrl : devPublicApiBaseUrl).replace(
  /\/$/,
  ""
);
