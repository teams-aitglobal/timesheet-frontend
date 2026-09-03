import { Clock, LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS } from "@/config/navigation";
import { cn, formatRole, getInitials } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout, roles } = useAuth();
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-border bg-surface transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-primary text-white">
              <Clock size={14} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-label">
              Timesheet
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-label hover:text-text md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {visibleNavItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg hover:text-text",
                  isActive && "bg-badge-active-bg text-primary hover:bg-badge-active-bg hover:text-primary",
                )
              }
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          {user && (
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex w-full items-center gap-3 rounded-field px-3 py-2 text-left transition-colors hover:bg-bg",
                  isActive && "bg-badge-active-bg",
                )
              }
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {getInitials(user.first_name, user.last_name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-text">
                  {user.first_name} {user.last_name}
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {roles.map(formatRole).join(", ")}
                </span>
              </span>
            </NavLink>
          )}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg hover:text-text"
          >
            <LogOut size={17} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
