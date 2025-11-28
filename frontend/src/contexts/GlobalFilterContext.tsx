"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  GlobalFilter,
  GlobalFilterValues,
} from "@/components/dashboard/GlobalFilters";

interface GlobalFilterContextType {
  filters: GlobalFilter[];
  values: GlobalFilterValues;
  setFilters: (filters: GlobalFilter[]) => void;
  setValues: (values: GlobalFilterValues) => void;
  updateValue: (filterId: string, value: any) => void;
  resetFilters: () => void;
  getFilterConditions: () => FilterCondition[];
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(
  undefined
);

export function GlobalFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filters, setFilters] = useState<GlobalFilter[]>([]);
  const [values, setValues] = useState<GlobalFilterValues>({});

  const updateValue = useCallback((filterId: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    const defaultValues: GlobalFilterValues = {};
    filters.forEach((filter) => {
      if (filter.defaultValue !== undefined) {
        defaultValues[filter.id] = filter.defaultValue;
      }
    });
    setValues(defaultValues);
  }, [filters]);

  // Convert filter values to SQL-compatible conditions
  const getFilterConditions = useCallback((): FilterCondition[] => {
    const conditions: FilterCondition[] = [];

    filters.forEach((filter) => {
      const value = values[filter.id];

      // Skip empty values
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "__ALL__"
      ) {
        return;
      }

      switch (filter.type) {
        case "dateRange":
          if (value.start) {
            conditions.push({
              field: filter.field,
              operator: ">=",
              value: value.start,
            });
          }
          if (value.end) {
            conditions.push({
              field: filter.field,
              operator: "<=",
              value: value.end,
            });
          }
          break;

        case "dropdown":
          conditions.push({
            field: filter.field,
            operator: "=",
            value: value,
          });
          break;

        case "multiSelect":
          if (Array.isArray(value) && value.length > 0) {
            conditions.push({
              field: filter.field,
              operator: "IN",
              value: value,
            });
          }
          break;

        case "text":
          conditions.push({
            field: filter.field,
            operator: "LIKE",
            value: value,
          });
          break;

        case "number":
          conditions.push({
            field: filter.field,
            operator: "=",
            value: value,
          });
          break;
      }
    });

    return conditions;
  }, [filters, values]);

  const contextValue = useMemo(
    () => ({
      filters,
      values,
      setFilters,
      setValues,
      updateValue,
      resetFilters,
      getFilterConditions,
    }),
    [filters, values, updateValue, resetFilters, getFilterConditions]
  );

  return (
    <GlobalFilterContext.Provider value={contextValue}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(GlobalFilterContext);
  if (context === undefined) {
    throw new Error(
      "useGlobalFilters must be used within a GlobalFilterProvider"
    );
  }
  return context;
}

export default GlobalFilterContext;
