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
  const {
    yField,
    xField,
    field,
    valueField,
    labelField,
    maxValue,
    target,
    unit,
    thresholds,
    showPercentage,
    color,
    format,
    progressBars, // Multiple progress bars configuration
  } = widget.dataConfig || {};

  // Handle multiple progress bars
  if (progressBars && Array.isArray(progressBars)) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>{widget.title || "Progress"}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 space-y-4">
          {progressBars.map((progressBar: any, index: number) => {
            const progressValue =
              chartData.length > 0
                ? chartData.reduce((sum: number, row: any) => {
                    const val = parseFloat(row[progressBar.field]) || 0;
                    switch (progressBar.aggregation) {
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

            const progress = Math.min(
              (progressValue / progressBar.target) * 100,
              100
            );

            const getProgressColor = () => {
              if (progressBar.color) return progressBar.color;
              if (progress >= 80) return "bg-green-500";
              if (progress >= 60) return "bg-blue-500";
              if (progress >= 40) return "bg-yellow-500";
              return "bg-red-500";
            };

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {progressBar.label}
                  </span>
                  <span className="text-sm text-gray-600">
                    {progressValue.toLocaleString()} /{" "}
                    {progressBar.target.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-3" />
                  <div
                    className={`absolute top-0 left-0 h-3 rounded-full ${getProgressColor()} transition-all duration-300`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {progress.toFixed(1)}% completed
                  {progress >= 100 && (
                    <span className="ml-2 text-green-600 font-medium">
                      ✓ Target achieved!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Single progress bar mode (original logic)
  const dataField = field || valueField || yField;
  const nameField = labelField || xField;

  if (!chartData.length || !dataField) {
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
    const value = parseFloat(item[dataField]) || 0;
    const maxVal = target || maxValue || 100;

    // If value is already a percentage (0-100), use it directly
    if (value >= 0 && value <= 100 && !maxVal) {
      return value;
    }

    // Otherwise calculate percentage based on max value
    return Math.min((value / maxVal) * 100, 100);
  };

  // Get progress bar color based on thresholds
  const getProgressColor = (progress: number) => {
    if (color) return color;

    if (thresholds) {
      if (progress >= thresholds.excellent) return "bg-green-500";
      if (progress >= thresholds.good) return "bg-blue-500";
      if (progress >= thresholds.warning) return "bg-yellow-500";
      return "bg-red-500";
    }

    // Default colors based on progress
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-blue-500";
    if (progress >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Format display value
  const formatDisplayValue = (value: number, progress: number) => {
    if (format) {
      return format
        .replace("{value}", value.toLocaleString())
        .replace("{percentage}", `${progress.toFixed(1)}%`)
        .replace("{target}", (target || maxValue || 100).toLocaleString());
    }

    if (showPercentage) {
      return `${progress.toFixed(1)}%`;
    }

    return `${value.toLocaleString()}${unit || ""}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center justify-between">
          {widget.title || "Progress"}
          {target && (
            <span className="text-sm font-normal text-gray-500">
              Target: {target.toLocaleString()}
              {unit || ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {chartData.map((item: any, index: number) => {
          const value = parseFloat(item[dataField]) || 0;
          const progress = calculateProgress(item);
          const label = nameField ? item[nameField] : `Item ${index + 1}`;
          const progressColor = getProgressColor(progress);

          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-gray-600">
                  {formatDisplayValue(value, progress)}
                </span>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-3" />
                {/* Custom color overlay */}
                <div
                  className={`absolute top-0 left-0 h-3 rounded-full ${progressColor} transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {target && progress >= 100 && (
                <div className="text-xs text-green-600 font-medium">
                  ✓ Target achieved!
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
