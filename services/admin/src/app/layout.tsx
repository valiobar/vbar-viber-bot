import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider } from "@/shared";
import { DashboardLayoutWrapper } from "@/widgets/dashboard-layout";

export const metadata: Metadata = {
  title: "Viber Bot Admin",
  description: "Administrative dashboard for Viber bot management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
