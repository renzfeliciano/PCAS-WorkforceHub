"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  LayoutDashboard,
  Layers,
  Package,
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
import { useMediaQuery } from "@/hooks/use-media-query";

// Matches the breakpoint that gates .sidebar.collapsed's icon-rail styling
// in globals.css — below it the collapsed rail never renders visually, so
// the collapsed preference must not affect layout logic either.
const DESKTOP_QUERY = "(min-width: 901px)";

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
    {
      href: "/employees/asset-issuance",
      label: "Asset issuance",
      icon: Package,
    },
    { href: "/employees/travel-orders", label: "Travel orders", icon: Plane },
  ],
};

const recruitmentGroup: NavGroup = {
  key: "recruitment",
  label: "Recruitment",
  icon: Briefcase,
  items: [
    {
      href: "/recruitment/application-tracking",
      label: "Application tracking",
      icon: KanbanSquare,
      exact: true,
    },
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

// Every accordion group in the sidebar, in display order. Adding a new
// module's group here is enough for the open-group-closes-the-rest
// behavior below to pick it up automatically.
const NAV_GROUPS: NavGroup[] = [employeeGroup, recruitmentGroup, settingsGroup];

export function Sidebar({
  open,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const isAdmin = user.role === "Admin";
  // The collapsed icon-rail is a desktop-only affordance (see .sidebar.collapsed
  // in globals.css, gated the same way) — below that width the mobile drawer
  // always renders full-width, so a leftover "collapsed" preference from an
  // earlier desktop session must not force every group open here too.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const collapsedOnDesktop = collapsed && isDesktop;

  function isActive(item: NavItem) {
    if (pathname === item.href) return true;
    if (item.exact) return false;
    return item.href !== "/" && pathname.startsWith(`${item.href}/`);
  }

  function isGroupActive(group: NavGroup) {
    return group.items.some(isActive);
  }

  const [openGroup, setOpenGroup] = useState<string | null>(
    () => NAV_GROUPS.find(isGroupActive)?.key ?? null,
  );

  // Whichever group contains the page you just navigated to becomes the
  // only open one — including navigating to a page outside any group (e.g.
  // Dashboard), which closes every group. This keeps at most one parent
  // module expanded at a time as new modules/groups are added, without
  // fighting a manual toggle click between navigations (the effect only
  // re-runs when the route itself changes).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setOpenGroup(NAV_GROUPS.find(isGroupActive)?.key ?? null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isGroupActive is derived fresh from pathname each render; only the route change should retrigger this.
  }, [pathname]);

  function toggleGroup(key: string) {
    setOpenGroup((current) => (current === key ? null : key));
  }

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      const active = isActive(item);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={active ? "active" : ""}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          title={item.label}
          data-testid={`nav-link-${item.href}`}
        >
          <Icon size={17} />
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  function renderGroup(group: NavGroup) {
    const GroupIcon = group.icon;
    const isOpen = collapsedOnDesktop || openGroup === group.key;
    return (
      <div key={group.key} className="nav-group">
        {/* Collapsed to the icon rail, this header has nowhere to expand
            into — its items already render below as their own icon links
            — so the button would just sit there doing nothing on click.
            Skip it and let the group's items stand on their own. */}
        {!collapsedOnDesktop && (
          <button
            type="button"
            className={`nav-group-header ${isGroupActive(group) ? "active" : ""}`}
            onClick={() => toggleGroup(group.key)}
            aria-expanded={isOpen}
            title={group.label}
            data-testid={`nav-group-${group.key}`}
          >
            <GroupIcon size={17} />
            <span>{group.label}</span>
            <ChevronDown
              size={14}
              className={`nav-group-chevron ${isOpen ? "open" : ""}`}
            />
          </button>
        )}
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
        data-testid="sidebar-collapse-toggle"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className="brand">
        <Logo size={34} />
        <span className="brand-text">
          Workforce<span className="brand-accent">Hub</span>
        </span>
      </div>
      <nav aria-label="Main navigation">
        <div className="nav-top">
          <Link
            href="/"
            className={pathname === "/" ? "active" : ""}
            aria-current={pathname === "/" ? "page" : undefined}
            onClick={onNavigate}
            title="Dashboard"
            data-testid="nav-link-/"
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </Link>
          {renderGroup(employeeGroup)}
          {renderGroup(recruitmentGroup)}
          <Link
            href="/events"
            className={pathname.startsWith("/events") ? "active" : ""}
            aria-current={pathname.startsWith("/events") ? "page" : undefined}
            onClick={onNavigate}
            title="Events"
            data-testid="nav-link-/events"
          >
            <CalendarClock size={17} />
            <span>Events</span>
          </Link>
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
