"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "workforcehub.sidebar-collapsed";
const listeners = new Set<() => void>();

function readStoredValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot() {
  return false;
}

/** Persists the sidebar's collapsed state to localStorage across tabs/reloads. */
export function useSidebarCollapsed() {
  const isCollapsed = useSyncExternalStore(subscribe, readStoredValue, getServerSnapshot);

  const setCollapsed = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore unavailable storage
    }
    listeners.forEach((listener) => listener());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!readStoredValue());
  }, [setCollapsed]);

  return { isCollapsed, toggleCollapsed };
}
