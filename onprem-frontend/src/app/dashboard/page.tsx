"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardConfig {
  tenantId: string;
  name: string;
  dashboards: any[];
}

export default function DashboardPage() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Check if user is authenticated
        const tenantId = localStorage.getItem("tenantId");
        if (!tenantId) {
          router.push("/");
          return;
        }

        // Load config from localStorage first
        const storedConfig = localStorage.getItem("dashboardConfig");
        if (storedConfig) {
          setConfig(JSON.parse(storedConfig));
        }

        // Optionally refresh from server
        const response = await fetch(`/api/config?tenantId=${tenantId}`);
        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }

        const freshConfig = await response.json();
        setConfig(freshConfig);
        localStorage.setItem("dashboardConfig", JSON.stringify(freshConfig));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("tenantId");
    localStorage.removeItem("inviteCode");
    localStorage.removeItem("dashboardConfig");

    // Clear cookie
    document.cookie = "tenantId=; path=/; max-age=0";

    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No configuration found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-gray-600">Tenant ID: {config.tenantId}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {config.dashboards && config.dashboards.length > 0 ? (
          <div className="space-y-6">
            {config.dashboards.map((dashboard: any) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {dashboard.title}
                </h2>

                {/* Widgets Grid */}
                <div
                  className={`grid gap-4 ${
                    dashboard.layout === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  }`}
                >
                  {dashboard.widgets?.map((widget: any) => (
                    <div
                      key={widget.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {widget.type}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {widget.chartType || widget.id}
                      </p>
                      {/* Widget will be rendered here */}
                      <div className="mt-4 h-64 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <p className="text-gray-500">Widget: {widget.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No dashboards configured yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
