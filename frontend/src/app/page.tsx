"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Google Color Icon - สีสันเหมือน Google จริงๆ
const GoogleIcon = () => (
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
  const { user, loading, isAdmin, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect to /tenants if already logged in as admin
  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.push("/tenants");
    } else if (!loading && user && !isAdmin) {
      // Show error if user is logged in but not admin
      setError(
        `Access denied. Only wattchaichai@gmail.com can access admin panel.`
      );
    }
  }, [user, loading, isAdmin, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please enter email and password");
      }

      // TODO: Integrate with Firebase Email/Password Authentication
      throw new Error(
        "Email/Password authentication is not yet implemented. Please use Google Sign-In."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Redirect happens automatically via useEffect
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google login failed. Please try again."
      );
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Google & Microsoft Sign In */}
            <div className="p-8 flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Admin Dashboard
                </h2>
                <p className="text-gray-600">
                  Sign in with your social account
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 font-semibold flex items-center justify-center gap-2 border-2 bg-white hover:bg-gray-50 text-gray-700"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>
                    {googleLoading ? "Signing in..." : "Continue with Google"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 font-semibold flex items-center justify-center gap-2 border-2 text-gray-400 cursor-not-allowed relative"
                  disabled
                >
                  <MicrosoftIcon />
                  <span>Continue with Microsoft</span>
                  <span className="absolute top-0 right-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                    Coming Soon
                  </span>
                </Button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                We will not post to any of your accounts without asking first
              </p>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3 font-semibold">
                  Admin Panel Features:
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Manage Tenants
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Create Dashboards
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Invite Users
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    View Analytics
                  </li>
                </ul>
              </div>
            </div>

            {/* Email/Password Sign In */}
            <div className="p-8 border-l border-gray-200 flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Sign in with email
                </h2>
                <p className="text-gray-600 text-sm">
                  Enter your email and password
                </p>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-gray-700 font-semibold"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailLoading}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 font-semibold"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={emailLoading}
                    className="border-gray-300"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-12 font-semibold"
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in with Email"
                  )}
                </Button>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-center text-xs text-gray-500 mb-3">
                    Coming Soon
                  </p>
                  <p className="text-center text-xs text-gray-600">
                    Email/Password authentication is currently under
                    development.
                    <br />
                    Please use <strong>Google Sign-In</strong> for now.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
