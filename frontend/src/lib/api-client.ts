/**
 * API Client for Frontend to communicate with Backend
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get tenant configuration
 */
export async function getTenantConfig(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/config`);
}

/**
 * Save/update tenant configuration
 */
export async function saveTenantConfig(
  tenantId: string,
  config: any
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/config`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

/**
 * Update tenant configuration (partial)
 */
export async function updateTenantConfig(
  tenantId: string,
  updates: any
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/config`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete tenant configuration
 */
export async function deleteTenantConfig(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/config`, {
    method: "DELETE",
  });
}

/**
 * Get all dashboards for tenant
 */
export async function getTenantDashboards(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards`);
}

/**
 * Get specific dashboard
 */
export async function getDashboard(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards/${dashboardId}`);
}
