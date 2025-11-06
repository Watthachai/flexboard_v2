"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPIWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function KPIWidget({ widget, data }: KPIWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { yField } = dataConfig || {};

  // Get the KPI value (first row, yField column)
  const value = data.data.length > 0 ? data.data[0][yField] : 0;
  const numericValue = parseFloat(value) || 0;

  // Optional: Calculate trend if there's more than one data point
  let trend: "up" | "down" | "neutral" = "neutral";
  let changePercent = 0;

  if (data.data.length > 1) {
    const previousValue = parseFloat(data.data[1][yField]) || 0;
    if (previousValue > 0) {
      changePercent = ((numericValue - previousValue) / previousValue) * 100;
      trend = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral";
    }
  }

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-gray-400";

  const bgColor =
    styleConfig?.backgroundColor ||
    "bg-gradient-to-br from-blue-50 to-blue-100";

  return (
    <Card className={`h-full ${bgColor}`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">
          {title || "KPI"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-4xl font-bold">
            {numericValue.toLocaleString()}
          </div>
          {data.data.length > 1 && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              {trend === "up" && <TrendingUp className="h-4 w-4" />}
              {trend === "down" && <TrendingDown className="h-4 w-4" />}
              {trend === "neutral" && <Minus className="h-4 w-4" />}
              <span>
                {changePercent > 0 ? "+" : ""}
                {changePercent.toFixed(1)}%
              </span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {styleConfig?.unit || "units"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
