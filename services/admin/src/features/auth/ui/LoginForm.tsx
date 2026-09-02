"use client";

/**
 * Login Form
 *
 * Username/password form that authenticates via the session entity store,
 * validates input, and redirects after a successful login.
 */

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/entities/session";

export const LoginForm = () => {
  const searchParams = useSearchParams();
  const { login, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const redirectUrl = searchParams.get("redirect") || "/";

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = "Username is required";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      await login(username.trim(), password);

      // Full page reload so middleware can read the cookie set by the login API
      window.location.href = redirectUrl;
    } catch {
      // Error is displayed from the auth store
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (validationErrors.username) {
      setValidationErrors((prev) => ({
        ...prev,
        username: undefined,
      }));
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors((prev) => ({
        ...prev,
        password: undefined,
      }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8 md:p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md md:p-6">
        <h1 className="mb-2 text-center text-3xl font-semibold text-gray-900">
          Login
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Please sign in to access the admin dashboard
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="username"
              className="mb-2 block font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              className={`w-full rounded border px-3 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                validationErrors.username
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              value={username}
              onChange={handleUsernameChange}
              disabled={isLoading}
              autoComplete="username"
              aria-required="true"
              aria-invalid={!!validationErrors.username}
              aria-describedby={
                validationErrors.username ? "username-error" : undefined
              }
            />
            {validationErrors.username && (
              <span
                id="username-error"
                className="mt-2 block text-sm text-red-600"
                role="alert"
              >
                {validationErrors.username}
              </span>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`w-full rounded border px-3 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                validationErrors.password
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              value={password}
              onChange={handlePasswordChange}
              disabled={isLoading}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={!!validationErrors.password}
              aria-describedby={
                validationErrors.password ? "password-error" : undefined
              }
            />
            {validationErrors.password && (
              <span
                id="password-error"
                className="mt-2 block text-sm text-red-600"
                role="alert"
              >
                {validationErrors.password}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 block text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-3 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};
