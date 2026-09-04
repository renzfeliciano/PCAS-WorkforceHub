"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCurrentUser } from "@/context/current-user-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  badge?: number;
};

type SidebarProps = Readonly<{
  open: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
  employeeCount: number;
}>;

export function Sidebar({
  open,
  collapsed,
  onNavigate,
  onToggleCollapse,
  employeeCount,
}: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();

  const items: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/employees",
      label: "Employees",
      icon: Users,
      badge: employeeCount,
    },
  ];
  if (user.role === "Admin") {
    items.push(
      { href: "/settings", label: "Settings", icon: Settings2 },
      { href: "/admin/permissions", label: "Permissions", icon: ShieldCheck },
    );
  }

  return (
    <aside
      className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
    >
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      <div className="brand">
        <Logo size={30} />
        <span className="brand-text">
          Workforce<span className="brand-accent">Hub</span>
        </span>
      </div>
      <nav className="mt-5">
        <small className="nav-title">Workspace</small>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : ""}
              onClick={onNavigate}
              title={item.label}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge !== undefined && <b>{item.badge}</b>}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="user">
        <Avatar name={user.name} tone="coral" />
        <div>
          <b>{user.name}</b>
          <small>{user.role}</small>
        </div>
      </div>
    </aside>
  );
}
