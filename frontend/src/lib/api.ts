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
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Force refresh token to get latest custom claims (isSuperAdmin, isAdmin)
  const token = await user.getIdToken(true);

  const response = await fetch(`${BACKEND_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error (${response.status}): ${errorText || response.statusText}`
    );
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
