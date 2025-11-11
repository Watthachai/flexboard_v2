"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    // This runs only on client side
    const checkAuth = async () => {
      const { isAuthenticated } = await import("@/lib/api-client");
      const authenticated = isAuthenticated();
      const hasTenant = !!localStorage.getItem("tenantId");
      const onDashboard = pathname?.startsWith("/dashboard");

      setShowSidebar(authenticated && hasTenant && onDashboard);
    };

    checkAuth();
  }, [pathname]);

  if (showSidebar) {
    return (
      <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-0">
            <div className="mx-auto max-w-8xl">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  // No sidebar layout for login page
  return <div suppressHydrationWarning>{children}</div>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
