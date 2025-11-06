"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GaugeWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function GaugeWidget({ widget, data }: GaugeWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { yField } = dataConfig || {};

  // Get the gauge value
  const value = data.data.length > 0 ? data.data[0][yField] : 0;
  const numericValue = parseFloat(value) || 0;

  // Get min and max from styleConfig or use defaults
  const min = styleConfig?.min || 0;
  const max = styleConfig?.max || 100;

  // Calculate percentage
  const percentage = Math.min(
    Math.max(((numericValue - min) / (max - min)) * 100, 0),
    100
  );

  // Determine color based on percentage
  let color = "#3b82f6"; // blue
  if (percentage >= 80) color = "#10b981"; // green
  else if (percentage >= 50) color = "#f59e0b"; // orange
  else if (percentage >= 30) color = "#ef4444"; // red

  if (styleConfig?.color) {
    color = styleConfig.color;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title || "Gauge"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-gray-600">
                  {min}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block text-gray-600">
                  {max}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-6 mb-4 text-xs flex rounded-full bg-gray-100">
              <div
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color }}>
              {numericValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {percentage.toFixed(1)}% of target
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
