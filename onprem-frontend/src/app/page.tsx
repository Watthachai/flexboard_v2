"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Google Color Icon SVG component
const GoogleColorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 533.5 544.3"
  >
    <path
      d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
      fill="#4285f4"
    />
    <path
      d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
      fill="#34a853"
    />
    <path
      d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
      fill="#fbbc04"
    />
    <path
      d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
      fill="#ea4335"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<"auth" | "invite">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Remove auto-redirect - user chooses auth method first
  // After either Google login or email/password login, proceed to invite code

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
      setStep("invite");
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
      await signInWithGoogle();
      // เมื่อ login สำเร็จแล้ว เปลี่ยนไปหน้า invite code
      setStep("invite");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleInviteCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!code) {
        throw new Error("Please enter invite code");
      }

      // 1. Validate invite code
      const codeResponse = await fetch(`/api/invite-codes/${code}`);
      if (!codeResponse.ok) {
        throw new Error("Invalid or expired invite code");
      }

      const codeData = await codeResponse.json();
      const { tenantId } = codeData;

      // 2. Save tenant context to localStorage and cookie
      localStorage.setItem("tenantId", tenantId);
      localStorage.setItem("inviteCode", code);
      document.cookie = `tenantId=${tenantId}; path=/; max-age=${
        7 * 24 * 60 * 60
      }`;

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

  // แสดง Loading ถ้า Auth checking
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
                      placeholder="name@host.com"
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
                    Need an account?{" "}
                    <Link href="#" className="text-blue-600 hover:underline">
                      Sign up
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Invite Code Screen - centered single column
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-700">
                  Enter invite code
                </h2>
              </div>

              <form onSubmit={handleInviteCodeSubmit} className="space-y-4">
                {/* User Profile Section */}
                {user && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-4">
                      {user.photoURL && (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Hello,</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invite Code Input */}
                <div className="space-y-2">
                  <Label htmlFor="code">Invite Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="TENANT_UUID-XXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Format: TENANT_UUID-XXXXX
                  </p>
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
                      Validating...
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
                    setCode("");
                    setError("");
                  }}
                >
                  Back
                </Button>

                <p className="text-center text-xs text-gray-500">
                  {user ? `Logged in as: ${user.email}` : "Not logged in"}
                </p>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
