"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPIWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function KPIWidget({ widget, data }: KPIWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const {
    yField,
    field,
    valueField,
    format,
    unit,
    prefix,
    suffix,
    target,
    thresholds,
  } = dataConfig || {};

  const dataField = field || valueField || yField;

  // Get the KPI value (first row, dataField column)
  const value = data.data.length > 0 ? data.data[0][dataField] : 0;
  const numericValue = parseFloat(value) || 0;

  // Optional: Calculate trend if there's more than one data point
  let trend: "up" | "down" | "neutral" = "neutral";
  let changePercent = 0;

  if (data.data.length > 1) {
    const previousValue = parseFloat(data.data[1][dataField]) || 0;
    if (previousValue > 0) {
      changePercent = ((numericValue - previousValue) / previousValue) * 100;
      trend = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral";
    }
  }

  // Get status based on thresholds
  const getStatus = () => {
    if (!thresholds) return null;

    if (numericValue >= thresholds.excellent) return "excellent";
    if (numericValue >= thresholds.good) return "good";
    if (numericValue >= thresholds.warning) return "warning";
    return "critical";
  };

  const status = getStatus();

  const getStatusColor = () => {
    switch (status) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return trend === "up"
          ? "text-green-500"
          : trend === "down"
          ? "text-red-500"
          : "text-gray-400";
    }
  };

  const getBgColor = () => {
    if (styleConfig?.backgroundColor) return styleConfig.backgroundColor;

    switch (status) {
      case "excellent":
        return "bg-gradient-to-br from-green-50 to-green-100";
      case "good":
        return "bg-gradient-to-br from-blue-50 to-blue-100";
      case "warning":
        return "bg-gradient-to-br from-yellow-50 to-yellow-100";
      case "critical":
        return "bg-gradient-to-br from-red-50 to-red-100";
      default:
        return "bg-gradient-to-br from-blue-50 to-blue-100";
    }
  };

  // Format value
  const formatValue = (val: number) => {
    if (format) {
      return format.replace("{value}", val.toLocaleString());
    }

    const prefixStr = prefix || styleConfig?.prefix || "";
    const suffixStr = suffix || unit || styleConfig?.suffix || "";

    return `${prefixStr}${val.toLocaleString()}${suffixStr}`;
  };

  // Calculate target percentage
  const getTargetPercentage = () => {
    if (!target) return null;
    const targetValue =
      typeof target === "number" ? target : parseFloat(target) || 0;
    if (targetValue === 0) return null;
    return Math.round((numericValue / targetValue) * 100);
  };

  const targetPercentage = getTargetPercentage();
  const targetValue =
    typeof target === "number" ? target : parseFloat(target) || 0;

  return (
    <Card className={`h-full ${getBgColor()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          {title || "KPI"}
          {target && targetValue > 0 && (
            <span className="text-xs text-gray-500">
              Target: {formatValue(targetValue)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-4xl font-bold ${getStatusColor()}`}>
            {formatValue(numericValue)}
          </div>

          {/* Trend Information */}
          {data.data.length > 1 && (
            <div
              className={`flex items-center gap-1 text-sm ${getStatusColor()}`}
            >
              {trend === "up" && <TrendingUp className="h-4 w-4" />}
              {trend === "down" && <TrendingDown className="h-4 w-4" />}
              {trend === "neutral" && <Minus className="h-4 w-4" />}
              <span>
                {changePercent > 0 ? "+" : ""}
                {changePercent.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Target Progress */}
          {target && targetValue > 0 && (
            <div className="text-sm">
              <span className="text-gray-600">Progress: </span>
              <span
                className={
                  targetPercentage && targetPercentage >= 100
                    ? "text-green-600 font-medium"
                    : "text-gray-700"
                }
              >
                {targetPercentage || 0}%
              </span>
              {targetPercentage && targetPercentage >= 100 && (
                <span className="ml-1 text-green-600">✓</span>
              )}
            </div>
          )}

          {/* Status Message */}
          {status && (
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
