import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkforceHub | People operations, made clear",
  description:
    "A focused HRIS workspace for teams, employees, and leave credits.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
