import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  chatKitDomainKey: z.string().min(1)
});

const chatKitDomainPublicKey = "domain_pk_6a4a82942b00819097182058ae4fcbe00457577e1f163c6d";

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: normalizeApiBaseUrl(
    requiredEnv("VITE_LOOPAD_API_BASE_URL", import.meta.env.VITE_LOOPAD_API_BASE_URL)
  ),
  chatKitDomainKey: chatKitDomainPublicKey
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
