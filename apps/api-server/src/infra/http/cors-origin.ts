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
    const isPrivateNetwork = isPrivateNetworkHostname(url.hostname);

    return url.protocol === "http:" && (isLocalhost || isPrivateNetwork);
  } catch {
    return false;
  }
}

function isPrivateNetworkHostname(hostname: string) {
  const carrierGradeNatMatch = /^100\.(\d{1,3})\./.exec(hostname);
  if (carrierGradeNatMatch) {
    const secondOctet = Number(carrierGradeNatMatch[1]);
    return secondOctet >= 64 && secondOctet <= 127;
  }

  if (hostname.startsWith("192.168.")) {
    return true;
  }

  if (hostname.startsWith("10.")) {
    return true;
  }

  const match = /^172\.(\d{1,2})\./.exec(hostname);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}
