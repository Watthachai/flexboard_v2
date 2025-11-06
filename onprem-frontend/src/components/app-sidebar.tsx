"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Building2, Home, Settings, User, LogOut } from "lucide-react";
import { logout as apiLogout } from "@/lib/api-client";

interface DashboardConfig {
  tenantId: string;
  name: string;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState<DashboardConfig | null>(null);

  // Load config from localStorage
  useEffect(() => {
    const loadConfig = () => {
      const storedConfig = localStorage.getItem("dashboardConfig");
      const tenantId = localStorage.getItem("tenantId");

      if (storedConfig) {
        try {
          setConfig(JSON.parse(storedConfig));
        } catch (error) {
          console.error("Failed to parse config:", error);
        }
      } else if (tenantId) {
        setConfig({
          tenantId: tenantId,
          name: "Dashboard",
        });
      }
    };

    loadConfig();
  }, []);

  const handleLogout = async () => {
    try {
      apiLogout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      label: "Profile",
      href: "/dashboard/profile",
      icon: User,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Logo/Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1
              className="truncate text-lg font-bold text-gray-900"
              suppressHydrationWarning
            >
              {config?.name || "Flexboard"}
            </h1>
            {config?.tenantId && (
              <p
                className="truncate font-mono text-xs text-gray-500"
                suppressHydrationWarning
              >
                {config.tenantId}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User Info - Removed (OnPrem doesn't have Firebase user) */}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-gray-200 p-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="m-4">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden h-full w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
