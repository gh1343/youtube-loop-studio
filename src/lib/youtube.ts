const RAW_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function normalizeUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  return `https://${input}`;
}

export function extractVideoId(urlOrId: string): string | null {
  const value = urlOrId.trim();
  if (!value) {
    return null;
  }

  if (RAW_VIDEO_ID_REGEX.test(value)) {
    return value;
  }

  try {
    const parsed = new URL(normalizeUrl(value));
    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return RAW_VIDEO_ID_REGEX.test(id) ? id : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const watchId = parsed.searchParams.get("v");
      if (watchId && RAW_VIDEO_ID_REGEX.test(watchId)) {
        return watchId;
      }

      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const embedLikePrefixes = new Set(["embed", "shorts", "v", "live"]);
      if (pathSegments.length >= 2 && embedLikePrefixes.has(pathSegments[0])) {
        const id = pathSegments[1];
        return RAW_VIDEO_ID_REGEX.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}
