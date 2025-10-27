"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Google Color Icon SVG component
const GoogleColorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 533.5 544.3"
  >
    <path
      fill="#4285f4"
      d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h150.5c-6.1 33.8-30.7 63.3-58.6 82.8v73.1h94.5c55.4-51.1 87.3-126.6 87.3-215.4z"
    />
    <path
      fill="#34a853"
      d="M272.1 544.3c77.2 0 142.3-25.6 189.6-69.2l-94.5-73.1c-25.5 17.1-58.2 27.1-95.1 27.1-73 0-135-49.2-157-115.6H16.6v75.5C63.6 509.5 163.6 544.3 272.1 544.3z"
    />
    <path
      fill="#fbbc05"
      d="M115.1 363.3c-5.7-17.1-8.8-35.3-8.8-54.3 0-19 3.1-37.2 8.8-54.3V171.5H16.6C6 191.6 0 214.6 0 272.1s6 80.5 16.6 100.6l98.5-75.5z"
    />
    <path
      fill="#ea4335"
      d="M272.1 107.7c41.8 0 79.7 14.4 109.4 42.1l82.1-82.1C414.3 29.6 349.2 0 272.1 0 163.6 0 63.6 34.8 16.6 100.6l98.5 75.5c22-66.4 84-115.4 157-115.4z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"auth" | "tenant">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please enter email and password");
      }

      // TODO: Integrate with Firebase Authentication
      localStorage.setItem("userEmail", email);
      localStorage.setItem("isAuthenticated", "true");
      setStep("tenant");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      // TODO: Integrate with Firebase Google Sign-In
      localStorage.setItem("isAuthenticated", "true");
      setStep("tenant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!tenantCode) {
        throw new Error("Please enter tenant code");
      }

      // TODO: Validate tenant code via API
      localStorage.setItem("tenantId", tenantCode);
      localStorage.setItem("tenantCode", tenantCode);
      document.cookie = `tenantId=${tenantCode}; path=/; max-age=${
        7 * 24 * 60 * 60
      }`;

      // Redirect to tenants management page
      router.push("/admin/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card
        className={`w-full shadow-lg ${
          step === "auth" ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <CardContent className="p-0">
          {step === "auth" ? (
            // Login Screen - 2 columns
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Google Sign In */}
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-700">
                    Sign in with your social account
                  </h2>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12 border-gray-300 bg-[#4285F4] text-white hover:bg-[#357ae8]"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <GoogleColorIcon />
                  )}
                  <span className="ml-2">
                    {isGoogleLoading ? "Signing in..." : "Continue with Google"}
                  </span>
                </Button>
                <p className="mt-4 text-xs text-gray-500">
                  We will not post to any of your accounts without asking first
                </p>
              </div>

              {/* Email/Password Sign In */}
              <div className="p-8 border-l border-gray-200">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-700">
                    Sign in with email
                  </h2>
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 rounded text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <a href="#" className="text-blue-600 hover:underline">
                      Forgot password?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#337ab7] hover:bg-[#286090]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="#" className="text-blue-600 hover:underline">
                      Sign up
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Tenant Selection Screen - centered single column
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-700">
                  Select Tenant
                </h2>
              </div>

              <form onSubmit={handleTenantSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantCode">Tenant Code</Label>
                  <Input
                    id="tenantCode"
                    type="text"
                    placeholder="TENANT_UUID"
                    value={tenantCode}
                    onChange={(e) =>
                      setTenantCode(e.target.value.toUpperCase())
                    }
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">Format: TENANT_UUID</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#337ab7] hover:bg-[#286090]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => {
                    setStep("auth");
                    setTenantCode("");
                    setError("");
                  }}
                >
                  Back
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
