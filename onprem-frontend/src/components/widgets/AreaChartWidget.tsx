"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AreaChartWidgetProps {
  widget: any;
  data: any;
}

export default function AreaChartWidget({
  widget,
  data,
}: AreaChartWidgetProps) {
  const chartData = data?.data || [];
  const { xField, yField } = widget.dataConfig || {};

  if (!chartData.length || !xField || !yField) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Area Chart"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-gray-400">No data or missing configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>{widget.title || "Area Chart"}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={yField}
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
