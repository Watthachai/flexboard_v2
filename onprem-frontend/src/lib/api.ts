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

// ===== DASHBOARD APIs =====

/**
 * Get all dashboards for tenant
 */
export async function getDashboards(tenantId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/tenants/${tenantId}/dashboards`);
}

/**
 * Get specific dashboard by ID
 */
export async function getDashboardById(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(
    `${BACKEND_URL}/api/tenants/${tenantId}/dashboards/${dashboardId}`
  );
}

/**
 * Get active dashboard version config
 */
export async function getActiveDashboardVersion(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  const versions = await fetcher(
    `${BACKEND_URL}/api/tenants/${tenantId}/dashboards/${dashboardId}/versions`
  );

  // Find active version
  const activeVersion = versions.find((v: any) => v.isActive);
  if (!activeVersion) {
    throw new Error("No active version found for this dashboard");
  }

  return activeVersion;
}

// ===== DATA SOURCE APIs =====

/**
 * Get all data sources for tenant
 */
export async function getDataSources(tenantId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/tenants/${tenantId}/datasources`);
}

/**
 * Get specific data source
 */
export async function getDataSource(
  tenantId: string,
  dataSourceId: string
): Promise<any> {
  return fetcher(
    `${BACKEND_URL}/api/tenants/${tenantId}/datasources/${dataSourceId}`
  );
}

/**
 * Execute query on data source
 */
export async function executeQuery(
  tenantId: string,
  dataSourceId: string,
  query: string
): Promise<any> {
  return fetcher(
    `${BACKEND_URL}/api/tenants/${tenantId}/datasources/${dataSourceId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
}

/**
 * Get widget data (execute widget's data config)
 */
export async function getWidgetData(
  tenantId: string,
  dataSourceId: string,
  dataConfig: {
    table?: string;
    query?: string;
    xField?: string;
    yField?: string;
    aggregation?: string;
    groupBy?: string[];
    filters?: any[];
    orderBy?: any[];
    limit?: number;
  }
): Promise<{ data: any[]; columns: string[] }> {
  // Build query based on dataConfig
  let query = "";

  if (dataConfig.query) {
    // Use custom query if provided
    query = dataConfig.query;
  } else if (dataConfig.table) {
    // Build query from table and fields
    const fields = [];
    if (dataConfig.xField) fields.push(dataConfig.xField);
    if (dataConfig.yField) fields.push(dataConfig.yField);

    const selectClause = fields.length > 0 ? fields.join(", ") : "*";
    query = `SELECT ${selectClause} FROM ${dataConfig.table}`;

    // Add filters
    if (dataConfig.filters && dataConfig.filters.length > 0) {
      const whereClause = dataConfig.filters
        .map((f) => `${f.field} ${f.operator} '${f.value}'`)
        .join(" AND ");
      query += ` WHERE ${whereClause}`;
    }

    // Add group by
    if (dataConfig.groupBy && dataConfig.groupBy.length > 0) {
      query += ` GROUP BY ${dataConfig.groupBy.join(", ")}`;
    }

    // Add order by
    if (dataConfig.orderBy && dataConfig.orderBy.length > 0) {
      const orderClause = dataConfig.orderBy
        .map((o) => `${o.field} ${o.direction}`)
        .join(", ");
      query += ` ORDER BY ${orderClause}`;
    }

    // Add limit
    if (dataConfig.limit) {
      query += ` LIMIT ${dataConfig.limit}`;
    }
  } else {
    throw new Error("Either table or query must be provided in dataConfig");
  }

  return executeQuery(tenantId, dataSourceId, query);
}

// ===== USER/PROFILE APIs =====

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/auth/profile`);
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  displayName?: string;
  photoURL?: string;
}): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
