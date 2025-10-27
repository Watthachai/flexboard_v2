import { useEffect, useState } from "react";

interface UseConfigOptions {
  shouldFetch?: boolean;
}

export function useConfig(options: UseConfigOptions = {}) {
  const { shouldFetch = true } = options;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/config");
        if (!response.ok) {
          throw new Error("Failed to fetch config");
        }
        const config = await response.json();
        setData(config);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [shouldFetch]);

  return { data, isLoading, error };
}

export function useWidgets(options: UseConfigOptions = {}) {
  const { shouldFetch = true } = options;
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      setIsLoading(false);
      return;
    }

    const fetchWidgets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/widgets");
        if (!response.ok) {
          throw new Error("Failed to fetch widgets");
        }
        const widgets = await response.json();
        setData(widgets);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWidgets();
  }, [shouldFetch]);

  return { data, isLoading, error };
}

export function useCharts(options: UseConfigOptions = {}) {
  const { shouldFetch = true } = options;
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      setIsLoading(false);
      return;
    }

    const fetchCharts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/charts");
        if (!response.ok) {
          throw new Error("Failed to fetch charts");
        }
        const charts = await response.json();
        setData(charts);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharts();
  }, [shouldFetch]);

  return { data, isLoading, error };
}
