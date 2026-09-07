"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Layers,
  Plane,
  Settings2,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BackgroundCarousel } from "@/components/background-carousel";
import { Logo } from "@/components/ui/logo";
import { useCurrentUser } from "@/context/current-user-context";

const SIDEBAR_IMAGES = [
  "/assets/images/login/pcas-login-bg-1.jpg",
  "/assets/images/login/pcas-login-bg-2.jpg",
  "/assets/images/login/pcas-login-bg-3.jpg",
  "/assets/images/login/pcas-login-bg-4.jpg",
  "/assets/images/login/pcas-login-bg-5.jpg",
  "/assets/images/login/pcas-login-bg-6.jpg",
];

type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  /** Match this route exactly rather than by prefix — needed when the href is also the parent of sibling routes (e.g. "/employees" vs "/employees/attendance"). */
  exact?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  icon: typeof Users;
  items: NavItem[];
};

type SidebarProps = Readonly<{
  open: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
}>;

const employeeGroup: NavGroup = {
  key: "employees",
  label: "Employees",
  icon: Users,
  items: [
    { href: "/employees/roster", label: "Roster", icon: Table2, exact: true },
    { href: "/employees/attendance", label: "Attendance", icon: CalendarDays },
    {
      href: "/employees/leave-management",
      label: "Leave management",
      icon: CalendarRange,
    },
    { href: "/employees/travel-orders", label: "Travel orders", icon: Plane },
  ],
};

const settingsGroup: NavGroup = {
  key: "settings",
  label: "Settings",
  icon: Settings2,
  items: [
    {
      href: "/settings/catalog-management",
      label: "Catalog management",
      icon: Layers,
      exact: true,
    },
    {
      href: "/settings/permissions",
      label: "User management",
      icon: ShieldCheck,
    },
  ],
};

export function Sidebar({
  open,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const isAdmin = user.role === "Admin";
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    pathname.startsWith("/settings") ? "settings" : "employees",
  );

  function isActive(item: NavItem) {
    if (pathname === item.href) return true;
    if (item.exact) return false;
    return item.href !== "/" && pathname.startsWith(`${item.href}/`);
  }

  function isGroupActive(group: NavGroup) {
    return group.items.some(isActive);
  }

  function toggleGroup(key: string) {
    setOpenGroup((current) => (current === key ? null : key));
  }

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={isActive(item) ? "active" : ""}
          onClick={onNavigate}
          title={item.label}
        >
          <Icon size={17} />
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  function renderGroup(group: NavGroup) {
    const GroupIcon = group.icon;
    const isOpen = collapsed || openGroup === group.key;
    return (
      <div key={group.key} className="nav-group">
        <button
          type="button"
          className={`nav-group-header ${isGroupActive(group) ? "active" : ""}`}
          onClick={() => toggleGroup(group.key)}
          aria-expanded={isOpen}
          title={group.label}
        >
          <GroupIcon size={17} />
          <span>{group.label}</span>
          <ChevronDown
            size={14}
            className={`nav-group-chevron ${isOpen ? "open" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="nav-group-items">{renderItems(group.items)}</div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
    >
      <div className="sidebar-bg" aria-hidden="true">
        <BackgroundCarousel
          images={SIDEBAR_IMAGES}
          imageClassName="sidebar-bg-image"
          sizes="258px"
          priority
        />
      </div>
      <div className="sidebar-bg-scrim" aria-hidden="true" />
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
      <nav className="mt-7">
        <div className="nav-top">
          <Link
            href="/"
            className={pathname === "/" ? "active" : ""}
            onClick={onNavigate}
            title="Dashboard"
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </Link>
          {renderGroup(employeeGroup)}
        </div>
        {isAdmin && (
          <div className="nav-bottom">{renderGroup(settingsGroup)}</div>
        )}
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
