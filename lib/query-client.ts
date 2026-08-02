import { Platform } from "react-native";
import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

  console.log(`[getApiUrl] ${Platform.OS} target: ${url.href}`);
  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
