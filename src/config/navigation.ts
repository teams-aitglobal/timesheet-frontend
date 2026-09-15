import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileBarChart,
  UserCog,
  Clock,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /**
   * Role names allowed to see this item. Leave undefined to show it to
   * every authenticated user. Wire this up once /auth/me is consumed
   * by AuthContext to enable per-role sidebars.
   */
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Clients", path: "/clients", icon: Users, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
  { label: "Projects", path: "/projects", icon: FolderKanban, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
  {
    label: "Timesheet Approvals",
    path: "/approvals",
    icon: ClipboardCheck,
    roles: ["PROJECT_MANAGER"],
  },
  { label: "My Projects", path: "/my-projects", icon: FolderKanban, roles: ["EMPLOYEE"] },
  { label: "Timesheet", path: "/timesheet", icon: Clock, roles: ["EMPLOYEE"] },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "User Management", path: "/users", icon: UserCog, roles: ["SUPER_ADMIN"] },
];
