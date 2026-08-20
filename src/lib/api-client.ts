import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

/**
 * Every backend response goes through `helpers/responses/custom-response.ts`,
 * which emits `status` (boolean) rather than `success`. Both are declared so
 * older call sites keep type-checking.
 */
export interface ApiEnvelope<T> {
  success?: boolean;
  status?: boolean;
  message: string;
  statusCode?: number;
  path?: string;
  method?: string;
  timestamp?: string;
  data?: T;
  meta?: { page: number; limit: number; total: number };
  error?: unknown;
  /** Zod validation failures: `[{ field, message }]`. */
  errors?: { field?: string; message?: string }[];
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    const tokens = data.data;
    if (!tokens) return null;
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

/** Sends the browser back to /login once a session is unrecoverable. */
function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      originalRequest._retry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Refresh failed — the session is genuinely dead.
      forceLogout();
    }

    return Promise.reject(error);
  },
);

/** Classified error so UI can branch on permission / not-found / server faults. */
export type ApiErrorKind = "auth" | "forbidden" | "notFound" | "validation" | "server" | "network" | "unknown";

export function getApiErrorKind(error: unknown): ApiErrorKind {
  if (!axios.isAxiosError(error)) return "unknown";
  if (!error.response) return "network";
  const status = error.response.status;
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

/** Friendly copy for each failure class — never leaks a stack trace to the user. */
const FALLBACK_BY_KIND: Record<ApiErrorKind, string> = {
  auth: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to perform this action.",
  notFound: "We couldn't find what you were looking for.",
  validation: "Please check the highlighted fields and try again.",
  server: "The server ran into a problem. Please try again in a moment.",
  network: "Can't reach the server. Check your connection and try again.",
  unknown: "Something went wrong. Please try again.",
};

/**
 * Pulls a human-readable message out of a failed request, for toasts.
 * Prefers the backend's own message, then the first Zod field error, then a
 * class-appropriate fallback. Raw stack traces are deliberately never surfaced.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const kind = getApiErrorKind(error);

  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope<unknown> | undefined;

    if (envelope?.errors?.length) {
      const first = envelope.errors[0];
      if (first?.message) return first.field ? `${first.field}: ${first.message}` : first.message;
    }
    if (envelope?.message && envelope.message !== "Validation error") return envelope.message;
    if (envelope?.message) return envelope.message;
  }

  if (kind === "unknown" && error instanceof Error && error.message) return error.message;
  return fallback ?? FALLBACK_BY_KIND[kind];
}

/** Flattens Zod field errors into a `{ field: message }` map for inline form display. */
export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const envelope = error.response?.data as ApiEnvelope<unknown> | undefined;
  const out: Record<string, string> = {};
  for (const e of envelope?.errors ?? []) {
    if (e.field && e.message) out[e.field] = e.message;
  }
  return out;
}

/**
 * Requests a PDF/CSV endpoint as a blob and hands it to the browser as a
 * download. Errors are re-thrown as normal so callers can toast them; a JSON
 * error body returned in place of a file is decoded first.
 */
export async function downloadFile(url: string, filename: string, params?: object): Promise<void> {
  try {
    const response = await apiClient.get<Blob>(url, { params, responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // A failed download still returns a Blob — decode it so the toast is useful.
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = { message: FALLBACK_BY_KIND[getApiErrorKind(error)] };
      }
    }
    throw error;
  }
}
