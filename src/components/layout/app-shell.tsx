"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  children,
  employeeCount,
}: Readonly<{ children: ReactNode; employeeCount: number }>) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <main className="app-shell">
      <Sidebar
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
        employeeCount={employeeCount}
      />
      <section className="main-content">
        <Topbar onToggleNav={() => setMobileNavOpen((current) => !current)} />
        <div className="content">{children}</div>
        <footer className="app-footer">
          PCAS WorkforceHub <span>·</span> Established 2026
        </footer>
      </section>
    </main>
  );
}
