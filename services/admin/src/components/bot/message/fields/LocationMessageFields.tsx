"use client";

/**
 * LocationMessageFields Component
 *
 * Form fields for location message type
 */

interface LocationMessageFieldsProps {
  /**
   * Current latitude value
   */
  latitude: number | null;

  /**
   * Current longitude value
   */
  longitude: number | null;

  /**
   * Callback when latitude changes
   */
  onLatitudeChange: (value: number | null) => void;

  /**
   * Callback when longitude changes
   */
  onLongitudeChange: (value: number | null) => void;

  /**
   * Validation error messages
   */
  errors?: {
    locationLat?: string;
    locationLon?: string;
  };
}

export const LocationMessageFields = ({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  errors,
}: LocationMessageFieldsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label
          htmlFor="locationLat"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Latitude <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="locationLat"
          value={latitude || ""}
          onChange={(e) =>
            onLatitudeChange(
              e.target.value ? parseFloat(e.target.value) : null
            )
          }
          step="any"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.locationLat
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="40.7128"
        />
        {errors?.locationLat && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.locationLat}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="locationLon"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Longitude <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="locationLon"
          value={longitude || ""}
          onChange={(e) =>
            onLongitudeChange(
              e.target.value ? parseFloat(e.target.value) : null
            )
          }
          step="any"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.locationLon
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="-74.0060"
        />
        {errors?.locationLon && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.locationLon}
          </p>
        )}
      </div>
    </div>
  );
};

