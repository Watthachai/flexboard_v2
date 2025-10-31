/**
 * Centralized API Client for communicating with backend
 */

import { getAuth } from "firebase/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthToken(): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  try {
    // Force refresh to get latest claims
    return await user.getIdToken(true);
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Get authentication token
  const token = await getAuthToken();

  // Add Authorization header if token exists
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch configuration from backend
 */
export async function getBackendConfig(tenantId?: string): Promise<any> {
  if (!tenantId) {
    throw new Error("tenantId is required");
  }
  return fetcher(
    `${BACKEND_URL}/api/tenants/${encodeURIComponent(tenantId)}/config`
  );
}

/**
 * Fetch widget configuration by ID
 */
export async function getWidgetConfig(widgetId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/widgets/${widgetId}`);
}

/**
 * Fetch all widgets configuration
 */
export async function getAllWidgets(): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/widgets`);
}

/**
 * Fetch chart configuration by ID
 */
export async function getChartConfig(chartId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/charts/${chartId}`);
}

/**
 * Fetch all charts configuration
 */
export async function getAllCharts(): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/charts`);
}

/**
 * Generic POST request
 */
export async function postData<T>(
  endpoint: string,
  data: Record<string, any>
): Promise<T> {
  return fetcher(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Generic GET request
 */
export async function getData<T>(endpoint: string): Promise<T> {
  return fetcher(`${BACKEND_URL}${endpoint}`);
}

/**
 * Get invite code details (for tenant association)
 */
export async function getInviteCodeDetails(
  code: string
): Promise<{ tenantId: string; code: string; isActive: boolean }> {
  return fetcher<{ tenantId: string; code: string; isActive: boolean }>(
    `${BACKEND_URL}/api/invite-codes/${encodeURIComponent(code)}`
  );
}
