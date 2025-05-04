import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get the base URL for API requests that works in both development and production
const getApiBaseUrl = () => {
  // In production (Vercel), API requests use relative paths
  return '';
};

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit,
  json: boolean = true
): Promise<T> {
  // Ensure URL is properly formatted with base URL
  const apiUrl = url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url;
  
  const method = options?.method || 'GET';
  const data = options?.body;
  
  const res = await fetch(apiUrl, {
    ...options,
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {})
    },
    body: data && typeof data !== 'string' ? JSON.stringify(data) : data,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return json ? res.json() : res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Format URL with base API URL if it's a string path
    const queryKeyUrl = queryKey[0] as string;
    const apiUrl = queryKeyUrl.startsWith('/') ? `${getApiBaseUrl()}${queryKeyUrl}` : queryKeyUrl;
    
    const res = await fetch(apiUrl, {
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
