"use client";

import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      </div>
    );
  }

  // Show sidebar only if user is logged in and is admin
  const showSidebar = user && isAdmin;

  if (showSidebar) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-1xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  // No sidebar layout for login page
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
