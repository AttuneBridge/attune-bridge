import { redirect } from "next/navigation";

function sanitizeReturnTo(pathname: string | null | undefined) {
  if (!pathname) {
    return null;
  }

  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("://")) {
    return null;
  }

  return pathname;
}

export function redirectToDashboardAccess(pathname?: string): never {
  const safePath = sanitizeReturnTo(pathname);
  const target = safePath ? `/access?returnTo=${encodeURIComponent(safePath)}` : "/access";

  redirect(target);
}
