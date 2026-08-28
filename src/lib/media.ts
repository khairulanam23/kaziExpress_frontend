import { API_BASE_URL } from "./api-client";

/**
 * The origin serving uploaded media — the API host without its `/api/v1` path.
 */
function mediaOrigin(): string {
  try {
    return new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.href).origin;
  } catch {
    return "";
  }
}

/**
 * Resolves a stored media reference into something an `<img>` can load.
 *
 * The backend stores locally-hosted files as a host-relative path
 * (`/uploads/<file>`) so the hostname is never baked into the database, and
 * stores Cloudinary assets as their absolute CDN URL. This resolves the first
 * against whichever API the client is configured for and passes the second
 * through untouched.
 *
 * Rows written before that change hold an absolute `http://localhost:5000/...`
 * URL pointing at the viewer's own machine. Those are dead — the file lives on
 * whichever server accepted the upload — so they are treated as no image at
 * all, which shows the initials fallback rather than a broken-image icon.
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    const origin = mediaOrigin();
    // Absolute and pointing somewhere other than this API: only trustworthy if
    // it is a real CDN address, not a stale localhost reference.
    if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(value)) {
      return origin && value.startsWith(origin) ? value : null;
    }
    return value;
  }

  const origin = mediaOrigin();
  if (!origin) return null;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}
