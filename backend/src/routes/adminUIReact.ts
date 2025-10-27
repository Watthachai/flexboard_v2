import express from "express";

const router = express.Router();

/**
 * GET /admin/invite-codes
 * Serve Admin UI for managing invite codes (React-like with Preact + htm)
 */
router.get("/invite-codes", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Invite Codes Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .animate-slide-up {
      animation: slideUp 0.3s ease-out;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    console.log('Script loaded');
    
    import { h, render } from 'https://esm.sh/preact@10.19.3';
    import { useState, useEffect } from 'https://esm.sh/preact@10.19.3/hooks';
    import htm from 'https://esm.sh/htm@3.1.1';
    
    console.log('Imports successful', { h, render, useState, useEffect, htm });
    
    const html = htm.bind(h);
    console.log('html function created');

    // API Base URL
    const API_BASE = '/api/invite-codes';

    // Icon Components (Simple SVG)
    const Icon = ({ name, className = "w-4 h-4" }) => {
      const icons = {
        plus: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>\`,
        copy: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>\`,
        ban: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>\`,
        trash: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>\`,
        logout: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>\`,
        x: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>\`,
        check: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>\`,
        alert: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>\`,
        info: html\`<svg class="\${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>\`,
      };
      return icons[name] || null;
    };

    // Toast Component
    const Toast = ({ title, message, type, onClose }) => {
      useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
      }, []);

      const borderColors = {
        success: 'border-green-500',
        error: 'border-red-500',
        info: 'border-blue-500',
      };

      const iconTypes = {
        success: 'check',
        error: 'alert',
        info: 'info',
      };

      return html\`
        <div class="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div class="bg-white rounded-lg shadow-lg border-l-4 \${borderColors[type]} p-4 max-w-md">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                <\${Icon} name="\${iconTypes[type]}" className="w-5 h-5 text-\${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'}-500" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-gray-900">\${title}</h3>
                <p class="mt-1 text-sm text-gray-600">\${message}</p>
              </div>
              <button onClick=\${onClose} class="flex-shrink-0 text-gray-400 hover:text-gray-600">
                <\${Icon} name="x" />
              </button>
            </div>
          </div>
        </div>
      \`;
    };

    // Create Modal Component
    const CreateModal = ({ onClose, onCreate, token }) => {
      const [tenants, setTenants] = useState([]);
      const [loadingTenants, setLoadingTenants] = useState(true);
      const [isNewTenant, setIsNewTenant] = useState(false);
      const [formData, setFormData] = useState({
        tenantId: '',
        tenantName: '',
        role: 'user',
        maxUses: '',
        expiresAt: '',
      });

      // Fetch tenants list on mount
      useEffect(() => {
        const fetchTenants = async () => {
          try {
            const response = await fetch('/api/tenants', {
              headers: { Authorization: \`Bearer \${token}\` },
            });
            if (response.ok) {
              const data = await response.json();
              setTenants(data);
            }
          } catch (error) {
            console.error('Failed to fetch tenants:', error);
          } finally {
            setLoadingTenants(false);
          }
        };
        fetchTenants();
      }, [token]);

      const handleTenantSelect = (e) => {
        const value = e.target.value;
        if (value === '__new__') {
          setIsNewTenant(true);
          setFormData({ ...formData, tenantId: '', tenantName: '' });
        } else if (value) {
          const selected = tenants.find(t => t.id === value);
          setIsNewTenant(false);
          setFormData({ ...formData, tenantId: value, tenantName: selected?.name || '' });
        } else {
          setIsNewTenant(false);
          setFormData({ ...formData, tenantId: '', tenantName: '' });
        }
      };

      // Auto-format Tenant ID: lowercase, replace spaces and special chars with underscore
      const handleTenantIdInput = (e) => {
        const raw = e.target.value;
        // Convert to lowercase, replace spaces and special chars with underscore, remove consecutive underscores
        const formatted = raw
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
        
        setFormData({ ...formData, tenantId: formatted });
      };

      // Auto-generate Tenant ID from Tenant Name
      const handleTenantNameInput = (e) => {
        const name = e.target.value;
        setFormData({ ...formData, tenantName: name });
        
        // Auto-generate ID if it's empty or not manually edited
        if (isNewTenant && !formData.tenantId) {
          const autoId = name
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          setFormData({ ...formData, tenantName: name, tenantId: autoId });
        }
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
          tenantId: formData.tenantId,
          tenantName: formData.tenantName,
          role: formData.role,
        };
        if (formData.maxUses) data.maxUses = parseInt(formData.maxUses);
        if (formData.expiresAt) data.expiresAt = new Date(formData.expiresAt).toISOString();
        onCreate(data);
      };

      return html\`
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 class="text-xl font-bold text-gray-900">Create Invite Code</h2>
              <button onClick=\${onClose} class="text-gray-400 hover:text-gray-600">
                <\${Icon} name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit=\${handleSubmit} class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Select Tenant <span class="text-red-500">*</span>
                </label>
                \${loadingTenants ? html\`
                  <div class="text-sm text-gray-500">Loading tenants...</div>
                \` : html\`
                  <select
                    required
                    value=\${isNewTenant ? '__new__' : formData.tenantId}
                    onChange=\${handleTenantSelect}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">-- Select a tenant --</option>
                    \${tenants.map(tenant => html\`
                      <option key=\${tenant.id} value=\${tenant.id}>
                        \${tenant.name} (\${tenant.id})
                      </option>
                    \`)}
                    <option value="__new__">➕ Create New Tenant</option>
                  </select>
                \`}
              </div>

              \${isNewTenant && html\`
                <div class="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                  <h3 class="text-sm font-medium text-blue-900 mb-3">New Tenant Information</h3>
                  
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Name <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value=\${formData.tenantName}
                        onInput=\${handleTenantNameInput}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="e.g., Acme Corporation"
                      />
                      <p class="mt-1 text-xs text-gray-500">Enter the company name</p>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Tenant ID <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value=\${formData.tenantId}
                        onInput=\${handleTenantIdInput}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                        placeholder="auto-generated from name"
                      />
                      <p class="mt-1 text-xs text-green-600">✓ Auto-formatted: lowercase, numbers, and underscores only</p>
                    </div>
                  </div>
                </div>
              \`}

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Role <span class="text-red-500">*</span>
                </label>
                <select
                  value=\${formData.role}
                  onChange=\${(e) => setFormData({ ...formData, role: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="admin">Admin - ผู้ดูแลระบบ (จัดการทุกอย่าง)</option>
                  <option value="sales">Sales - พนักงานขาย (จัดการลูกค้า)</option>
                  <option value="viewer">Viewer - ผู้ดู (อ่านอย่างเดียว)</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Max Uses (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value=\${formData.maxUses}
                  onInput=\${(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value=\${formData.expiresAt}
                  onInput=\${(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick=\${onClose}
                  class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      \`;
    };

    // Login Page Component
    const LoginPage = ({ onLogin }) => {
      const [token, setToken] = useState('');
      const [error, setError] = useState('');

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token.trim()) {
          setError('Please enter your token');
          return;
        }

        try {
          const response = await fetch(API_BASE, {
            headers: { Authorization: \`Bearer \${token}\` },
          });

          if (response.ok) {
            onLogin(token);
          } else {
            setError('Invalid token. Please check and try again.');
          }
        } catch (err) {
          setError('Failed to verify token. Please try again.');
        }
      };

      return html\`
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div class="w-full max-w-md">
            <div class="bg-white rounded-lg shadow-xl p-8">
              <div class="flex items-center justify-center mb-8">
                <div class="bg-blue-600 p-3 rounded-full">
                  <\${Icon} name="info" className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1 class="text-2xl font-bold text-center text-gray-800 mb-2">Admin Login</h1>
              <p class="text-center text-gray-600 mb-8">Enter your authentication token to continue</p>

              <form onSubmit=\${handleSubmit}>
                <div class="mb-6">
                  <label for="token" class="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Token
                  </label>
                  <input
                    type="password"
                    id="token"
                    value=\${token}
                    onInput=\${(e) => setToken(e.target.value)}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Enter your token"
                    autofocus
                  />
                </div>

                \${error && html\`
                  <div class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-600">\${error}</p>
                  </div>
                \`}

                <button
                  type="submit"
                  class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Login
                </button>
              </form>

              <div class="mt-6 text-center">
                <p class="text-xs text-gray-500">Get your token from Firebase Authentication</p>
              </div>
            </div>
          </div>
        </div>
      \`;
    };

    // Main Invite Codes Page Component
    const InviteCodesPage = ({ token, onLogout }) => {
      const [inviteCodes, setInviteCodes] = useState([]);
      const [statistics, setStatistics] = useState({ total: 0, active: 0, revoked: 0, expired: 0 });
      const [loading, setLoading] = useState(true);
      const [showCreateModal, setShowCreateModal] = useState(false);
      const [toast, setToast] = useState(null);

      const showToast = (title, message, type = 'info') => {
        setToast({ title, message, type });
      };

      const fetchInviteCodes = async () => {
        try {
          const response = await fetch(API_BASE, {
            headers: { Authorization: \`Bearer \${token}\` },
          });

          if (!response.ok) throw new Error('Failed to fetch');

          const data = await response.json();
          setInviteCodes(data);

          // Calculate statistics
          const now = new Date();
          const stats = { total: data.length, active: 0, revoked: 0, expired: 0 };
          data.forEach((code) => {
            if (!code.isActive) stats.revoked++;
            else if (code.expiresAt && new Date(code.expiresAt) < now) stats.expired++;
            else stats.active++;
          });
          setStatistics(stats);
        } catch (error) {
          showToast('Error', 'Failed to load invite codes', 'error');
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchInviteCodes();
      }, []);

      const handleCreateCode = async (data) => {
        try {
          const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: \`Bearer \${token}\`,
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) throw new Error('Failed to create');

          const newCode = await response.json();
          showToast('Success', \`Invite code created: \${newCode.code}\`, 'success');
          fetchInviteCodes();
          setShowCreateModal(false);
        } catch (error) {
          showToast('Error', 'Failed to create invite code', 'error');
        }
      };

      const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        showToast('Copied', \`Code \${code} copied to clipboard\`, 'success');
      };

      const handleRevokeCode = async (code) => {
        if (!confirm(\`Revoke code \${code}?\`)) return;

        try {
          const response = await fetch(\`\${API_BASE}/\${code}/revoke\`, {
            method: 'POST',
            headers: { Authorization: \`Bearer \${token}\` },
          });

          if (!response.ok) throw new Error('Failed to revoke');

          showToast('Success', \`Code \${code} has been revoked\`, 'success');
          fetchInviteCodes();
        } catch (error) {
          showToast('Error', 'Failed to revoke invite code', 'error');
        }
      };

      const handleDeleteCode = async (code) => {
        if (!confirm(\`Delete code \${code}? This cannot be undone.\`)) return;

        try {
          const response = await fetch(\`\${API_BASE}/\${code}\`, {
            method: 'DELETE',
            headers: { Authorization: \`Bearer \${token}\` },
          });

          if (!response.ok) throw new Error('Failed to delete');

          showToast('Success', \`Code \${code} has been deleted\`, 'success');
          fetchInviteCodes();
        } catch (error) {
          showToast('Error', 'Failed to delete invite code', 'error');
        }
      };

      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const getStatusBadge = (code) => {
        if (!code.isActive) {
          return html\`<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Revoked</span>\`;
        }
        if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
          return html\`<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Expired</span>\`;
        }
        return html\`<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>\`;
      };

      if (loading) {
        return html\`
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="text-gray-600">Loading...</div>
          </div>
        \`;
      }

      return html\`
        <div class="min-h-screen bg-gray-50">
          <!-- Header -->
          <div class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold text-gray-900">Invite Codes Management</h1>
                <button
                  onClick=\${onLogout}
                  class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <\${Icon} name="logout" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div class="bg-white p-6 rounded-lg shadow">
                <div class="text-sm font-medium text-gray-600">Total Codes</div>
                <div class="mt-2 text-3xl font-bold text-gray-900">\${statistics.total}</div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow">
                <div class="text-sm font-medium text-gray-600">Active Codes</div>
                <div class="mt-2 text-3xl font-bold text-green-600">\${statistics.active}</div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow">
                <div class="text-sm font-medium text-gray-600">Revoked Codes</div>
                <div class="mt-2 text-3xl font-bold text-red-600">\${statistics.revoked}</div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow">
                <div class="text-sm font-medium text-gray-600">Expired Codes</div>
                <div class="mt-2 text-3xl font-bold text-yellow-600">\${statistics.expired}</div>
              </div>
            </div>

            <!-- Actions -->
            <div class="mb-6">
              <button
                onClick=\${() => setShowCreateModal(true)}
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <\${Icon} name="plus" />
                Create Invite Code
              </button>
            </div>

            <!-- Table -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    \${inviteCodes.map((code) => html\`
                      <tr key=\${code.code} class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex items-center gap-2">
                            <code class="text-sm font-mono font-medium text-gray-900">\${code.code}</code>
                            <button
                              onClick=\${() => handleCopyCode(code.code)}
                              class="text-gray-400 hover:text-gray-600"
                              title="Copy code"
                            >
                              <\${Icon} name="copy" />
                            </button>
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm text-gray-900">\${code.tenantName}</div>
                          <div class="text-xs text-gray-500">\${code.tenantId}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            \${code.role}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          \${code.usedCount} / \${code.maxUses || '∞'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">\${getStatusBadge(code)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          \${code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                          <div class="flex items-center gap-2">
                            \${code.isActive && html\`
                              <button
                                onClick=\${() => handleRevokeCode(code.code)}
                                class="text-yellow-600 hover:text-yellow-900"
                                title="Revoke code"
                              >
                                <\${Icon} name="ban" />
                              </button>
                            \`}
                            <button
                              onClick=\${() => handleDeleteCode(code.code)}
                              class="text-red-600 hover:text-red-900"
                              title="Delete code"
                            >
                              <\${Icon} name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    \`)}
                  </tbody>
                </table>

                \${inviteCodes.length === 0 && html\`
                  <div class="text-center py-12">
                    <p class="text-gray-500">No invite codes found. Create one to get started!</p>
                  </div>
                \`}
              </div>
            </div>
          </div>

          <!-- Modals -->
          \${showCreateModal && html\`
            <\${CreateModal}
              token=\${token}
              onClose=\${() => setShowCreateModal(false)}
              onCreate=\${handleCreateCode}
            />
          \`}

          <!-- Toast -->
          \${toast && html\`
            <\${Toast}
              title=\${toast.title}
              message=\${toast.message}
              type=\${toast.type}
              onClose=\${() => setToast(null)}
            />
          \`}
        </div>
      \`;
    };

    // Main App Component
    const App = () => {
      const [token, setToken] = useState(null);
      const [isLoading, setIsLoading] = useState(true);

      useEffect(() => {
        const savedToken = sessionStorage.getItem('adminToken');
        if (savedToken) setToken(savedToken);
        setIsLoading(false);
      }, []);

      const handleLogin = (newToken) => {
        sessionStorage.setItem('adminToken', newToken);
        setToken(newToken);
      };

      const handleLogout = () => {
        sessionStorage.removeItem('adminToken');
        setToken(null);
      };

      if (isLoading) {
        return html\`
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="text-gray-600">Loading...</div>
          </div>
        \`;
      }

      if (!token) {
        return html\`<\${LoginPage} onLogin=\${handleLogin} />\`;
      }

      return html\`<\${InviteCodesPage} token=\${token} onLogout=\${handleLogout} />\`;
    };

    // Render the app
    console.log('Rendering app...');
    const root = document.getElementById('root');
    console.log('Root element:', root);
    
    try {
      render(html\`<\${App} />\`, root);
      console.log('Render successful!');
    } catch (error) {
      console.error('Render error:', error);
      root.innerHTML = '<div style="padding: 20px; color: red;">Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>
  `;

  res.send(html);
});

/**
 * GET /admin/users
 * Serve Admin UI for managing users
 */
router.get("/users", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - User Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    import { h, render } from 'https://esm.sh/preact@10.19.3';
    import { useState, useEffect } from 'https://esm.sh/preact@10.19.3/hooks';
    import htm from 'https://esm.sh/htm@3.1.1';
    
    const html = htm.bind(h);

    // ===== Login Page =====
    const LoginPage = ({ onLogin }) => {
      const [token, setToken] = useState('');
      const [error, setError] = useState('');

      const handleLogin = () => {
        if (!token.trim()) {
          setError('Please enter authentication token');
          return;
        }
        sessionStorage.setItem('authToken', token);
        onLogin(token);
      };

      return html\`
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">🔐 User Management</h1>
            <p class="text-gray-600 mb-6 text-center">Super Admin Only</p>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Authentication Token
              </label>
              <textarea
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-xs"
                rows="4"
                placeholder="Paste your Firebase ID token here..."
                value=\${token}
                onInput=\${(e) => setToken(e.target.value)}
              ></textarea>
              \${error ? html\`<p class="mt-2 text-sm text-red-600">\${error}</p>\` : ''}
            </div>

            <button
              onClick=\${handleLogin}
              class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Login
            </button>

            <div class="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-600">
              <p class="font-medium mb-2">💡 How to get token:</p>
              <code class="block bg-white p-2 rounded border text-xs">
                cd backend && npm run get-id-token
              </code>
            </div>
          </div>
        </div>
      \`;
    };

    // ===== User Management Page =====
    const UserManagementPage = ({ token, onLogout }) => {
      const [users, setUsers] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [searchTerm, setSearchTerm] = useState('');
      const [filterTenant, setFilterTenant] = useState('all');
      const [tenants, setTenants] = useState([]);

      // Fetch users
      const fetchUsers = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/auth/list-all-users', {
            headers: { 'Authorization': \`Bearer \${token}\` }
          });

          if (!response.ok) {
            if (response.status === 403) {
              setError('Access denied. Super Admin only.');
              return;
            }
            throw new Error('Failed to fetch users');
          }

          const data = await response.json();
          setUsers(data.users);

          // Extract unique tenants
          const uniqueTenants = [...new Set(data.users.map(u => u.tenantId).filter(Boolean))];
          setTenants(uniqueTenants);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      // Remove user from tenant
      const removeUser = async (user) => {
        if (!confirm(\`Remove \${user.email} from tenant \${user.tenantId}?\`)) return;

        try {
          const response = await fetch('/api/auth/remove-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ userId: user.uid })
          });

          if (!response.ok) throw new Error('Failed to remove user');

          alert(
            '✅ User removed successfully!\\n\\n' +
            '⚠️ IMPORTANT: The user still has an active session.\\n' +
            'They must SIGN OUT and SIGN IN again for changes to take effect.\\n\\n' +
            'Until then, their old token (with tenantId) is still valid for up to 1 hour.'
          );
          fetchUsers(); // Refresh list
        } catch (err) {
          alert('Error: ' + err.message);
        }
      };

      // Update user role
      const updateUserRole = async (user) => {
        const newRole = prompt(
          \`Change role for \${user.email}\\n\\nCurrent: \${user.role || 'none'}\\n\\nEnter new role (admin/sales/viewer):\`,
          user.role || 'viewer'
        );

        if (!newRole) return;

        if (!['admin', 'sales', 'viewer'].includes(newRole.toLowerCase())) {
          alert('❌ Invalid role! Must be: admin, sales, or viewer');
          return;
        }

        try {
          const response = await fetch('/api/auth/update-role', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ 
              uid: user.uid,
              role: newRole.toLowerCase(),
              tenantId: user.tenantId
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update role');
          }

          alert(
            \`✅ Role updated successfully!\\n\\n\` +
            \`User: \${user.email}\\n\` +
            \`New Role: \${newRole}\\n\\n\` +
            \`⚠️ IMPORTANT: The user must SIGN OUT and SIGN IN again for changes to take effect.\`
          );
          fetchUsers(); // Refresh list
        } catch (err) {
          alert('❌ Error: ' + err.message);
        }
      };

      useEffect(() => {
        fetchUsers();
      }, []);

      // Filter users
      const filteredUsers = users.filter(user => {
        const matchSearch = !searchTerm || 
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchTenant = filterTenant === 'all' || 
          (filterTenant === 'none' && !user.tenantId) ||
          user.tenantId === filterTenant;

        return matchSearch && matchTenant;
      });

      return html\`
        <div class="min-h-screen bg-gray-50">
          <!-- Header -->
          <div class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <div class="flex justify-between items-center">
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">👥 User Management</h1>
                  <p class="text-sm text-gray-600 mt-1">Manage users across all tenants</p>
                </div>
                <div class="flex gap-3">
                  <a href="/admin/invite-codes" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    🎟️ Invite Codes
                  </a>
                  <button onClick=\${onLogout} class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <!-- Filters -->
            <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">🔍 Search</label>
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value=\${searchTerm}
                    onInput=\${(e) => setSearchTerm(e.target.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">🏢 Tenant Filter</label>
                  <select
                    value=\${filterTenant}
                    onChange=\${(e) => setFilterTenant(e.target.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="all">All Tenants</option>
                    <option value="none">No Tenant (Unassigned)</option>
                    \${tenants.map(t => html\`<option value=\${t}>\${t}</option>\`)}
                  </select>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-white rounded-lg shadow-sm border p-4">
                <div class="text-sm text-gray-600">Total Users</div>
                <div class="text-2xl font-bold text-gray-900">\${users.length}</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm border p-4">
                <div class="text-sm text-gray-600">With Tenant</div>
                <div class="text-2xl font-bold text-green-600">\${users.filter(u => u.tenantId).length}</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm border p-4">
                <div class="text-sm text-gray-600">Unassigned</div>
                <div class="text-2xl font-bold text-orange-600">\${users.filter(u => !u.tenantId).length}</div>
              </div>
              <div class="bg-white rounded-lg shadow-sm border p-4">
                <div class="text-sm text-gray-600">Filtered Results</div>
                <div class="text-2xl font-bold text-blue-600">\${filteredUsers.length}</div>
              </div>
            </div>

            <!-- Users Table -->
            \${loading ? html\`
              <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-gray-600">Loading users...</p>
              </div>
            \` : error ? html\`
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-600">\${error}</p>
              </div>
            \` : html\`
              <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sign In</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      \${filteredUsers.length === 0 ? html\`
                        <tr>
                          <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      \` : filteredUsers.map(user => html\`
                        <tr key=\${user.uid} class="hover:bg-gray-50">
                          <td class="px-6 py-4">
                            <div class="flex items-center">
                              \${user.photoURL ? html\`
                                <img src=\${user.photoURL} alt="" class="h-10 w-10 rounded-full mr-3" />
                              \` : html\`
                                <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                                  <span class="text-gray-600 font-medium">\${user.email?.[0]?.toUpperCase()}</span>
                                </div>
                              \`}
                              <div>
                                <div class="text-sm font-medium text-gray-900">\${user.displayName || 'N/A'}</div>
                                <div class="text-sm text-gray-500">\${user.email}</div>
                                <div class="text-xs text-gray-400">UID: \${user.uid}</div>
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            \${user.tenantId ? html\`
                              <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">\${user.tenantId}</span>
                            \` : html\`
                              <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">No Tenant</span>
                            \`}
                          </td>
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                              \${user.role ? html\`
                                <span class="px-2 py-1 text-xs font-medium \${
                                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                  user.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                } rounded">\${user.role}</span>
                              \` : html\`
                                <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">No role</span>
                              \`}
                              <button
                                onClick=\${() => updateUserRole(user)}
                                class="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                                title="Change role"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </td>
                          <td class="px-6 py-4 text-sm text-gray-500">
                            \${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Never'}
                          </td>
                          <td class="px-6 py-4">
                            \${user.tenantId ? html\`
                              <button
                                onClick=\${() => removeUser(user)}
                                class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                              >
                                🗑️ Remove from Tenant
                              </button>
                            \` : html\`
                              <span class="text-xs text-gray-400">No action needed</span>
                            \`}
                          </td>
                        </tr>
                      \`)}
                    </tbody>
                  </table>
                </div>
              </div>
            \`}
          </div>
        </div>
      \`;
    };

    // ===== Main App =====
    const App = () => {
      const [token, setToken] = useState(sessionStorage.getItem('authToken') || '');

      const handleLogin = (newToken) => {
        setToken(newToken);
      };

      const handleLogout = () => {
        sessionStorage.removeItem('authToken');
        setToken('');
      };

      return token 
        ? html\`<\${UserManagementPage} token=\${token} onLogout=\${handleLogout} />\`
        : html\`<\${LoginPage} onLogin=\${handleLogin} />\`;
    };

    // ===== Render =====
    render(html\`<\${App} />\`, document.getElementById('root'));
  </script>
</body>
</html>
  `;

  res.send(html);
});

export default router;
