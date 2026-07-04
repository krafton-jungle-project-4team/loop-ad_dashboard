import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  chatKitDomainKey: z.string().min(1)
});

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: normalizeApiBaseUrl(
    requiredEnv("VITE_LOOPAD_API_BASE_URL", import.meta.env.VITE_LOOPAD_API_BASE_URL)
  ),
  chatKitDomainKey:
    import.meta.env.VITE_LOOPAD_CHATKIT_DOMAIN_KEY?.trim() || "domain_pk_localhost_dev"
});

function requiredEnv(key: string, value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function normalizeApiBaseUrl(apiBaseUrl: string) {
  if (typeof window === "undefined") {
    return apiBaseUrl;
  }

  const configuredUrl = new URL(apiBaseUrl, window.location.origin);
  if (isLocalApiHost(configuredUrl.hostname) && !isLocalBrowserHost(window.location.hostname)) {
    configuredUrl.hostname = window.location.hostname;
  }

  return configuredUrl.toString().replace(/\/$/, "");
}

function isLocalApiHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalBrowserHost(hostname: string) {
  return isLocalApiHost(hostname);
}
