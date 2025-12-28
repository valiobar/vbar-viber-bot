"use client";

/**
 * ButtonsList Component
 *
 * Displays a list of buttons with edit/remove actions and preview
 */

import { useState } from "react";
import type { ButtonDTO } from "@/domains/keyboard/application/dto/ButtonDTO";
import ButtonPreview from "./ButtonPreview";
import ButtonForm from "./ButtonForm";

interface ButtonsListProps {
  /**
   * Array of buttons to display
   */
  buttons: (Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
    tempId: string;
  })[];

  /**
   * Validation errors
   */
  errors: Record<string, string>;

  /**
   * Callback when a button is updated
   */
  onUpdateButton: (
    index: number,
    updates: Partial<Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">>
  ) => void;

  /**
   * Callback when a button is removed
   */
  onRemoveButton: (index: number) => void;
}

const ButtonsList = ({
  buttons,
  errors,
  onUpdateButton,
  onRemoveButton,
}: ButtonsListProps) => {
  const [editingButtonIndex, setEditingButtonIndex] = useState<number | null>(
    null
  );

  const handleToggleEdit = (index: number) => {
    setEditingButtonIndex(editingButtonIndex === index ? null : index);
  };

  const handleRemove = (index: number) => {
    onRemoveButton(index);
    if (editingButtonIndex === index) {
      setEditingButtonIndex(null);
    } else if (editingButtonIndex !== null && editingButtonIndex > index) {
      setEditingButtonIndex(editingButtonIndex - 1);
    }
  };

  if (buttons.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        No buttons added yet. Click "Add Button" to get started.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {buttons.map((button, index) => (
        <div
          key={button.tempId}
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Button {index + 1}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleToggleEdit(index)}
                className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                {editingButtonIndex === index ? "Collapse" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Button Preview */}
          <ButtonPreview button={button} />

          {/* Button Editor (Collapsible) */}
          {editingButtonIndex === index && (
            <ButtonForm
              button={button}
              index={index}
              errors={errors}
              onUpdate={(updates) => onUpdateButton(index, updates)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ButtonsList;
