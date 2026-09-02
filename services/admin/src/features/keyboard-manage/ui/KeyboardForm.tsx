"use client";

/**
 * KeyboardForm Component
 *
 * Form for creating/editing Keyboards with button management.
 * Supports inline button editing, layout preview, and validation.
 */

import { useState, useEffect } from "react";
import {
  KeyboardPreview,
  listKeyboards,
  type ButtonDTO,
  type CreateKeyboardInput,
  type InputFieldState,
  type KeyboardDTO,
  type UpdateKeyboardInput,
} from "@/entities/keyboard";
import { reorderButtons } from "../lib/reorderButtons";
import { ButtonForm } from "./ButtonForm";
import { ButtonsList } from "./ButtonsList";

interface KeyboardFormProps {
  /**
   * Initial keyboard data for editing (optional)
   * If not provided, form is in create mode
   */
  initialData?: KeyboardDTO;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: CreateKeyboardInput | UpdateKeyboardInput) => Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether form is in loading state
   */
  isLoading?: boolean;

  /**
   * Callback when button edit mode changes
   * Called with true when entering button edit mode, false when exiting
   */
  onButtonEditModeChange?: (isEditing: boolean) => void;
}

/**
 * Default button data for new buttons
 */
const getDefaultButton = (): Omit<
  ButtonDTO,
  "id" | "createdAt" | "updatedAt"
> => ({
  Columns: 1,
  Rows: 1,
  Text: "",
  TextColor: "#000000",
  BgColor: null,
  BgMedia: null,
  BgMediaType: "picture",
  BgMediaScaleType: "fit",
  BgLoop: true,
  ActionType: "reply",
  ActionBody: "",
  OpenURLType: "internal",
  InternalBrowser: { Mode: "fullscreen-portrait" },
  TextVAlign: "middle",
  TextHAlign: "center",
  TextSize: "regular",
  Silent: true,
  isJson: false,
});

