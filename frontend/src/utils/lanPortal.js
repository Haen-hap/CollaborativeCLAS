export function isLoopbackHost(host) {
  if (typeof host !== "string") return true;

  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  if (normalized.startsWith("127.")) return true;
  if (normalized === "0.0.0.0") return true;

  const bareHost =
    normalized.startsWith("[") && normalized.endsWith("]")
      ? normalized.slice(1, -1)
      : normalized;
  return bareHost === "::1";
}

function normalizePortalUrl(parsedUrl) {
  const pathname = parsedUrl.pathname.endsWith("/")
    ? parsedUrl.pathname
    : `${parsedUrl.pathname}/`;
  return `${parsedUrl.origin}${pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

export function resolveLanPortalUrl({ lanInfo, locationOrigin } = {}) {
  if (lanInfo && lanInfo.status !== "offline") {
    if (typeof lanInfo.url === "string" && lanInfo.url.trim()) {
      try {
        const parsedUrl = new URL(lanInfo.url);
        const isHttpProtocol =
          parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        if (isHttpProtocol && !isLoopbackHost(parsedUrl.hostname)) {
          return normalizePortalUrl(parsedUrl);
        }
      } catch {}
    }

    if (
      typeof lanInfo.ipv4 === "string" &&
      lanInfo.ipv4.trim() &&
      !isLoopbackHost(lanInfo.ipv4)
    ) {
      return `http://${lanInfo.ipv4.trim()}/`;
    }
  }

  if (typeof locationOrigin === "string" && locationOrigin.trim()) {
    try {
      const parsedOrigin = new URL(locationOrigin);
      if (!isLoopbackHost(parsedOrigin.hostname)) {
        return `${parsedOrigin.origin}/`;
      }
    } catch {}
  }

  return null;
}
