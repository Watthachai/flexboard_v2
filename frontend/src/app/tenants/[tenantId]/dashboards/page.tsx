"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Layout } from "lucide-react";

export default function DashboardBuilderPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  useEffect(() => {
    // Store tenantId in localStorage
    if (tenantId) {
      localStorage.setItem("tenantId", tenantId);
      document.cookie = `tenantId=${tenantId}; path=/; max-age=${
        7 * 24 * 60 * 60
      }`;
    }
  }, [tenantId]);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Builder
          </h1>
          <p className="text-gray-600 mt-2">
            Tenant: <span className="font-semibold">{tenantId}</span>
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Dashboard
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="text-center py-12">
          <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No dashboards yet
          </h3>
          <p className="text-gray-600 mb-4">
            Get started by creating your first dashboard
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