export const KeyboardForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  onButtonEditModeChange,
}: KeyboardFormProps) => {
  // Form state
  const [humanReadableName, setHumanReadableName] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [inputFieldState, setInputFieldState] =
    useState<InputFieldState>("hidden");
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<KeyboardDTO[]>([]);
  const [buttons, setButtons] = useState<
    (Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & { tempId: string })[]
  >([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showButtonForm, setShowButtonForm] = useState(false);
  const [editingButton, setEditingButton] = useState<
    | (Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & { tempId: string })
    | null
  >(null);
  const [editingButtonIndex, setEditingButtonIndex] = useState<number | null>(
    null
  );

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      setHumanReadableName(initialData.humanReadableName);
      setTitle(initialData.title);
      setInputFieldState(initialData.InputFieldState);
      setBgColor(initialData.BgColor);
      setIsBroadcast(initialData.isBroadcast);
      setHidden(initialData.hidden);
      setIsTemplate(initialData.isTemplate);
      setButtons(
        initialData.Buttons.map((btn, idx) => {
          const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } =
            btn;
          return {
            ...fields,
            tempId: `btn-${idx}-${btn.id || Date.now().toString(36)}`,
          };
        })
      );
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData) {
      return;
    }
    const loadTemplates = async () => {
      try {
        const data = await listKeyboards(
          { isTemplate: true, hidden: false },
          { limit: 100 }
        );
        setTemplates(data.keyboards);
      } catch (err) {
        console.error("Error fetching keyboard templates:", err);
      }
    };
    void loadTemplates();
  }, [initialData]);

  const handleSelectTemplate = (id: string) => {
    if (!id) {
      setTemplateId("");
      return;
    }
    const template = templates.find((kb) => kb.id === id);
    if (!template) {
      return;
    }
    if (
      buttons.length > 0 &&
      !confirm("Replace current buttons with this template?")
    ) {
      return;
    }
    setTemplateId(id);
    setButtons(
      template.Buttons.map((btn, idx) => {
        const {
          id: _buttonId,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...fields
        } = btn;
        return { ...fields, tempId: `btn-${Date.now()}-${idx}` };
      })
    );
  };

  /**
   * Validate a single button
   */
  const validateButton = (
    button: Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
      tempId: string;
    },
    index: number
  ): Record<string, string> => {
    const buttonErrors: Record<string, string> = {};

    if (!button.Text.trim()) {
      buttonErrors[`button-${index}-text`] = "Button text is required";
    }
    if (!button.TextColor || !/^#[0-9A-F]{6}$/i.test(button.TextColor)) {
      buttonErrors[`button-${index}-textColor`] = "Valid hex color is required";
    }
    if (button.BgColor && !/^#[0-9A-F]{6}$/i.test(button.BgColor)) {
      buttonErrors[`button-${index}-bgColor`] = "Valid hex color is required";
    }
    if (button.Columns < 1 || button.Columns > 6) {
      buttonErrors[`button-${index}-columns`] =
        "Columns must be between 1 and 6";
    }
    if (button.Rows < 1 || button.Rows > 3) {
      buttonErrors[`button-${index}-rows`] = "Rows must be between 1 and 3";
    }
    if (!button.ActionBody.trim()) {
      buttonErrors[`button-${index}-actionBody`] = "Action body is required";
    }

    return buttonErrors;
  };

  /**
   * Validate form data (keyboard-level validation only)
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    console.log("validate", humanReadableName, bgColor, buttons);
    // Validate humanReadableName
    if (!humanReadableName.trim()) {
      newErrors.humanReadableName = "Name is required";
    } else if (humanReadableName.trim().length > 100) {
      newErrors.humanReadableName = "Name must be 100 characters or less";
    }

    // Validate bgColor (if provided, must be valid hex color)
    if (bgColor && !/^#[0-9A-F]{6}$/i.test(bgColor)) {
      newErrors.bgColor = "Valid hex color is required (e.g., #FFFFFF)";
    }

    // Validate buttons array (only check if empty, individual button validation happens on save)
    if (buttons.length === 0) {
      newErrors.buttons = "At least one button is required";
    }

    console.log("newErrors", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit keyboard form data
   */
  const submitKeyboardForm = async () => {
    if (!validate()) {
      return;
    }
    // Prepare form data
    const formData: CreateKeyboardInput | UpdateKeyboardInput = {
      humanReadableName: humanReadableName.trim(),
      title: title?.trim() || null,
      InputFieldState: inputFieldState,
      BgColor: bgColor || null,
      isBroadcast,
      hidden,
      isTemplate,
      Buttons: buttons.map(
        ({ tempId: _tempId, ...btn }) =>
          btn as Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">
      ),
    };

    // Add DefaultHeight for create mode
    if (!initialData) {
      (formData as CreateKeyboardInput).DefaultHeight = false;
    }

    await onSubmit(formData);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitKeyboardForm();
  };

  /**
   * Add a new button - shows button form
   */
  const handleAddButton = () => {
    const newButton = {
      ...getDefaultButton(),
      tempId: `btn-${Date.now()}`,
    };
    setEditingButton(newButton);
    setEditingButtonIndex(null); // null means it's a new button
    setShowButtonForm(true);
    onButtonEditModeChange?.(true);
  };

  /**
   * Edit an existing button - shows button form
   */
  const handleEditButton = (index: number) => {
    setEditingButton(buttons[index]);
    setEditingButtonIndex(index);
    setShowButtonForm(true);
    onButtonEditModeChange?.(true);
  };

  /**
   * Handle button click from keyboard preview
   */
  const handlePreviewButtonClick = (index: number) => {
    handleEditButton(index);
  };

  /**
   * Save button from button form
   */
  const handleSaveButton = () => {
    if (!editingButton) return;

    // Validate the button being edited
    const buttonIndex = editingButtonIndex ?? buttons.length;
    const buttonErrors = validateButton(editingButton, buttonIndex);

    // If there are validation errors, set them and don't save
    if (Object.keys(buttonErrors).length > 0) {
      // Clear previous button errors and set new ones
      const newErrors = { ...errors };
      // Remove old button errors for this index
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`button-${buttonIndex}-`)) {
          delete newErrors[key];
        }
      });
      // Add new button errors
      Object.assign(newErrors, buttonErrors);
      setErrors(newErrors);
      return;
    }

    // Clear button-specific errors for this button
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`button-${buttonIndex}-`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);

    // Validation passed, save the button
    if (editingButtonIndex === null) {
      // Adding new button
      setButtons([...buttons, editingButton]);
    } else {
      // Updating existing button
      setButtons(
        buttons.map((btn, i) =>
          i === editingButtonIndex ? editingButton : btn
        )
      );
    }

    // Clear button form state and return to keyboard form
    setEditingButton(null);
    setEditingButtonIndex(null);
    setShowButtonForm(false);
    onButtonEditModeChange?.(false);
  };

  /**
   * Cancel button form - return to keyboard form
   */
  const handleCancelButtonForm = () => {
    // Clear button-specific errors when canceling
    if (editingButtonIndex !== null) {
      const buttonIndex = editingButtonIndex;
      const newErrors = { ...errors };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`button-${buttonIndex}-`)) {
          delete newErrors[key];
        }
      });
      setErrors(newErrors);
    } else {
      // For new buttons, clear errors for the index that would have been used
      const buttonIndex = buttons.length;
      const newErrors = { ...errors };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`button-${buttonIndex}-`)) {
          delete newErrors[key];
        }
      });
      setErrors(newErrors);
    }

    setEditingButton(null);
    setEditingButtonIndex(null);
    setShowButtonForm(false);
    onButtonEditModeChange?.(false);
  };

  /**
   * Update button in button form
   */
  const handleUpdateButtonInForm = (
    updates: Partial<Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">>
  ) => {
    if (!editingButton) return;
    setEditingButton({ ...editingButton, ...updates });
  };

  /**
   * Remove a button
   */
  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleReorderButtons = (fromIndex: number, toIndex: number) => {
    setButtons((prev) => reorderButtons(prev, fromIndex, toIndex));
    setEditingButtonIndex((current) => {
      if (current === null) return current;
      if (current === fromIndex) return toIndex;
      if (fromIndex < current && current <= toIndex) return current - 1;
      if (toIndex <= current && current < fromIndex) return current + 1;
      return current;
    });
  };

  /**
   * Columns used on the last (current) row after wrapping at 6.
   */
  const getCurrentRowColumns = (): number => {
    let used = 0;
    for (const btn of buttons) {
      if (used + btn.Columns > 6) {
        used = 0;
      }
      used += btn.Columns;
    }
    return used;
  };

  // Get buttons for preview (include editing button if it exists)
  const getPreviewButtons = () => {
    if (showButtonForm && editingButton) {
      if (editingButtonIndex === null) {
        // Adding new button - include it in preview
        return [...buttons, editingButton];
      } else {
        // Editing existing button - replace it in preview
        return buttons.map((btn, i) =>
          i === editingButtonIndex ? editingButton : btn
        );
      }
    }
    return buttons;
  };

  // Show button form if in button form mode
  if (showButtonForm && editingButton) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {editingButtonIndex === null ? "Add New Button" : "Edit Button"}
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Configure the button properties
          </p>
        </div>

        {/* Main Content Grid - Button Form on left, Keyboard Preview on right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column - Button Form */}
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <ButtonForm
                button={editingButton}
                index={editingButtonIndex ?? buttons.length}
                errors={errors}
                onUpdate={handleUpdateButtonInForm}
              />
            </div>

            {/* Button Form Actions */}
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancelButtonForm}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveButton}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Save Button
              </button>
            </div>
          </div>

          {/* Right Column - Keyboard Preview */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Keyboard Preview
              </h2>
              <KeyboardPreview
                buttons={getPreviewButtons()}
                bgColor={bgColor}
                title={title}
                inputFieldState={inputFieldState}
                onButtonClick={handlePreviewButtonClick}
              />
            </div>
          </div>
        </div>

        {/* Keyboard Form Actions - Always visible */}
        <div className="mt-6 flex items-center justify-end space-x-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              disabled={isLoading}
            >
              Cancel Keyboard
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              // First save the button if we're editing one
              if (showButtonForm && editingButton) {
                handleSaveButton();
                // Wait a bit for state to update, then save keyboard
                setTimeout(async () => {
                  await submitKeyboardForm();
                }, 100);
              } else {
                // Direct keyboard save
                await submitKeyboardForm();
              }
            }}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-800"
            disabled={isLoading}
          >
            {isLoading
              ? "Saving..."
              : initialData
              ? "Update Keyboard"
              : "Create Keyboard"}
          </button>
        </div>
      </div>
    );
  }

  // Show keyboard form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Content Grid - Form on left, Preview on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Form Fields */}
        <div className="space-y-6">
          {/* Keyboard Basic Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Keyboard Information
            </h2>

            <div className="space-y-4">
              {!initialData && (
                <div>
                  <label
                    htmlFor="startFromTemplate"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Start from template
                  </label>
                  <select
                    id="startFromTemplate"
                    aria-label="Start from template"
                    value={templateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">None</option>
                    {templates.map((kb) => (
                      <option key={kb.id} value={kb.id}>
                        {kb.humanReadableName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Human Readable Name */}
              <div>
                <label
                  htmlFor="humanReadableName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="humanReadableName"
                  value={humanReadableName}
                  onChange={(e) => setHumanReadableName(e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.humanReadableName
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Enter keyboard name"
                  maxLength={100}
                />
                {errors.humanReadableName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.humanReadableName}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Title (Optional)
                </label>
                <input
                  type="text"
                  id="title"
                  value={title || ""}
                  onChange={(e) => setTitle(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter keyboard title"
                />
              </div>

              {/* Input Field State */}
              <div>
                <label
                  htmlFor="inputFieldState"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Input Field State
                </label>
                <select
                  id="inputFieldState"
                  value={inputFieldState}
                  onChange={(e) =>
                    setInputFieldState(e.target.value as InputFieldState)
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="regular">Regular</option>
                  <option value="minimized">Minimized</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {/* Background Color */}
              <div>
                <label
                  htmlFor="bgColor"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Background Color (Optional)
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="color"
                    id="bgColor"
                    value={bgColor || "#ffffff"}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={bgColor || ""}
                    onChange={(e) => setBgColor(e.target.value || null)}
                    placeholder="#FFFFFF"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    pattern="^#[0-9A-F]{6}$"
                  />
                  {bgColor && (
                    <button
                      type="button"
                      onClick={() => setBgColor(null)}
                      className="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {errors.bgColor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.bgColor}
                  </p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isBroadcast}
                    onChange={(e) => setIsBroadcast(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Broadcast Keyboard
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(e) => setHidden(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Hidden from Lists
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isTemplate}
                    onChange={(e) => setIsTemplate(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Template Keyboard
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Templates cannot be attached to steps. Use them as a starting
                  point when creating a new keyboard.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons Management */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Buttons ({buttons.length})
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Current row: {getCurrentRowColumns()}/6 (wraps)
                </span>
                <button
                  type="button"
                  onClick={handleAddButton}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Add New Keyboard Button
                </button>
              </div>
            </div>

            {errors.buttons && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                {errors.buttons}
              </p>
            )}

            <ButtonsList
              buttons={buttons}
              onEdit={handleEditButton}
              onRemove={handleRemoveButton}
              onReorder={handleReorderButtons}
            />
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Keyboard Preview
            </h2>
            <KeyboardPreview
              buttons={getPreviewButtons()}
              bgColor={bgColor}
              title={title}
              inputFieldState={inputFieldState}
              onButtonClick={handlePreviewButtonClick}
              onReorder={handleReorderButtons}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : initialData
            ? "Update Keyboard"
            : "Create Keyboard"}
        </button>
      </div>
    </form>
  );
};

