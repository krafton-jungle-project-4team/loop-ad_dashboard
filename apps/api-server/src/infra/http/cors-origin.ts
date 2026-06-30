export function createCorsOriginResolver() {
  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, isAllowedLoopAdOrigin(origin));
  };
}

export function isAllowedLoopAdOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return url.protocol === "https:" && isLoopAdHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLoopAdHostname(hostname: string): boolean {
  return hostname === "loop-ad.org" || hostname.endsWith(".loop-ad.org");
}
