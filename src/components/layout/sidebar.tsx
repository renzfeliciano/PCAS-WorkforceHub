"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { useCurrentUser } from "@/context/current-user-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  badge?: number;
};

export function Sidebar({
  open,
  onNavigate,
  employeeCount,
}: Readonly<{ open: boolean; onNavigate: () => void; employeeCount: number }>) {
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
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <Logo size={30} /> Workforce<span className="brand-accent">Hub</span>
      </div>
      <nav>
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
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge !== undefined && <b>{item.badge}</b>}
            </Link>
          );
        })}
        <button type="button" disabled title="Coming soon">
          <CalendarDays size={17} />
          <span>Leave &amp; time off</span>
        </button>
      </nav>
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
