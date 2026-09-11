"use client";

import { useEffect, useState } from "react";
import { createBroadcast } from "@/entities/broadcast";
import { listSteps, type StepDTO } from "@/entities/step";
import { HttpError } from "@/shared";

interface BroadcastFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400";

export const BroadcastForm = ({ onSaved, onCancel }: BroadcastFormProps) => {
  const [name, setName] = useState("");
  const [stepId, setStepId] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  const [testIdsText, setTestIdsText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState<StepDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadSteps = async () => {
      try {
        const result = await listSteps({ hidden: false }, { limit: 1000 });
        setSteps(result.steps);
      } catch (err) {
        setError(
          err instanceof HttpError ? err.message : "Failed to load steps"
        );
      }
    };
    void loadSteps();
  }, []);

  const parseTestIds = (): string[] =>
    testIdsText
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleStepChange = (value: string) => {
    setStepId(value);
  };

  const handleSendToAllChange = (checked: boolean) => {
    setSendToAll(checked);
  };

  const handleTestIdsChange = (value: string) => {
    setTestIdsText(value);
  };

  const handleScheduledAtChange = (value: string) => {
    setScheduledAt(value);
  };

  const handleSubmit = async (mode: "now" | "schedule") => {
    setError(null);
    const testViberIds = sendToAll ? [] : parseTestIds();
    if (!sendToAll && testViberIds.length === 0) {
      setError(
        "Enter at least one Viber ID or check 'Send to all subscribed users'"
      );
      return;
    }
    if (mode === "schedule") {
      if (!scheduledAt) {
        setError("Pick a date and time");
        return;
      }
      if (new Date(scheduledAt) <= new Date()) {
        setError("Scheduled time must be in the future");
        return;
      }
    }
    if (
      sendToAll &&
      !window.confirm("This will send to ALL subscribed users. Continue?")
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await createBroadcast({
        name: name.trim(),
        stepId,
        sendToAll,
        testViberIds,
        scheduledAt:
          mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : "Failed to create broadcast"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(name.trim()) && Boolean(stepId) && !submitting;

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      data-testid="broadcast-form"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        New Broadcast
      </h2>

      <div>
        <label
          htmlFor="broadcast-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="broadcast-name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          disabled={submitting}
          placeholder="e.g. Weekend promo"
          aria-label="Broadcast name"
          data-testid="broadcast-name"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="broadcast-step"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Step <span className="text-red-500">*</span>
        </label>
        <select
          id="broadcast-step"
          value={stepId}
          onChange={(event) => handleStepChange(event.target.value)}
          disabled={submitting}
          aria-label="Broadcast step"
          data-testid="broadcast-step"
          className={inputClass}
        >
          <option value="">Select step…</option>
          {steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.humanReadableName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="broadcast-send-to-all"
          checked={sendToAll}
          onChange={(event) => handleSendToAllChange(event.target.checked)}
          disabled={submitting}
          aria-label="Send to all subscribed users"
          data-testid="broadcast-send-to-all"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
        />
        <label
          htmlFor="broadcast-send-to-all"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          Send to all subscribed users
        </label>
      </div>

      {!sendToAll && (
        <div>
          <label
            htmlFor="broadcast-test-ids"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Test Viber IDs <span className="text-red-500">*</span>
          </label>
          <textarea
            id="broadcast-test-ids"
            value={testIdsText}
            onChange={(event) => handleTestIdsChange(event.target.value)}
            disabled={submitting}
            rows={4}
            placeholder="Viber IDs, space or newline separated"
            aria-label="Test Viber IDs"
            data-testid="broadcast-test-ids"
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label
          htmlFor="broadcast-scheduled-at"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Schedule for
        </label>
        <input
          type="datetime-local"
          id="broadcast-scheduled-at"
          value={scheduledAt}
          onChange={(event) => handleScheduledAtChange(event.target.value)}
          disabled={submitting}
          aria-label="Broadcast scheduled time"
          data-testid="broadcast-scheduled-at"
          className={inputClass}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Local time. Leave empty and use Send now, or pick a future time and
          Schedule.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="Cancel broadcast form"
          data-testid="broadcast-form-cancel"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit("now")}
          aria-label="Send broadcast now"
          data-testid="broadcast-send-now"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          {submitting ? "Sending..." : "Send now"}
        </button>
        <button
          type="button"
          disabled={!canSubmit || !scheduledAt}
          onClick={() => void handleSubmit("schedule")}
          aria-label="Schedule broadcast"
          data-testid="broadcast-schedule"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          {submitting ? "Scheduling..." : "Schedule"}
        </button>
      </div>
    </form>
  );
};
