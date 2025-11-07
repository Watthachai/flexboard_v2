"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GaugeWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function GaugeWidget({ widget, data }: GaugeWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const {
    yField,
    field,
    valueField,
    min,
    max,
    target,
    unit,
    ranges,
    format,
    thresholds,
  } = dataConfig || {};

  const dataField = field || valueField || yField;

  // Get the gauge value
  const value = data.data.length > 0 ? data.data[0][dataField] : 0;
  const numericValue = parseFloat(value) || 0;

  // Get min and max from dataConfig or styleConfig or use defaults
  const minValue = min || styleConfig?.min || 0;
  const maxValue = max || styleConfig?.max || target || 100;

  // Calculate percentage
  const percentage = Math.min(
    Math.max(((numericValue - minValue) / (maxValue - minValue)) * 100, 0),
    100
  );

  // Determine color based on ranges or thresholds
  const getGaugeColor = () => {
    if (styleConfig?.color) return styleConfig.color;

    if (ranges) {
      for (const range of ranges) {
        if (numericValue >= range.min && numericValue <= range.max) {
          return range.color;
        }
      }
    }

    if (thresholds) {
      if (numericValue >= thresholds.excellent) return "#10b981"; // green
      if (numericValue >= thresholds.good) return "#3b82f6"; // blue
      if (numericValue >= thresholds.warning) return "#f59e0b"; // orange
      return "#ef4444"; // red
    }

    // Default color logic
    if (percentage >= 80) return "#10b981"; // green
    if (percentage >= 50) return "#f59e0b"; // orange
    if (percentage >= 30) return "#3b82f6"; // blue
    return "#ef4444"; // red
  };

  const color = getGaugeColor();

  // Format display value
  const formatValue = (val: number) => {
    if (format) {
      return format.replace("{value}", val.toLocaleString());
    }
    return `${val.toLocaleString()}${unit || ""}`;
  };

  // Get status message
  const getStatusMessage = () => {
    if (thresholds) {
      if (numericValue >= thresholds.excellent) return "Excellent";
      if (numericValue >= thresholds.good) return "Good";
      if (numericValue >= thresholds.warning) return "Warning";
      return "Critical";
    }

    if (target) {
      const targetPercentage = (numericValue / target) * 100;
      if (targetPercentage >= 100) return "Target achieved!";
      if (targetPercentage >= 80) return "Near target";
      return `${targetPercentage.toFixed(1)}% of target`;
    }

    return `${percentage.toFixed(1)}% of range`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title || "Gauge"}
          {target && (
            <span className="text-sm font-normal text-gray-500">
              Target: {formatValue(target)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Gauge Bar */}
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-gray-600">
                  {formatValue(minValue)}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block text-gray-600">
                  {formatValue(maxValue)}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-6 mb-4 text-xs flex rounded-full bg-gray-100 relative">
              <div
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
              />
              {/* Target indicator */}
              {target && target !== maxValue && (
                <div
                  className="absolute top-0 w-1 h-6 bg-gray-700"
                  style={{
                    left: `${
                      ((target - minValue) / (maxValue - minValue)) * 100
                    }%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Value Display */}
          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color }}>
              {formatValue(numericValue)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {getStatusMessage()}
            </div>
          </div>

          {/* Range Legend */}
          {ranges && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {ranges.map((range: any, index: number) => (
                <div key={index} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: range.color }}
                  />
                  <span>{range.label || `${range.min}-${range.max}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
