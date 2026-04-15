import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ledge",
  description: "A personal cash flow tracker for understanding spending, income, and upcoming obligations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
