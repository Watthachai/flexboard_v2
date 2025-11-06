import { useState, useEffect } from "react";
import {
  getDashboards,
  getActiveDashboardVersion,
  getDataSource,
} from "@/lib/api";

export interface DashboardHookResult {
  dashboards: any[];
  activeDashboard: any | null;
  activeVersion: any | null;
  dataSource: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage dashboard data
 */
export function useDashboard(tenantId?: string): DashboardHookResult {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<any | null>(null);
  const [activeVersion, setActiveVersion] = useState<any | null>(null);
  const [dataSource, setDataSource] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
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

      // 2. Find active dashboard (status === "active")
      const active = dashboardsData.find((d: any) => d.status === "active");
      if (active) {
        setActiveDashboard(active);

        // 3. Fetch active version config
        try {
          const versionData = await getActiveDashboardVersion(
            tenantId,
            active.id
          );
          setActiveVersion(versionData);
        } catch (err) {
          console.warn("No active version found for dashboard:", active.id);
          setActiveVersion(null);
        }

        // 4. Fetch data source if configured
        if (active.dataSourceId) {
          try {
            const dsData = await getDataSource(tenantId, active.dataSourceId);
            setDataSource(dsData);
          } catch (err) {
            console.warn("Failed to load data source:", err);
            setDataSource(null);
          }
        }
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
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    dashboards,
    activeDashboard,
    activeVersion,
    dataSource,
    loading,
    error,
    refetch: fetchData,
  };
}
