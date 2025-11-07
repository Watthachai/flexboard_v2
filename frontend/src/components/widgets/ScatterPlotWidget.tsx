"use client";

import {
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScatterPlotWidgetProps {
  widget: any;
  data: any;
}

export default function ScatterPlotWidget({
  widget,
  data,
}: ScatterPlotWidgetProps) {
  const chartData = data?.data || [];
  const { xField, yField } = widget.dataConfig || {};

  if (!chartData.length || !xField || !yField) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Scatter Plot"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-gray-400">
            No data or missing X/Y field configuration
          </p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for scatter plot - each point needs x and y values
  const scatterData = chartData.map((item: any, index: number) => ({
    x: item[xField],
    y: item[yField],
    index: index,
    ...item, // Include all original data for tooltip
  }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>{widget.title || "Scatter Plot"}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <ScatterChart data={scatterData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xField}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yField}
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value: any, name: string) => [value, name]}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return `${xField}: ${data.x}, ${yField}: ${data.y}`;
                }
                return label;
              }}
            />
            <Legend />
            <Scatter name={yField} data={scatterData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
