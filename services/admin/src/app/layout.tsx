import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";

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
