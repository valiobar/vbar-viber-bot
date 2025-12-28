"use client";

/**
 * DashboardLayoutWrapper Component
 *
 * Client component that conditionally applies DashboardLayout based on route.
 * Public routes (like login) are rendered without DashboardLayout,
 * while protected routes are wrapped with DashboardLayout.
 */

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

// Public routes that should not have DashboardLayout
const PUBLIC_ROUTES = ["/login"];

const DashboardLayoutWrapper = ({
  children,
}: DashboardLayoutWrapperProps) => {
  const pathname = usePathname();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // If public route, render children without DashboardLayout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If protected route, wrap children with DashboardLayout
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default DashboardLayoutWrapper;

