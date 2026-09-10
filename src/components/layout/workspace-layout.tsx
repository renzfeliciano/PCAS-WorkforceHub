"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";

export function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <main
      className="app-shell"
      style={{ "--sidebar-width": isCollapsed ? "80px" : "258px" } as CSSProperties}
    >
      <div
        className={`sidebar-backdrop ${mobileNavOpen ? "open" : ""}`}
        onClick={closeMobileNav}
        aria-hidden="true"
      />
      <Sidebar
        open={mobileNavOpen}
        collapsed={isCollapsed}
        onNavigate={closeMobileNav}
        onToggleCollapse={toggleCollapsed}
      />
      <section className="main-content">
        <Topbar onToggleNav={() => setMobileNavOpen((current) => !current)} />
        <div className="content">{children}</div>
        <footer className="app-footer">
          &copy; {new Date().getFullYear()} PCAS WorkforceHub. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
