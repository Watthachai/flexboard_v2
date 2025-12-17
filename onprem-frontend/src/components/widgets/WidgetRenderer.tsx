"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { executeQuery } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

// Import chart components
import BarChartWidget from "./BarChartWidget";
import LineChartWidget from "./LineChartWidget";
import AreaChartWidget from "./AreaChartWidget";
import PieChartWidget from "./PieChartWidget";
import DoughnutChartWidget from "./DoughnutChartWidget";
import TableWidget from "./TableWidget";
import KPIWidget from "./KPIWidget";
import GaugeWidget from "./GaugeWidget";
import ProgressBarWidget from "./ProgressBarWidget";
import MetricCardWidget from "./MetricCardWidget";
import ScatterPlotWidget from "./ScatterPlotWidget";

interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

interface WidgetRendererProps {
  widget: any;
  tenantId: string;
  dataSourceId: string;
  globalFilters?: FilterCondition[];
}

export default function WidgetRenderer({
  widget,
  tenantId,
  dataSourceId,
  globalFilters = [],
}: WidgetRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      //console.log("WidgetRenderer Debug:", {
      //widgetId: widget.id,
      //widgetTitle: widget.title,
      //hasDataSourceId: !!dataSourceId,
      //dataSourceId,
      //hasDataConfig: !!widget.dataConfig,
      //dataConfig: widget.dataConfig,
      //hasQuery: !!widget.dataConfig?.query,
      //query: widget.dataConfig?.query,
      //hasTable: !!widget.dataConfig?.table,
      //table: widget.dataConfig?.table,
      //});

      if (!dataSourceId || !widget.dataConfig) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build query from dataConfig
        let query = "";

        if (widget.dataConfig.query) {
          // Use custom query if provided
          query = widget.dataConfig.query;
        } else if (widget.dataConfig.table) {
          // Build query from table and fields
          const {
            xField,
            yField,
            field,
            labelField,
            valueField,
            aggregation,
            groupBy,
            orderBy,
            table,
            filters,
            having,
            limit,
          } = widget.dataConfig;

          const selectFields = [];
          const hasGroupBy = groupBy && groupBy.length > 0;

          // Handle different field types for different widgets
          if (labelField && valueField) {
            // For pie/doughnut charts using labelField and valueField
            // Only add labelField if no GROUP BY or if in GROUP BY
            if (!hasGroupBy || (groupBy && groupBy.includes(labelField))) {
              selectFields.push(labelField);
            }
            if (aggregation && hasGroupBy) {
              selectFields.push(
                `${aggregation.toUpperCase()}(${valueField}) as ${valueField}`
              );
            } else {
              selectFields.push(valueField);
            }
          } else if (field) {
            // For KPI/metric widgets using single field
            if (aggregation) {
              selectFields.push(
                `${aggregation.toUpperCase()}(${field}) as ${field}`
              );
            } else {
              selectFields.push(field);
            }
          } else if (widget.dataConfig.multiLine && widget.dataConfig.lines) {
            // For multi-line charts - add xField and all yFields from lines array
            if (xField) {
              if (!hasGroupBy || (groupBy && groupBy.includes(xField))) {
                selectFields.push(xField);
              }
            }
            // Add each line's yField with its aggregation
            widget.dataConfig.lines.forEach((line: any) => {
              if (line.yField) {
                const lineAgg = line.aggregation || aggregation;
                if (lineAgg && hasGroupBy) {
                  selectFields.push(
                    `${lineAgg.toUpperCase()}(${line.yField}) as ${line.yField}`
                  );
                } else {
                  selectFields.push(line.yField);
                }
              }
            });
          } else if (widget.dataConfig.multiBar && widget.dataConfig.bars) {
            // For multi-bar charts - add xField and all yFields from bars array
            if (xField) {
              if (!hasGroupBy || (groupBy && groupBy.includes(xField))) {
                selectFields.push(xField);
              }
            }
            // Add each bar's yField with its aggregation
            widget.dataConfig.bars.forEach((bar: any) => {
              if (bar.yField) {
                const barAgg = bar.aggregation || aggregation;
                if (barAgg && hasGroupBy) {
                  selectFields.push(
                    `${barAgg.toUpperCase()}(${bar.yField}) as ${bar.yField}`
                  );
                } else {
                  selectFields.push(bar.yField);
                }
              }
            });
          } else if (widget.dataConfig.seriesField) {
            // For seriesField multi-line charts - need xField, seriesField and yField
            const { seriesField } = widget.dataConfig;
            if (xField) {
              selectFields.push(xField);
            }
            // seriesField must be in SELECT for GROUP BY to work
            selectFields.push(seriesField);
            if (yField) {
              if (aggregation && hasGroupBy) {
                selectFields.push(
                  `${aggregation.toUpperCase()}(${yField}) as ${yField}`
                );
              } else {
                selectFields.push(yField);
              }
            }
          } else {
            // Standard xField/yField approach
            if (xField) {
              // Only add xField if no GROUP BY or if in GROUP BY
              if (!hasGroupBy || (groupBy && groupBy.includes(xField))) {
                selectFields.push(xField);
              }
            }
            if (yField) {
              if (aggregation && hasGroupBy) {
                selectFields.push(
                  `${aggregation.toUpperCase()}(${yField}) as ${yField}`
                );
              } else {
                selectFields.push(yField);
              }
            }
          }

          const selectClause =
            selectFields.length > 0 ? selectFields.join(", ") : "*";

          // For SQL Server, use TOP instead of LIMIT/OFFSET
          // Skip TOP if unlimited is true or limit is 0/-1
          const shouldLimit =
            limit && limit > 0 && !widget.dataConfig?.unlimited;
          const topClause = shouldLimit ? `TOP ${limit} ` : "";
          query = `SELECT ${topClause}${selectClause} FROM ${table}`;

          // Add WHERE clause for filters (including global filters)
          const allFilters = [...(filters || []), ...globalFilters];
          if (allFilters.length > 0) {
            const whereConditions = allFilters.map((filter: any) => {
              if (filter.operator === "IN") {
                const values = Array.isArray(filter.value)
                  ? filter.value.map((v: any) => `'${v}'`).join(",")
                  : `'${filter.value}'`;
                return `${filter.field} IN (${values})`;
              } else if (filter.operator === "LIKE") {
                return `${filter.field} LIKE '%${filter.value}%'`;
              } else {
                // Check if value looks like a date (YYYY-MM-DD format)
                const isDateValue = /^\d{4}-\d{2}-\d{2}$/.test(filter.value);
                if (isDateValue) {
                  // For SQL Server datetime comparison, use CAST to date
                  return `CAST(${filter.field} AS DATE) ${filter.operator} '${filter.value}'`;
                }
                return `${filter.field} ${filter.operator} '${filter.value}'`;
              }
            });
            query += ` WHERE ${whereConditions.join(" AND ")}`;
          }

          // Add GROUP BY if specified
          if (groupBy && groupBy.length > 0) {
            query += ` GROUP BY ${groupBy.join(", ")}`;
          }

          // Add HAVING clause for post-aggregation filters
          if (having && groupBy && groupBy.length > 0) {
            const havingCondition = `${aggregation?.toUpperCase() || "SUM"}(${
              having.field || yField || valueField
            }) ${having.operator} ${having.value}`;
            query += ` HAVING ${havingCondition}`;
          }

          // Add ORDER BY if specified
          if (orderBy && orderBy.length > 0) {
            const orderClauses = orderBy.map(
              (order: any) => `${order.field} ${order.direction || "ASC"}`
            );
            query += ` ORDER BY ${orderClauses.join(", ")}`;
          } else if (limit) {
            // Add a default ORDER BY when LIMIT is used without explicit ORDER BY
            // This is required for SQL Server OFFSET/FETCH
            let defaultOrderField = "1"; // Fallback to constant

            if (selectFields.length > 0) {
              // Use the first field in SELECT clause
              const firstField = selectFields[0];
              // Remove any alias (e.g., "SUM(field) as field" -> "field")
              defaultOrderField = firstField.includes(" as ")
                ? firstField.split(" as ")[1]
                : firstField.split("(")[0]; // Remove function like SUM(
            } else if (xField) {
              defaultOrderField = xField;
            } else if (yField) {
              defaultOrderField = yField;
            }

            query += ` ORDER BY ${defaultOrderField}`;
          }

          // Note: Using TOP for SQL Server compatibility instead of LIMIT/OFFSET
        } else {
          setLoading(false);
          setError("No query or table specified in dataConfig");
          return;
        }

        const result = await executeQuery(tenantId, dataSourceId, query);

        //console.log("Query Result:", {
        //widgetId: widget.id,
        //widgetTitle: widget.title,
        //query,
        //resultData: result.data || result,
        //resultColumns: result.columns,
        //dataConfig: widget.dataConfig,
        //});

        setData({ data: result.data || result, columns: result.columns });
      } catch (err: any) {
        console.error("Failed to fetch widget data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tenantId,
    dataSourceId,
    widget.id,
    JSON.stringify(widget.dataConfig),
    JSON.stringify(globalFilters),
  ]);

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">
            {widget.title || "Widget"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-red-500">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data
  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Render widget based on type
  const renderWidget = () => {
    switch (widget.type) {
      case "bar":
        return <BarChartWidget widget={widget} data={data} />;
      case "line":
        return <LineChartWidget widget={widget} data={data} />;
      case "area":
        return <AreaChartWidget widget={widget} data={data} />;
      case "pie":
        return <PieChartWidget widget={widget} data={data} />;
      case "doughnut":
      case "donut": // Alias for doughnut
        return <DoughnutChartWidget widget={widget} data={data} />;
      case "table":
        return <TableWidget widget={widget} data={data} />;
      case "kpi":
        return <KPIWidget widget={widget} data={data} />;
      case "gauge":
        return <GaugeWidget widget={widget} data={data} />;
      case "progress":
      case "progressbar":
        return <ProgressBarWidget widget={widget} data={data} />;
      case "metric":
      case "metriccard":
        return <MetricCardWidget widget={widget} data={data} />;
      case "scatter":
      case "scatterplot":
        return <ScatterPlotWidget widget={widget} data={data} />;
      default:
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{widget.title || "Widget"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Unsupported widget type: {widget.type}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderWidget();
}
