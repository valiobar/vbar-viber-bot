import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

