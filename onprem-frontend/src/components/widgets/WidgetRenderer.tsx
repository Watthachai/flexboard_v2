"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWidgetData } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

// Import chart components
import BarChartWidget from "./BarChartWidget";
import LineChartWidget from "./LineChartWidget";
import PieChartWidget from "./PieChartWidget";
import DoughnutChartWidget from "./DoughnutChartWidget";
import TableWidget from "./TableWidget";
import KPIWidget from "./KPIWidget";
import GaugeWidget from "./GaugeWidget";

interface WidgetRendererProps {
  widget: any;
  tenantId: string;
  dataSourceId: string;
}

export default function WidgetRenderer({
  widget,
  tenantId,
  dataSourceId,
}: WidgetRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!dataSourceId || !widget.dataConfig) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await getWidgetData(
          tenantId,
          dataSourceId,
          widget.dataConfig
        );

        setData(result);
      } catch (err: any) {
        console.error("Failed to fetch widget data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantId, dataSourceId, widget.id, widget.dataConfig]);

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">
            {widget.title || "Widget"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-red-500">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data
  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Render widget based on type
  const renderWidget = () => {
    switch (widget.type) {
      case "bar":
        return <BarChartWidget widget={widget} data={data} />;
      case "line":
        return <LineChartWidget widget={widget} data={data} />;
      case "pie":
        return <PieChartWidget widget={widget} data={data} />;
      case "doughnut":
        return <DoughnutChartWidget widget={widget} data={data} />;
      case "table":
        return <TableWidget widget={widget} data={data} />;
      case "kpi":
        return <KPIWidget widget={widget} data={data} />;
      case "gauge":
        return <GaugeWidget widget={widget} data={data} />;
      default:
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{widget.title || "Widget"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Unsupported widget type: {widget.type}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderWidget();
}
