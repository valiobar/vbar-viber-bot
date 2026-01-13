"use client";

/**
 * ErrorMessage Component
 *
 * Displays error messages in a styled container.
 */

interface ErrorMessageProps {
  error: string | null;
}

const ErrorMessage = ({ error }: ErrorMessageProps) => {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
    </div>
  );
};

export default ErrorMessage;





