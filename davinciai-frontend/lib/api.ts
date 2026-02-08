/**
 * API utility layer for DaVinci AI Frontend.
 *
 * In production, all /api/* requests go through the Next.js rewrite proxy
 * (configured in next.config.ts) so we use RELATIVE paths — no absolute URL
 * needed on the client. This avoids the Next.js NEXT_PUBLIC_ build-time
 * baking problem: the API target can change at runtime via the server-side
 * API_URL env var without rebuilding the frontend image.
 *
 * In development, the rewrite proxy in next.config.ts forwards to localhost:8000.
 */

/**
 * Normalize an API path to a relative URL.
 * @param path - e.g. "/api/auth/login" or "api/auth/login"
 */
export function apiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Authenticated fetch wrapper.
 * - Uses relative paths (routed through Next.js rewrite proxy)
 * - Automatically attaches JWT token from localStorage
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}
