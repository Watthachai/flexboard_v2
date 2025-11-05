"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardVersion } from "@/types/dashboard";

interface VersionsTabProps {
  versions: DashboardVersion[];
}

export function VersionsTab({ versions }: VersionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No versions found
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      v{version.versionNumber}
                    </span>
                    {version.isActive && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {version.changeLog || "No changelog"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Published: {new Date(version.publishedAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
