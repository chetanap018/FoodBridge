import { Platform } from "react-native";
import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;
/** Extended timeout for AI-heavy endpoints like donation analysis (60 seconds) */
const EXTENDED_TIMEOUT_MS = 60_000;

/** Routes that may involve AI processing and need a longer timeout */
const AI_ROUTES = ["/api/donations/analyze-and-create", "/api/scan", "/api/scan-receipt", "/api/recipes/suggest"];

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:4000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // On web, if we're on localhost, we likely want to talk to the local server too
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:4000`;
    }
  }

  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // Handle Android emulator: 10.0.2.2 points to host machine
  // We only replace if it's localhost or 127.0.0.1 and we are on Android
  if (Platform.OS === 'android') {
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      host = host.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
  }

  const isLocal = host.includes('localhost') || host.includes('10.0.2.2') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host);
  const protocol = isLocal ? 'http' : 'https';
  let url = new URL(`${protocol}://${host}`);

  if (__DEV__) {
    console.log(`[getApiUrl] ${Platform.OS} target: ${url.href}`);
  }
  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Try to parse JSON error responses for a cleaner user-facing message
    let message = `${res.status}: ${text}`;
    try {
      const json = JSON.parse(text);
      if (json.error || json.message) {
        message = json.error || json.message;
      }
    } catch {
      // Not JSON — use the raw text
    }
    throw new Error(message);
  }
}

/**
 * Wraps a fetch call with an AbortController-based timeout so that
 * unreachable servers or hanging requests don't buffer indefinitely.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Build options compatible with expo/fetch's FetchRequestInit type
    // (expo/fetch doesn't accept `null` for body, only `undefined`)
    const fetchOptions: Record<string, any> = { ...options, signal: controller.signal };
    if (fetchOptions.body === null) {
      delete fetchOptions.body;
    }
    const res = await fetch(url, fetchOptions);
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000}s. Please check your network connection and ensure the server is running.`
      );
    }
    // Enhance network errors with a helpful message
    if (err.message && (err.message.includes("Network request failed") || err.message.includes("fetch"))) {
      throw new Error(
        `Cannot connect to server at ${url}. Please ensure the server is running and reachable.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  // Use extended timeout for AI-heavy endpoints
  const timeout = AI_ROUTES.some((r) => route.startsWith(r)) ? EXTENDED_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const res = await fetchWithTimeout(
    url.toString(),
    {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    },
    timeout,
  );

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const url = new URL(queryKey.join("/") as string, baseUrl);

      const res = await fetchWithTimeout(
        url.toString(),
        { credentials: "include" },
        DEFAULT_TIMEOUT_MS,
      );

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
