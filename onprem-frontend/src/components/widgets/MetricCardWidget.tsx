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
  const { yField } = widget.dataConfig || {};

  if (!chartData.length || !yField) {
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
  const value = latestData[yField];

  // Calculate trend if we have multiple data points
  const getTrend = () => {
    if (chartData.length < 2) return null;

    const previousValue = chartData[chartData.length - 2][yField];
    const currentValue = value;

    if (currentValue > previousValue) return "up";
    if (currentValue < previousValue) return "down";
    return "neutral";
  };

  const trend = getTrend();
  const formatValue = (val: number) => {
    const unit = widget.dataConfig?.unit || "";
    const decimals = widget.dataConfig?.decimals || 0;

    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(decimals)}M${unit}`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(decimals)}K${unit}`;
    }
    return `${val.toFixed(decimals)}${unit}`;
  };

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {widget.title || "Metric"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center p-4">
        <div className="space-y-2">
          <div className="text-3xl font-bold">{formatValue(value)}</div>

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

          {widget.dataConfig?.description && (
            <p className="text-sm text-gray-500 mt-2">
              {widget.dataConfig.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
