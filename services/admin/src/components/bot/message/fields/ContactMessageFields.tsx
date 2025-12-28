"use client";

/**
 * ContactMessageFields Component
 *
 * Form fields for contact message type
 */

interface ContactMessageFieldsProps {
  /**
   * Current contact name value
   */
  name: string;

  /**
   * Current phone number value
   */
  phone: string;

  /**
   * Callback when name changes
   */
  onNameChange: (value: string) => void;

  /**
   * Callback when phone changes
   */
  onPhoneChange: (value: string) => void;

  /**
   * Validation error messages
   */
  errors?: {
    contactName?: string;
    contactPhone?: string;
  };
}

export const ContactMessageFields = ({
  name,
  phone,
  onNameChange,
  onPhoneChange,
  errors,
}: ContactMessageFieldsProps) => {
  return (
    <>
      <div>
        <label
          htmlFor="contactName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="contactName"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.contactName
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="John Doe"
        />
        {errors?.contactName && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.contactName}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="contactPhone"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="contactPhone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            errors?.contactPhone
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="+1234567890"
        />
        {errors?.contactPhone && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.contactPhone}
          </p>
        )}
      </div>
    </>
  );
};

