export const AUTH_MODE_VALUES = ["legacy", "dual", "clerk_only"] as const;

export type AuthMode = (typeof AUTH_MODE_VALUES)[number];

const DEFAULT_AUTH_MODE: AuthMode = "dual";

export function getAuthMode(): AuthMode {
  const rawMode = process.env.AUTH_MODE?.trim().toLowerCase();

  if (rawMode === "legacy" || rawMode === "dual" || rawMode === "clerk_only") {
    return rawMode;
  }

  return DEFAULT_AUTH_MODE;
}

export function allowsLegacyOwnerSession() {
  return getAuthMode() !== "clerk_only";
}

export function allowsClerkAuth() {
  return getAuthMode() !== "legacy";
}
