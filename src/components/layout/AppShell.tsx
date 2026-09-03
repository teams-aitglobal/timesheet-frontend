import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-5 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-text"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {user && (
            <div className="flex items-center gap-2">
              <span className="max-w-[140px] truncate text-sm font-medium text-text">
                {user.first_name} {user.last_name}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {getInitials(user.first_name, user.last_name)}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
