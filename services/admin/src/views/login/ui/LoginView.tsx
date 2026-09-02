"use client";

/**
 * Login view
 *
 * Route body for `/login`. The form lives in features/auth.
 */

import { Suspense } from "react";
import { LoginForm } from "@/features/auth";

export const LoginView = () => (
  <Suspense>
    <LoginForm />
  </Suspense>
);
