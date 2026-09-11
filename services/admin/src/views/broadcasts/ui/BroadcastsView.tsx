"use client";

import { useCallback, useEffect, useState } from "react";
import { BroadcastForm } from "@/features/broadcast-manage";
import { BroadcastsList } from "@/widgets/broadcast-list";
import {
  listBroadcasts,
  cancelBroadcast,
  type BroadcastDTO,
} from "@/entities/broadcast";
import { listSteps } from "@/entities/step";
import { HttpError } from "@/shared";

export const BroadcastsView = () => {
  const [broadcasts, setBroadcasts] = useState<BroadcastDTO[]>([]);
  const [stepNames, setStepNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [broadcastsResult, stepsResult] = await Promise.all([
        listBroadcasts(),
        listSteps({}, { limit: 100 }),
      ]);
      setBroadcasts(broadcastsResult.broadcasts);
      setStepNames(
        Object.fromEntries(
          stepsResult.steps.map((step) => [step.id, step.humanReadableName])
        )
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : "Failed to load broadcasts"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const hasActive = broadcasts.some(
      (broadcast) =>
        broadcast.status === "scheduled" || broadcast.status === "sending"
    );
    if (!hasActive) return;
    const timer = setInterval(() => void fetchAll(), 10000);
    return () => clearInterval(timer);
  }, [broadcasts, fetchAll]);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this scheduled broadcast?")) return;
    try {
      await cancelBroadcast(id);
      await fetchAll();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : "Failed to cancel broadcast"
      );
    }
  };

  const handleCreate = () => {
    setCreating(true);
  };

  const handleFormCancel = () => {
    setCreating(false);
  };

  const handleSaved = () => {
    setCreating(false);
    void fetchAll();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Broadcasts
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Schedule a step to send now or later, to test IDs or every
            subscribed user
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={handleCreate}
            aria-label="Create broadcast"
            data-testid="broadcast-create"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            New Broadcast
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-6 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {creating && (
        <div className="mb-8">
          <BroadcastForm onSaved={handleSaved} onCancel={handleFormCancel} />
        </div>
      )}

      <BroadcastsList
        broadcasts={broadcasts}
        stepNames={stepNames}
        loading={loading}
        onCancel={handleCancel}
      />
    </div>
  );
};
