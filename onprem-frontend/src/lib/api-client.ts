/**
 * Centralized API Client for communicating with backend
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch configuration from backend
 */
export async function getBackendConfig(): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/config`);
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
