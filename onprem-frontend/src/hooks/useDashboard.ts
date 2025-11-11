import { useState, useEffect, useCallback } from "react";
import {
  getDashboards,
  getActiveDashboardVersion,
  getDataSource,
} from "@/lib/api-client";

export interface DashboardHookResult {
  dashboards: any[];
  activeDashboard: any | null;
  activeDashboardId: string | null;
  activeVersion: any | null;
  dataSource: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  switchDashboard: (dashboardId: string) => Promise<void>;
}

/**
 * Custom hook to fetch and manage dashboard data
 */
export function useDashboard(tenantId?: string): DashboardHookResult {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<any | null>(null);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(
    null
  );
  const [activeVersion, setActiveVersion] = useState<any | null>(null);
  const [dataSource, setDataSource] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardDetails = useCallback(
    async (dashboard: any) => {
      if (!tenantId) return;

      try {
        setActiveDashboard(dashboard);
        setActiveDashboardId(dashboard.id);

        // 1. Fetch active version config
        try {
          const versionData = await getActiveDashboardVersion(
            tenantId,
            dashboard.id
          );
          setActiveVersion(versionData);
        } catch {
          console.warn("No active version found for dashboard:", dashboard.id);
          setActiveVersion(null);
        }

        // 2. Fetch data source if configured
        if (dashboard.dataSourceId) {
          try {
            const dsData = await getDataSource(
              tenantId,
              dashboard.dataSourceId
            );
            setDataSource(dsData);
          } catch (err) {
            console.warn("Failed to load data source:", err);
            setDataSource(null);
          }
        } else {
          setDataSource(null);
        }
      } catch (err) {
        console.error("Failed to load dashboard details:", err);
        throw err;
      }
    },
    [tenantId]
  );

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setError("No tenant ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all dashboards
      const dashboardsData = await getDashboards(tenantId);
      setDashboards(dashboardsData);

      // 2. Find active dashboards (status === "active")
      const activeDashboards = dashboardsData.filter(
        (d: any) => d.status === "active"
      );

      if (activeDashboards.length > 0) {
        // Load first active dashboard by default
        await loadDashboardDetails(activeDashboards[0]);
      } else {
        setActiveDashboard(null);
        setActiveVersion(null);
        setDataSource(null);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantId, loadDashboardDetails]);

  const switchDashboard = useCallback(
    async (dashboardId: string) => {
      const dashboard = dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) {
        console.warn("Dashboard not found:", dashboardId);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await loadDashboardDetails(dashboard);
      } catch (err) {
        console.error("Failed to switch dashboard:", err);
        setError(
          err instanceof Error ? err.message : "Failed to switch dashboard"
        );
      } finally {
        setLoading(false);
      }
    },
    [dashboards, loadDashboardDetails]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    dashboards,
    activeDashboard,
    activeDashboardId,
    activeVersion,
    dataSource,
    loading,
    error,
    refetch: fetchData,
    switchDashboard,
  };
}
