"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiTokenManager from "@/components/ApiTokenManager";

export default function TenantSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage settings and configurations for {tenantId}
        </p>
      </div>

      <Tabs defaultValue="api-tokens" className="w-full">
        <TabsList>
          <TabsTrigger value="api-tokens">API Tokens</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="api-tokens" className="mt-6">
          <ApiTokenManager tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                General tenant settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Integration settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
