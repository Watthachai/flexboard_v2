/**
 * API Client for Frontend to communicate with Backend
 * Automatically handles Firebase Authentication tokens
 */

import { getAuth } from "firebase/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

/**
 * Generic fetcher with automatic token injection
 */
async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Get current user and token
  const auth = getAuth();
  const user = auth.currentUser;

  //console.log("🔵 [API] Fetcher called:", url);
  //console.log("  User:", user?.email);

  if (!user) {
    console.error("❌ [API] Not authenticated");
    throw new Error("Not authenticated");
  }

  // Force refresh token to get latest custom claims (isSuperAdmin, isAdmin)
  const token = await user.getIdToken(true);
  //console.log("  Token (first 50 chars):", token.substring(0, 50) + "...");

  const response = await fetch(`${BACKEND_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  //console.log("  Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    //console.error("❌ [API] Error response:", errorText);
    throw new Error(
      `API Error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const data = await response.json();
  //console.log("✅ [API] Success:", data);
  return data;
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

// ===== ADMIN APIs =====

/**
 * Get all tenants (Super Admin only)
 */
export async function getAllTenants(): Promise<any> {
  return fetcher(`/api/tenants`);
}

/**
 * Create new tenant (Super Admin only)
 */
export async function createTenant(data: {
  name: string;
  description?: string;
}): Promise<any> {
  return fetcher(`/api/tenants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update tenant (Super Admin only)
 */
export async function updateTenant(
  tenantId: string,
  data: { name?: string; description?: string }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete tenant (Super Admin only)
 */
export async function deleteTenant(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}`, {
    method: "DELETE",
  });
}

/**
 * Get all invite codes (Admin only)
 */
export async function getAllInviteCodes(): Promise<any> {
  return fetcher(`/api/invite-codes`);
}

/**
 * Create invite code (Admin only)
 */
export async function createInviteCode(data: {
  code: string;
  tenantId: string;
  role: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<any> {
  return fetcher(`/api/invite-codes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update invite code (Admin only)
 */
export async function updateInviteCode(
  codeId: string,
  data: {
    maxUses?: number;
    expiresAt?: string;
    isActive?: boolean;
  }
): Promise<any> {
  return fetcher(`/api/invite-codes/${codeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete invite code (Admin only)
 */
export async function deleteInviteCode(codeId: string): Promise<any> {
  return fetcher(`/api/invite-codes/${codeId}`, {
    method: "DELETE",
  });
}

/**
 * Revoke invite code (Admin only) - makes it inactive without deleting
 */
export async function revokeInviteCode(code: string): Promise<any> {
  return fetcher(`/api/invite-codes/${code}/revoke`, {
    method: "POST",
  });
}

/**
 * Get all users (Super Admin only)
 */
export async function getAllUsers(): Promise<any> {
  return fetcher(`/api/auth/list-all-users`);
}

/**
 * Update user custom claims (Super Admin only)
 */
export async function updateUserClaims(
  uid: string,
  claims: Record<string, any>
): Promise<any> {
  return fetcher(`/api/auth/set-custom-claims`, {
    method: "POST",
    body: JSON.stringify({ uid, customClaims: claims }),
  });
}

/**
 * Update user role (Admin only)
 */
export async function updateUserRole(
  uid: string,
  role: string,
  tenantId?: string
): Promise<any> {
  return fetcher(`/api/auth/update-role`, {
    method: "PATCH",
    body: JSON.stringify({ uid, role, tenantId }),
  });
}

/**
 * Remove user from tenant (Admin only)
 */
export async function removeUserFromTenant(userId: string): Promise<any> {
  return fetcher(`/api/auth/remove-user`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ===== DASHBOARD APIs =====

/**
 * Get all dashboards for a tenant
 */
export async function getDashboards(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards`);
}

/**
 * Get all unique tags from dashboards in a tenant
 */
export async function getDashboardTags(tenantId: string): Promise<string[]> {
  const response = (await fetcher(
    `/api/tenants/${tenantId}/dashboards-tags`
  )) as { tags: string[] };
  return response.tags || [];
}

/**
 * Get specific dashboard with config
 */
export async function getDashboardById(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards/${dashboardId}`);
}

/**
 * Create new dashboard
 */
export async function createDashboard(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    dataSourceId?: string; // Optional now
    config: any;
  }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update dashboard metadata
 */
export async function updateDashboard(
  tenantId: string,
  dashboardId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    status?: "draft" | "active" | "archived";
    visibility?: "private" | "public" | "org";
    dataSourceId?: string;
    selectedTable?: string;
    currentVersion?: string;
  }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards/${dashboardId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards/${dashboardId}`, {
    method: "DELETE",
  });
}

/**
 * Get all versions of a dashboard
 */
export async function getDashboardVersions(
  tenantId: string,
  dashboardId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/dashboards/${dashboardId}/versions`);
}

/**
 * Get specific version
 */
export async function getDashboardVersion(
  tenantId: string,
  dashboardId: string,
  versionId: string
): Promise<any> {
  return fetcher(
    `/api/tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}`
  );
}

/**
 * Create new version
 */
export async function createDashboardVersion(
  tenantId: string,
  dashboardId: string,
  data: {
    config: any;
    changeLog?: string;
  }
): Promise<any> {
  return fetcher(
    `/api/tenants/${tenantId}/dashboards/${dashboardId}/versions`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Update existing version
 */
export async function updateDashboardVersion(
  tenantId: string,
  dashboardId: string,
  versionId: string,
  data: {
    config: any;
    changeLog?: string;
  }
): Promise<any> {
  return fetcher(
    `/api/tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Activate specific version
 */
export async function activateDashboardVersion(
  tenantId: string,
  dashboardId: string,
  versionId: string
): Promise<any> {
  return fetcher(
    `/api/tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}/activate`,
    {
      method: "PUT",
    }
  );
}

// ===== DATA SOURCE APIs =====

/**
 * Get all data sources for a tenant
 */
export async function getDataSources(tenantId: string): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources`);
}

/**
 * Get specific data source
 */
export async function getDataSourceById(
  tenantId: string,
  dataSourceId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/${dataSourceId}`);
}

/**
 * Create new data source
 */
export async function createDataSource(
  tenantId: string,
  data: {
    name: string;
    type: string;
    connection: any;
    status?: string;
    availableTables?: string[];
  }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update data source
 */
export async function updateDataSource(
  tenantId: string,
  dataSourceId: string,
  data: {
    name: string;
    type: string;
    connection: any;
    status?: string;
    availableTables?: string[];
    selectedTable?: string;
  }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/${dataSourceId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete data source
 */
export async function deleteDataSource(
  tenantId: string,
  dataSourceId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/${dataSourceId}`, {
    method: "DELETE",
  });
}

/**
 * Test data source connection
 */
export async function testDataSourceConnection(
  tenantId: string,
  data: {
    type: string;
    connection: any;
  }
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/test`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get tables from data source
 */
export async function getDataSourceTables(
  tenantId: string,
  dataSourceId: string
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/${dataSourceId}/tables`);
}

/**
 * Preview data from a table
 */
export async function previewTableData(
  tenantId: string,
  dataSourceId: string,
  table: string,
  limit: number = 5
): Promise<{
  data: any[];
  columns: string[];
  rowCount: number;
  totalRecords: number;
}> {
  return fetcher(
    `/api/tenants/${tenantId}/datasources/${dataSourceId}/preview?table=${encodeURIComponent(
      table
    )}&limit=${limit}`
  );
}

/**
 * Get columns from a specific table
 */
export async function getDataSourceColumns(
  tenantId: string,
  dataSourceId: string,
  table: string
): Promise<any> {
  return fetcher(
    `/api/tenants/${tenantId}/datasources/${dataSourceId}/columns`,
    {
      method: "POST",
      body: JSON.stringify({ table }),
    }
  );
}

/**
 * Execute query on data source
 */
export async function executeDataSourceQuery(
  tenantId: string,
  dataSourceId: string,
  query: string,
  limit?: number
): Promise<any> {
  return fetcher(`/api/tenants/${tenantId}/datasources/${dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });
}

// ============================================
// API Keys Management
// ============================================

export interface ApiKey {
  id: string;
  tenantId: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  allowedTags?: string[];
  maxActivations?: number | null;
  activationCount?: number;
  lastActivatedAt?: string | null;
}

export interface CreateApiKeyRequest {
  description: string;
  expiresInDays?: number;
  allowedTags?: string[];
  maxActivations?: number;
}

export interface CreateApiKeyResponse {
  apiKey: string;
  tenantId: string;
  expiresAt: string | null;
  description: string;
}

/**
 * Get all API keys for a tenant
 */
export async function getApiKeys(tenantId: string): Promise<ApiKey[]> {
  return fetcher(`/api/tenants/${tenantId}/api-keys`);
}

/**
 * Create a new API key for a tenant
 */
export async function createApiKey(
  tenantId: string,
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  return fetcher(`/api/tenants/${tenantId}/api-keys`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Toggle API key active status
 */
export async function toggleApiKey(
  tenantId: string,
  keyId: string,
  isActive: boolean
): Promise<{ success: boolean }> {
  return fetcher(`/api/tenants/${tenantId}/api-keys/${keyId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  tenantId: string,
  keyId: string
): Promise<{ success: boolean }> {
  return fetcher(`/api/tenants/${tenantId}/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

// ============================================
// AI Assistant APIs
// ============================================

/**
 * Generate dashboard configuration from natural language prompt
 */
export async function generateConfigWithAI(
  tenantId: string,
  data: {
    prompt: string;
    model?: string;
    context?: {
      tableSchema?: any;
      currentConfig?: any;
      widgetType?: string;
    };
  }
): Promise<{
  success: boolean;
  config: any;
  explanation?: string;
  prompt: string;
  model: string;
}> {
  return fetcher(`/api/tenants/${tenantId}/ai-assistant/generate-config`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Chat with AI assistant about dashboard configuration
 */
export async function chatWithAI(
  tenantId: string,
  data: {
    message: string;
    model?: string;
    history?: Array<{ role: string; content: string }>;
    context?: any;
  }
): Promise<{
  success: boolean;
  response: string;
  model: string;
}> {
  return fetcher(`/api/tenants/${tenantId}/ai-assistant/chat`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
