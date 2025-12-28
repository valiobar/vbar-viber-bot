/**
 * Home Page Component
 *
 * Redirects to the settings page by default.
 * Authentication is handled by AuthProvider in the layout.
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/settings");
}
