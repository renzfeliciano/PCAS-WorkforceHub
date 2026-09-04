"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: Readonly<ComponentProps<typeof NextThemesProvider>>) {
  return <NextThemesProvider {...props} />;
}
