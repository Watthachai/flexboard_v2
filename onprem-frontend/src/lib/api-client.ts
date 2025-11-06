/**
 * Centralized API Client for OnPrem Frontend
 * Uses API Key authentication instead of Firebase
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Get API Key from localStorage
 */
function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("apiKey");
}

/**
 * Get Tenant ID from localStorage
 */
function getTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tenantId");
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const apiKey = getApiKey();
  const tenantId = getTenantId();

  // Add headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add API Key header if exists
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  // Add Tenant ID header if exists
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
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

// ===== AUTHENTICATION APIs =====

/**
 * Authenticate with API Key only (backend will find tenant automatically)
 */
export async function authenticate(
  apiKey: string
): Promise<{ success: boolean; tenant: any }> {
  const result = await fetcher<{ success: boolean; tenant: any }>(
    `${BACKEND_URL}/api/onprem/authenticate`,
    {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }
  );

  // Store credentials in localStorage and cookies
  if (result.success && result.tenant) {
    const tenantId = result.tenant.id || result.tenant.tenantId;

    localStorage.setItem("apiKey", apiKey);
    localStorage.setItem("tenantId", tenantId);

    // Set cookies for middleware
    document.cookie = `apiKey=${apiKey}; path=/; max-age=31536000`; // 1 year
    document.cookie = `tenantId=${tenantId}; path=/; max-age=31536000`;
  }

  return result;
}

/**
 * Logout - clear credentials
 */
export function logout(): void {
  localStorage.removeItem("apiKey");
  localStorage.removeItem("tenantId");

  // Clear cookies
  document.cookie = "apiKey=; path=/; max-age=0";
  document.cookie = "tenantId=; path=/; max-age=0";
}

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean {
  return !!(getApiKey() && getTenantId());
}

// ===== DASHBOARD APIs =====

/**
 * Get all dashboards for tenant (OnPrem endpoint)
 */
export async function getDashboards(_tenantId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/onprem/dashboards`);
}

/**
 * Get specific dashboard by ID
 */
export async function getDashboardById(
  _tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/onprem/dashboards/${dashboardId}`);
}

/**
 * Get active dashboard version config (OnPrem endpoint)
 */
export async function getActiveDashboardVersion(
  _tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/onprem/dashboards/${dashboardId}/version`);
}

// ===== DATA SOURCE APIs =====

/**
 * Get all data sources for tenant (OnPrem endpoint)
 */
export async function getDataSources(_tenantId: string): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/onprem/datasources`);
}

/**
 * Get specific data source (OnPrem endpoint)
 */
export async function getDataSource(
  _tenantId: string,
  dataSourceId: string
): Promise<any> {
  return fetcher(`${BACKEND_URL}/api/onprem/datasources/${dataSourceId}`);
}

/**
 * Execute query on data source (OnPrem endpoint)
 */
export async function executeQuery(
  _tenantId: string,
  dataSourceId: string,
  query: string
): Promise<any> {
  return fetcher(
    `${BACKEND_URL}/api/onprem/datasources/${dataSourceId}/query`,
    {
      method: "POST",
      body: JSON.stringify({ query }),
    }
  );
}

/**
 * Get widget data (execute widget's data config) - OnPrem version
 */
export async function getWidgetData(
  _tenantId: string,
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

    // For MSSQL, we need to use TOP instead of LIMIT
    // Add TOP right after SELECT if limit is specified
    const topClause = dataConfig.limit ? `TOP ${dataConfig.limit} ` : "";
    query = `SELECT ${topClause}${selectClause} FROM ${dataConfig.table}`;

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

    // Note: LIMIT removed - using TOP for MSSQL compatibility
  } else {
    throw new Error("Either table or query must be provided in dataConfig");
  }

  // Use empty string as tenantId since OnPrem endpoints don't need it
  return executeQuery("", dataSourceId, query);
}

// ===== USER/PROFILE APIs =====

/**
 * Get current user profile (not available in API Key mode)
 * Returns mock data for onprem
 */
export async function getUserProfile(): Promise<any> {
  const tenantId = getTenantId();
  const displayName = localStorage.getItem("displayName") || "OnPrem User";
  const photoURL = localStorage.getItem("photoURL") || "";

  return {
    tenantId,
    displayName,
    photoURL,
    role: "viewer",
  };
}

/**
 * Update user profile (not available in API Key mode)
 */
export async function updateUserProfile(data: {
  displayName?: string;
  photoURL?: string;
}): Promise<any> {
  // Store in localStorage for onprem
  if (data.displayName) {
    localStorage.setItem("displayName", data.displayName);
  }
  if (data.photoURL) {
    localStorage.setItem("photoURL", data.photoURL);
  }

  return { success: true };
}

export { BACKEND_URL };
