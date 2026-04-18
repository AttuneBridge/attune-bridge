const DEFAULT_DEMO_HOST = "demo.attunebridge.com";

function normalizeHost(rawHost: string | null | undefined) {
  if (!rawHost) {
    return "";
  }

  return rawHost.trim().toLowerCase().replace(/:\d+$/, "");
}

export const DEMO_HOST = normalizeHost(process.env.NEXT_PUBLIC_DEMO_HOST) || DEFAULT_DEMO_HOST;
export const DEMO_OWNER_EMAIL = "owner@democoffee.com";
export const DEMO_LOCATION_SLUG = "demo-coffee-downtown";

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function getDemoBaseUrl() {
  return `https://${DEMO_HOST}`;
}

export function getDemoUrl(pathname = "/") {
  return `${getDemoBaseUrl()}${normalizePathname(pathname)}`;
}

export function isDemoHost(host: string | null | undefined) {
  return normalizeHost(host) === DEMO_HOST;
}

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE_ENABLED === "true";
}

export function isDemoModeAllowedForHost(host: string | null | undefined) {
  return isDemoModeEnabled() && isDemoHost(host);
}
