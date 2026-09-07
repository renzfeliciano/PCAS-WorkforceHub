import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLoader } from "@/components/layout/global-loader";
import { RouteLoadingTracker } from "@/components/layout/route-loading-tracker";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PCAS WorkforceHub",
  description:
    "A focused HRIS workspace for teams, employees, and leave credits.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense fallback={null}>
            <RouteLoadingTracker />
          </Suspense>
          <GlobalLoader />
          <TopProgressBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
