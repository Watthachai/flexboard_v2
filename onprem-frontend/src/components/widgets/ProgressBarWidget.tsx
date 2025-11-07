"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressBarWidgetProps {
  widget: any;
  data: any;
}

export default function ProgressBarWidget({
  widget,
  data,
}: ProgressBarWidgetProps) {
  const chartData = data?.data || [];
  const { yField, xField } = widget.dataConfig || {};

  if (!chartData.length || !yField) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Progress"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-gray-400">No data or missing configuration</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress value - can be percentage or value/max
  const calculateProgress = (item: any) => {
    const value = item[yField];
    const maxValue = widget.dataConfig?.maxValue || 100;

    // If value is already a percentage (0-100), use it directly
    if (value >= 0 && value <= 100 && !widget.dataConfig?.maxValue) {
      return value;
    }

    // Otherwise calculate percentage based on max value
    return (value / maxValue) * 100;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>{widget.title || "Progress"}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {chartData.map((item: any, index: number) => {
          const progress = calculateProgress(item);
          const label = xField ? item[xField] : `Item ${index + 1}`;
          const value = item[yField];

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-gray-600">
                  {value}
                  {widget.dataConfig?.unit || "%"}
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
