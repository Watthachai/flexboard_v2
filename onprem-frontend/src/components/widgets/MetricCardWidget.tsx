"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardWidgetProps {
  widget: any;
  data: any;
}

export default function MetricCardWidget({
  widget,
  data,
}: MetricCardWidgetProps) {
  const chartData = data?.data || [];
  const {
    yField,
    field,
    valueField,
    unit,
    decimals,
    description,
    target,
    threshold,
    format,
    icon,
    color,
    metrics, // Multiple metrics configuration
  } = widget.dataConfig || {};

  // Handle multiple metrics or single metric
  if (metrics && Array.isArray(metrics)) {
    // Multiple metrics mode
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            {icon && <span className="text-lg">{icon}</span>}
            {widget.title || "Metrics"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 space-y-3">
          {metrics.map((metric: any, index: number) => {
            const metricValue =
              chartData.length > 0
                ? chartData.reduce((sum: number, row: any) => {
                    const val = parseFloat(row[metric.field]) || 0;
                    switch (metric.aggregation) {
                      case "sum":
                        return sum + val;
                      case "avg":
                        return sum + val / chartData.length;
                      case "count":
                      case "count_distinct":
                        return chartData.length;
                      case "max":
                        return Math.max(sum, val);
                      case "min":
                        return Math.min(sum, val);
                      default:
                        return sum + val;
                    }
                  }, 0)
                : 0;

            const formatMetricValue = (val: number) => {
              if (metric.format) {
                return metric.format.replace("{value}", val.toLocaleString());
              }
              return val.toLocaleString();
            };

            return (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{metric.label}</span>
                <span className="text-lg font-semibold">
                  {formatMetricValue(metricValue)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Single metric mode (original logic)
  const dataField = field || valueField || yField;

  if (!chartData.length || !dataField) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Metric"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-gray-400">No data or missing configuration</p>
        </CardContent>
      </Card>
    );
  }

  // Get the latest/first value for the metric
  const latestData = chartData[chartData.length - 1] || chartData[0];
  const value = parseFloat(latestData[dataField]) || 0;

  // Calculate trend if we have multiple data points
  const getTrend = () => {
    if (chartData.length < 2) return null;

    const previousValue =
      parseFloat(chartData[chartData.length - 2][dataField]) || 0;
    const currentValue = value;

    if (currentValue > previousValue) return "up";
    if (currentValue < previousValue) return "down";
    return "neutral";
  };

  const trend = getTrend();

  // Format value based on configuration
  const formatValue = (val: number) => {
    if (format) {
      // Use custom format if provided
      return format.replace("{value}", val.toLocaleString());
    }

    const unitStr = unit || "";
    const decimalPlaces = decimals !== undefined ? decimals : 0;

    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(decimalPlaces)}M${unitStr}`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(decimalPlaces)}K${unitStr}`;
    }
    return `${val.toFixed(decimalPlaces)}${unitStr}`;
  };

  // Check threshold status
  const getThresholdStatus = () => {
    if (!threshold) return null;

    if (value >= threshold.critical) return "critical";
    if (value >= threshold.warning) return "warning";
    return "success";
  };

  const thresholdStatus = getThresholdStatus();

  // Calculate target percentage if target is set
  const getTargetPercentage = () => {
    if (!target) return null;
    return Math.round((value / target) * 100);
  };

  const targetPercentage = getTargetPercentage();

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "neutral":
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (thresholdStatus) {
      switch (thresholdStatus) {
        case "critical":
          return "text-red-600";
        case "warning":
          return "text-yellow-600";
        case "success":
          return "text-green-600";
      }
    }

    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getCardBorderColor = () => {
    if (thresholdStatus) {
      switch (thresholdStatus) {
        case "critical":
          return "border-red-200 bg-red-50";
        case "warning":
          return "border-yellow-200 bg-yellow-50";
        case "success":
          return "border-green-200 bg-green-50";
      }
    }
    return "";
  };

  return (
    <Card className={`h-full flex flex-col ${getCardBorderColor()}`}>
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {widget.title || "Metric"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center p-4">
        <div className="space-y-2">
          <div className={`text-3xl font-bold ${color || getTrendColor()}`}>
            {formatValue(value)}
          </div>

          {trend && (
            <div
              className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}
            >
              {getTrendIcon()}
              <span>
                {trend === "up" && "Increasing"}
                {trend === "down" && "Decreasing"}
                {trend === "neutral" && "No change"}
              </span>
            </div>
          )}

          {target && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Target:</span> {formatValue(target)}
              {targetPercentage && (
                <span
                  className={`ml-2 ${
                    targetPercentage >= 100
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  ({targetPercentage}%)
                </span>
              )}
            </div>
          )}

          {thresholdStatus && (
            <div className={`text-sm font-medium ${getTrendColor()}`}>
              {thresholdStatus.charAt(0).toUpperCase() +
                thresholdStatus.slice(1)}{" "}
              Level
            </div>
          )}

          {description && (
            <p className="text-sm text-gray-500 mt-2">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
