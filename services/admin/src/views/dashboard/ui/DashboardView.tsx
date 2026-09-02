/**
 * Dashboard view
 *
 * Route body for `/`. Redirects to settings; auth is handled by AuthProvider.
 */

import { redirect } from "next/navigation";

export const DashboardView = () => {
  redirect("/settings");
};
