export function createCorsOriginResolver() {
  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, isAllowedLoopAdOrigin(origin) || isAllowedLocalDevelopmentOrigin(origin));
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

function isAllowedLocalDevelopmentOrigin(origin: string): boolean {
  if (process.env.LOOPAD_ENV !== "local" && process.env.NODE_ENV !== "development") {
    return false;
  }

  try {
    const url = new URL(origin);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    return url.protocol === "http:" && isLocalhost;
  } catch {
    return false;
  }
}
