"use client";

interface MissingFieldsNoticeProps {
  fields: string[];
  title: string;
  /** form: banner after Create/Update; chat: list after an AI draft. */
  variant?: "form" | "chat";
  testId?: string;
}

export const MissingFieldsNotice = ({
  fields,
  title,
  variant = "form",
  testId,
}: MissingFieldsNoticeProps) => {
  if (fields.length === 0) return null;

  const boxClass =
    variant === "chat"
      ? "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-600 dark:bg-amber-900/40"
      : "rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-900/20";

  return (
    <div
      role={variant === "form" ? "alert" : undefined}
      data-testid={testId}
      className={boxClass}
    >
      <p className="font-medium text-amber-800 dark:text-amber-200">{title}</p>
      <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-300">
        {fields.map((field, index) => (
          <li key={`${index}-${field}`}>{field}</li>
        ))}
      </ul>
    </div>
  );
};
