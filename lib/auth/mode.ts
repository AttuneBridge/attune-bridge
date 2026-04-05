export const AUTH_MODE_VALUES = ["clerk_only"] as const;

export type AuthMode = (typeof AUTH_MODE_VALUES)[number];

const DEFAULT_AUTH_MODE: AuthMode = "clerk_only";

export function getAuthMode(): AuthMode {
  const rawMode = process.env.AUTH_MODE?.trim().toLowerCase();

  if (rawMode === "clerk_only") {
    return rawMode;
  }

  return DEFAULT_AUTH_MODE;
}

export function allowsClerkAuth() {
  return getAuthMode() === "clerk_only";
}
