const DEFAULT_DEMO_HOST = "demo.attunebridge.com";

function normalizeHost(rawHost: string | null | undefined) {
  if (!rawHost) {
    return "";
  }

  return rawHost.trim().toLowerCase().replace(/:\d+$/, "");
}

export const DEMO_HOST = normalizeHost(process.env.NEXT_PUBLIC_DEMO_HOST) || DEFAULT_DEMO_HOST;
export const DEMO_OWNER_EMAIL = "owner@democoffee.com";

export function isDemoHost(host: string | null | undefined) {
  return normalizeHost(host) === DEMO_HOST;
}

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE_ENABLED === "true";
}

export function isDemoModeAllowedForHost(host: string | null | undefined) {
  if (isDemoModeEnabled()) {
    return true;
  }

  if (isDemoHost(host)) {
    return true;
  }

  return false;
}
