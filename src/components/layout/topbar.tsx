"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";
import { useCurrentUser } from "@/context/current-user-context";

const CRUMBS: Record<string, string> = {
  "/": "Dashboard",
  "/employees": "Employees",
  "/settings": "Settings",
  "/admin/permissions": "Permissions",
};

export function Topbar({ onToggleNav }: Readonly<{ onToggleNav: () => void }>) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const crumb = CRUMBS[pathname] ?? "Workspace";

  return (
    <header className="topbar">
      <IconButton className="menu" onClick={onToggleNav} aria-label="Open navigation">
        <Menu size={19} />
      </IconButton>
      <div className="header-brand">
        <Logo size={25} />
        <span>
          Workforce<span className="brand-accent">Hub</span>
        </span>
      </div>
      <span className="crumb">
        Workspace / <b>{crumb}</b>
      </span>
      <div className="profile-menu">
        <Avatar name={user.name} tone="coral" />
        <div className="profile-copy">
          <b>{user.name}</b>
          <small>{user.role}</small>
        </div>
        <button className="logout-button" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
