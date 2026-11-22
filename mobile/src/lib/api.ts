import { type ApiError, type PublicConfig } from "@oracle/core";
import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { ApiRequestError } from "./api-error";
import { API_URL } from "./config";
import { DEMO_LOGIN, isDemoActive } from "./demo";

export { ApiRequestError };

type Query = Record<string, string | number | undefined | null>;

export function withQuery(path: string, query?: Query): string {
  const parts = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${path}?${parts.join("&")}` : path;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Dev-only demo mode: answer from in-memory sample data instead of the network.
  if (DEMO_LOGIN && isDemoActive()) {
    const { demoRequest } = await import("./demo-data");
    return demoRequest(method, path, body) as T;
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Native apps send the stored session cookie by hand. Browsers send their own cookies.
  const native = Platform.OS !== "web";
  if (native) {
    const cookie = await authClient.getCookie();
    if (cookie) headers.Cookie = cookie;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: native ? "omit" : "include",
    });
  } catch {
    throw new ApiRequestError(0, "network", "Cannot reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const e = (json as ApiError | null)?.error;
    throw new ApiRequestError(res.status, e?.code ?? "unknown", e?.message ?? "Something went wrong.", e?.details);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", withQuery(path, query)),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};

/** Public config does not need a login. */
export async function getPublicConfig(): Promise<PublicConfig> {
  const res = await fetch(`${API_URL}/api/v1/public/config`);
  return res.json();
}
