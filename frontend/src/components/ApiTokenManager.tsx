"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

interface ApiTokenManagerProps {
  tenantId: string;
}

interface Token {
  name: string;
  value: string;
  isNew?: boolean;
}

export default function ApiTokenManager({ tenantId }: ApiTokenManagerProps) {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenValue, setNewTokenValue] = useState("");

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

  const fetchTokens = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(
        `${backendUrl}/api/tenants/${tenantId}/api-tokens`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch tokens error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: `${backendUrl}/api/tenants/${tenantId}/api-tokens`,
        });
        throw new Error(
          `Failed to fetch tokens: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Fetch each token value
      const tokensList: Token[] = [];
      for (const tokenName of data.tokens) {
        const tokenResponse = await fetch(
          `${backendUrl}/api/tenants/${tenantId}/api-tokens/${tokenName}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          tokensList.push({
            name: tokenData.name,
            value: tokenData.token,
          });
        }
      }

      setTokens(tokensList);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Failed to load API tokens");
    } finally {
      setLoading(false);
    }
  }, [tenantId, backendUrl, user]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleAddToken = () => {
    if (!newTokenName || !newTokenValue) {
      toast.error("Please provide both token name and value");
      return;
    }

    if (tokens.some((t) => t.name === newTokenName)) {
      toast.error("Token with this name already exists");
      return;
    }

    setTokens([
      ...tokens,
      { name: newTokenName, value: newTokenValue, isNew: true },
    ]);
    setNewTokenName("");
    setNewTokenValue("");
  };

  const handleSaveToken = async (token: Token) => {
    if (!user) return;

    try {
      const authToken = await user.getIdToken();
      const response = await fetch(
        `${backendUrl}/api/tenants/${tenantId}/api-tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: token.name, token: token.value }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save token");
      }

      toast.success(`Token "${token.name}" saved successfully`);

      // Update local state to remove isNew flag
      setTokens(
        tokens.map((t) => (t.name === token.name ? { ...t, isNew: false } : t))
      );
    } catch (error) {
      console.error("Error saving token:", error);
      toast.error("Failed to save token");
    }
  };

  const handleDeleteToken = async (tokenName: string) => {
    if (!user) return;

    if (!confirm(`Are you sure you want to delete token "${tokenName}"?`)) {
      return;
    }

    try {
      const authToken = await user.getIdToken();
      const response = await fetch(
        `${backendUrl}/api/tenants/${tenantId}/api-tokens/${tokenName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete token");
      }

      setTokens(tokens.filter((t) => t.name !== tokenName));
      toast.success(`Token "${tokenName}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting token:", error);
      toast.error("Failed to delete token");
    }
  };

  const toggleTokenVisibility = (tokenName: string) => {
    setShowTokens((prev) => ({ ...prev, [tokenName]: !prev[tokenName] }));
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return "••••••••";
    return (
      token.substring(0, 4) + "••••••••" + token.substring(token.length - 4)
    );
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Tokens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Store API tokens securely for external API integrations. Use{" "}
            <code className="bg-gray-100 px-1 rounded">
              ${"{"}TOKEN:name{"}"}
            </code>{" "}
            in your dashboard configurations to reference these tokens.
          </AlertDescription>
        </Alert>

        {/* Existing Tokens */}
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.name}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              <div className="flex-1">
                <Label className="text-sm font-medium">{token.name}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={
                      showTokens[token.name]
                        ? token.value
                        : maskToken(token.value)
                    }
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleTokenVisibility(token.name)}
                  >
                    {showTokens[token.name] ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </Button>
                </div>
              </div>
              {token.isNew && (
                <Button size="sm" onClick={() => handleSaveToken(token)}>
                  <Save size={16} className="mr-1" />
                  Save
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteToken(token.name)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Token */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-medium">Add New Token</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tokenName">Token Name</Label>
              <Input
                id="tokenName"
                placeholder="e.g., fittbsa, stripe, etc."
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tokenValue">Token Value</Label>
              <Input
                id="tokenValue"
                type="password"
                placeholder="Enter token value"
                value={newTokenValue}
                onChange={(e) => setNewTokenValue(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAddToken} className="w-full">
            <Plus size={16} className="mr-2" />
            Add Token
          </Button>
        </div>

        {/* Usage Examples */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Usage in Dashboard Config</h3>
          <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-2">
            <div>
              <span className="text-gray-600">{"// In headers:"}</span>
              <br />
              <span className="text-green-600">
                &quot;Authorization&quot;
              </span>:{" "}
              <span className="text-blue-600">
                &quot;Bearer ${"{"}TOKEN:fittbsa{"}"}
                {"}"}&quot;
              </span>
            </div>
            <div>
              <span className="text-gray-600">{"// Or use default:"}</span>
              <br />
              <span className="text-green-600">
                &quot;Authorization&quot;
              </span>:{" "}
              <span className="text-blue-600">
                &quot;Bearer ${"{"}API_TOKEN{"}"}
                {"}"}&quot;
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
