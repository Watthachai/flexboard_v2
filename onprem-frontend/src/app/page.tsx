"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Validate invite code
      const codeResponse = await fetch(`/api/invite-codes/${code}`);
      if (!codeResponse.ok) {
        throw new Error("Invalid or expired invite code");
      }

      const codeData = await codeResponse.json();
      const { tenantId } = codeData;

      // 2. Save tenant context to localStorage
      localStorage.setItem("tenantId", tenantId);
      localStorage.setItem("inviteCode", code);

      // 3. Get config for tenant
      const configResponse = await fetch(`/api/config?tenantId=${tenantId}`);
      if (!configResponse.ok) {
        throw new Error("Failed to load dashboard config");
      }

      const config = await configResponse.json();
      localStorage.setItem("dashboardConfig", JSON.stringify(config));

      // 4. Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Flexboard</CardTitle>
          <CardDescription>
            Enter your invite code to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TENANT_UUID-XXXXX"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Format: TENANT_UUID-XXXXX
              </p>
            </div>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Validating..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-muted-foreground w-full">
            Need an invite code? Contact your administrator
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
