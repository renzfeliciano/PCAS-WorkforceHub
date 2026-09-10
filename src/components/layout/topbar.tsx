"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCurrentUser } from "@/context/current-user-context";

type Crumb = { parent: string; page: string };

const CRUMBS: Record<string, Crumb> = {
  "/": { parent: "Workspace", page: "Dashboard" },
  "/employees/attendance": { parent: "Employees", page: "Attendance" },
  "/employees/leave-management": { parent: "Employees", page: "Leave management" },
  "/employees/travel-orders": { parent: "Employees", page: "Travel orders" },
  "/employees/roster": { parent: "Employees", page: "Roster" },
  "/employees/asset-issuance": { parent: "Employees", page: "Asset issuance" },
  "/recruitment/application-tracking": { parent: "Recruitment", page: "Application tracking" },
  "/case-monitoring": { parent: "Workspace", page: "Case monitoring" },
  "/events": { parent: "Workspace", page: "Events" },
  "/settings/permissions": { parent: "Settings", page: "User management" },
  "/settings/catalog-management": { parent: "Settings", page: "Catalog management" },
};

function crumbFor(pathname: string): Crumb {
  if (CRUMBS[pathname]) return CRUMBS[pathname];
  const prefix = Object.keys(CRUMBS).find(
    (href) => href !== "/" && pathname.startsWith(`${href}/`),
  );
  return prefix ? CRUMBS[prefix] : { parent: "Workspace", page: "Workspace" };
}

export function Topbar({ onToggleNav }: Readonly<{ onToggleNav: () => void }>) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const crumb = crumbFor(pathname);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMenuOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function handleSignOut() {
    setIsSigningOut(true);
    signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="topbar">
      <IconButton
        className="menu"
        onClick={onToggleNav}
        aria-label="Open navigation"
        data-testid="toggle-mobile-nav"
      >
        <Menu size={19} />
      </IconButton>
      <span className="crumb">
        {crumb.parent} / <b>{crumb.page}</b>
      </span>
      <div className="profile-menu" ref={menuRef}>
        <button
          type="button"
          className="profile-trigger"
          onClick={() => setMenuOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          data-testid="account-menu-trigger"
        >
          <span className="profile-trigger-info">
            <b>{user.name}</b>
            <small>{user.role}</small>
          </span>
          <Avatar name={user.name} tone="coral" />
          <ChevronDown size={14} className="profile-trigger-chevron" />
        </button>
        {menuOpen && (
          <div className="profile-dropdown" role="menu" data-testid="account-menu">
            <div className="profile-dropdown-head">
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
            <div className="profile-dropdown-section">
              <span className="profile-dropdown-label">Theme</span>
              <ThemeToggle />
            </div>
            <button
              type="button"
              role="menuitem"
              className="profile-dropdown-logout"
              onClick={handleSignOut}
              disabled={isSigningOut}
              data-testid="sign-out"
            >
              {isSigningOut ? (
                <>
                  <Spinner size={13} />
                  <span>Signing out</span>
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  <span>Sign out</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
