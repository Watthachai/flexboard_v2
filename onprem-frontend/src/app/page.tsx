"use client";

import { useState, useEffect } from "react";
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

// Microsoft Icon
const MicrosoftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 21 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="10" height="10" fill="#F25022" />
    <rect x="11" width="10" height="10" fill="#7FBA00" />
    <rect y="11" width="10" height="10" fill="#00A4EF" />
    <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
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

  // Check if user already has tenant and is authenticated
  useEffect(() => {
    const checkTenant = async () => {
      if (!authLoading && user) {
        // ตรวจสอบ custom claims จาก Firebase token
        const tokenResult = await user.getIdTokenResult();
        const tenantId = tokenResult.claims.tenantId as string | undefined;

        if (tenantId) {
          // User already has tenant from custom claims, save to localStorage and redirect
          localStorage.setItem("tenantId", tenantId);
          router.push("/dashboard");
        } else {
          // User is logged in but no tenant, show invite code screen
          setStep("invite");
        }
      }
    };

    checkTenant();
  }, [user, authLoading, router]);

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

      console.log("🔵 Validating invite code:", code);

      // Get Firebase ID token
      const token = await user?.getIdToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      // Call /api/auth/assign-tenant endpoint
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"
        }/api/auth/assign-tenant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inviteCode: code,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to validate invite code" }));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Server error: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("✅ Tenant assigned:", data);

      // Save tenant context to localStorage
      if (data.tenantId) {
        localStorage.setItem("tenantId", data.tenantId);
        localStorage.setItem("inviteCode", code);
        localStorage.setItem(
          "dashboardConfig",
          JSON.stringify({
            tenantId: data.tenantId,
            name: "Dashboard",
            dashboards: [],
          })
        );
      }

      // Force refresh user token to get updated claims
      if (user) {
        await user.getIdToken(true);
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("❌ Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to validate invite code"
      );
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <Card
        className={`w-full shadow-xl border-0 overflow-hidden ${
          step === "auth" ? "max-w-5xl" : "max-w-md"
        }`}
      >
        <CardContent className="p-0">
          {step === "auth" ? (
            // Login Screen - 2 columns
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side - Google Sign In */}
              <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome to Flexboard
                  </h1>
                  <p className="text-gray-600">
                    Sign in with your social account
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <GoogleColorIcon />
                    )}
                    <span className="ml-3">
                      {isGoogleLoading
                        ? "Signing in..."
                        : "Continue with Google"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-200 bg-white text-gray-400 cursor-not-allowed relative"
                    disabled
                  >
                    <MicrosoftIcon />
                    <span className="ml-3">Continue with Microsoft</span>
                    <span className="absolute top-0 right-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                      Coming Soon
                    </span>
                  </Button>
                </div>

                <p className="mt-4 text-xs text-gray-500 text-center">
                  We will not post to any of your accounts without asking first
                </p>
              </div>

              {/* Right Side - Email/Password Sign In */}
              <div className="p-8 md:p-12 flex flex-col justify-center bg-linear-to-br from-blue-50 to-indigo-50 border-l border-gray-200">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Sign in with email
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Enter your credentials to continue
                  </p>
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-700 font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@host.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-11 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-gray-700 font-medium"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-11 bg-white"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <a
                      href="#"
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
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

                  <div className="text-center text-sm text-gray-600">
                    Need an account?{" "}
                    <Link
                      href="#"
                      className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                    >
                      Sign up
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // Invite Code Screen - centered single column
            <div className="p-8 md:p-12">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Enter invite code
                </h2>
                <p className="text-gray-600">
                  Please enter your tenant invite code to continue
                </p>
              </div>

              <form onSubmit={handleInviteCodeSubmit} className="space-y-6">
                {/* User Profile Section */}
                {user && (
                  <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-4">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          width={56}
                          height={56}
                          className="rounded-full ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white shadow-sm">
                          <span className="text-xl font-semibold text-white">
                            {(user.displayName || user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-1">
                          Signed in as
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invite Code Input */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-gray-700 font-medium">
                    Invite Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="XXXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="h-12 text-center font-mono text-lg tracking-wider"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Format: XXXXXXX
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Continue to Dashboard"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-2"
                    onClick={() => {
                      setStep("auth");
                      setCode("");
                      setError("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
