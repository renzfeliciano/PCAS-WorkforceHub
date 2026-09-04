"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/types/user";

export type CurrentUser = { id: string; name: string; role: Role };

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: Readonly<{ user: CurrentUser; children: ReactNode }>) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return context;
}
