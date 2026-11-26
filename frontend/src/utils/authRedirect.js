const AUTH_GATE_PATHS = new Set(["/login", "/register"]);

export function sanitizeNextUrl(
  rawNext,
  fallback = "/admin",
  origin = typeof window !== "undefined" ? window.location.origin : "http://localhost",
) {
  if (typeof rawNext !== "string") return fallback;
  if (/[\x00-\x1f\x7f]/.test(rawNext) || rawNext.includes("\\")) {
    return fallback;
  }

  const trimmed = rawNext.trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return fallback;
  }

  let parsed;
  try {
    parsed = new URL(trimmed, origin);
  } catch {
    return fallback;
  }

  if (parsed.origin !== origin) return fallback;

  const { pathname, search, hash } = parsed;
  if (
    AUTH_GATE_PATHS.has(pathname) ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/")
  ) {
    return fallback;
  }

  return `${pathname}${search}${hash}`;
}
