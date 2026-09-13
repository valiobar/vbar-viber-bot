"use client";

/**
 * CardEditor
 *
 * Edits one carousel card. Structured mode: image / title / description / CTAs.
 * Custom mode: free-form button grid with CarouselButtonForm.
 */

import { useState } from "react";
import type {
  ButtonDTO,
  CarouselCardDTO,
  CarouselCardMode,
  CarouselCtaActionType,
  CarouselCtaDTO,
} from "@/entities/carousel";
import { reorderItems } from "../lib/reorderItems";
import { newTempId } from "../lib/tempId";
import { simulateCardRows } from "../lib/simulateCardRows";
import { CarouselButtonForm } from "./CarouselButtonForm";
import {
  CarouselButtonsList,
  type FormButton,
} from "./CarouselButtonsList";
import { CtaButtonsList, type EditableCta } from "./CtaButtonsList";

interface CardEditorProps {
  card: CarouselCardDTO;
  index: number;
  buttonsGroupColumns: number;
  buttonsGroupRows: number;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<CarouselCardDTO>) => void;
}

const getDefaultCta = (): EditableCta => ({
  tempId: newTempId("cta"),
  text: "",
  textColor: "#FFFFFF",
  bgColor: "#7360F2",
  actionType: "reply",
  actionBody: "",
  openURLType: "external",
  silent: false,
});

const getDefaultButton = (groupColumns: number): FormButton => ({
  tempId: newTempId("btn"),
  Columns: groupColumns,
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

const toFormButtons = (buttons: ButtonDTO[]): FormButton[] =>
  buttons.map((button, idx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = button;
    const tempId =
      (button as ButtonDTO & { tempId?: string }).tempId ||
      `btn-${button.id || idx}`;
    return { ...fields, tempId };
  });

const fromFormButtons = (buttons: FormButton[]): ButtonDTO[] =>
  buttons as unknown as ButtonDTO[];

const toFormCtas = (ctas: CarouselCtaDTO[]): EditableCta[] =>
  ctas.map((cta, idx) => ({
    ...cta,
    tempId: (cta as EditableCta).tempId || `cta-${idx}`,
  }));

const cardHasContent = (card: CarouselCardDTO): boolean => {
  if (card.mode === "structured") {
    return Boolean(
      card.image ||
        card.title.trim() ||
        card.description.trim() ||
        card.ctaButtons.length
    );
  }
  return card.Buttons.length > 0;
};

/** Same row math as the server-side CardFlattener */
const getRowsUsed = (card: CarouselCardDTO, groupRows: number): number => {
  const hasText = Boolean(card.title.trim() || card.description.trim());
  const ctaRows = card.ctaButtons.length;
  return card.image || hasText ? groupRows : ctaRows;
};

const ColorField = ({
  id,
  label,
  value,
  error,
  required,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    <div className="mt-1 flex items-center space-x-2">
      <input
        type="color"
        id={id}
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className={`flex-1 rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
        pattern="#[0-9A-Fa-f]{6}"
      />
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
);

export const CardEditor = ({
  card,
  index,
  buttonsGroupColumns,
  buttonsGroupRows,
  errors,
  onUpdate,
}: CardEditorProps) => {
  const [editingButtonIndex, setEditingButtonIndex] = useState<number | null>(
    null
  );
  const formButtons = toFormButtons(card.Buttons);
  const formCtas = toFormCtas(card.ctaButtons);
  const imageRows = Math.max(
    buttonsGroupRows -
      (card.title.trim() || card.description.trim() ? card.textRows : 0) -
      card.ctaButtons.length,
    0
  );
  const customRowsFilled = simulateCardRows(formButtons, buttonsGroupColumns);

  const handleModeChange = (mode: CarouselCardMode) => {
    if (mode === card.mode) return;
    if (
      cardHasContent(card) &&
      !confirm(
        "Switching mode will replace this card's current content. Continue?"
      )
    ) {
      return;
    }
    if (mode === "custom") {
      onUpdate({
        mode,
        image: null,
        title: "",
        description: "",
        ctaButtons: [],
        Buttons: [],
      });
      setEditingButtonIndex(null);
      return;
    }
    onUpdate({ mode, Buttons: [] });
    setEditingButtonIndex(null);
  };

  const handleCtaUpdate = (ctaIndex: number, updates: Partial<CarouselCtaDTO>) => {
    onUpdate({
      ctaButtons: formCtas.map((cta, i) =>
        i === ctaIndex ? { ...cta, ...updates } : cta
      ),
    });
  };

  const handleRemoveCta = (ctaIndex: number) => {
    onUpdate({
      ctaButtons: formCtas.filter((_, i) => i !== ctaIndex),
    });
  };

  const handleAddCta = () => {
    if (card.ctaButtons.length >= 3) return;
    onUpdate({ ctaButtons: [...card.ctaButtons, getDefaultCta()] });
  };

  const handleAddButton = () => {
    const next = [...formButtons, getDefaultButton(buttonsGroupColumns)];
    onUpdate({ Buttons: fromFormButtons(next) });
    setEditingButtonIndex(next.length - 1);
  };

  const handleUpdateButton = (
    buttonIndex: number,
    updates: Partial<Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">>
  ) => {
    const next = formButtons.map((button, i) =>
      i === buttonIndex ? { ...button, ...updates } : button
    );
    onUpdate({ Buttons: fromFormButtons(next) });
  };

  const handleRemoveButton = (buttonIndex: number) => {
    const next = formButtons.filter((_, i) => i !== buttonIndex);
    onUpdate({ Buttons: fromFormButtons(next) });
    setEditingButtonIndex((current) => {
      if (current === null) return null;
      if (current === buttonIndex) return null;
      if (current > buttonIndex) return current - 1;
      return current;
    });
  };

  const handleReorderButtons = (from: number, to: number) => {
    const next = reorderItems(formButtons, from, to);
    onUpdate({ Buttons: fromFormButtons(next) });
    setEditingButtonIndex((current) => {
      if (current === null) return current;
      if (current === from) return to;
      if (from < current && current <= to) return current - 1;
      if (to <= current && current < from) return current + 1;
      return current;
    });
  };

  const handleReorderCtas = (from: number, to: number) => {
    onUpdate({ ctaButtons: reorderItems(formCtas, from, to) });
  };

  const handleToggleEditButton = (buttonIndex: number) => {
    setEditingButtonIndex((current) =>
      current === buttonIndex ? null : buttonIndex
    );
  };

  return (
    <div className="space-y-4" data-testid="card-editor">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Edit card {index + 1}
        </h3>
      </div>

      <div
        className="flex rounded-md border border-gray-300 p-1 dark:border-gray-600"
        role="tablist"
        aria-label="Card mode"
      >
        {(["structured", "custom"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={card.mode === mode}
            onClick={() => handleModeChange(mode)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              card.mode === mode
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {mode === "structured" ? "Structured" : "Custom grid"}
          </button>
        ))}
      </div>

      {card.mode === "structured" ? (
        <>
          <div>
            <label
              htmlFor={`card-${index}-image`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Image URL
            </label>
            <input
              type="url"
              id={`card-${index}-image`}
              value={card.image || ""}
              onChange={(e) => onUpdate({ image: e.target.value || null })}
              placeholder="https://example.com/image.jpg"
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors[`card-${index}-image`]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors[`card-${index}-image`] && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors[`card-${index}-image`]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`card-${index}-title`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Title
            </label>
            <input
              type="text"
              id={`card-${index}-title`}
              value={card.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Card title"
            />
          </div>

          <ColorField
            id={`card-${index}-titleColor`}
            label="Title color"
            value={card.titleColor}
            error={errors[`card-${index}-titleColor`]}
            onChange={(value) => onUpdate({ titleColor: value })}
          />

          <div>
            <label
              htmlFor={`card-${index}-description`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>
            <textarea
              id={`card-${index}-description`}
              value={card.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Card description"
            />
          </div>

          <ColorField
            id={`card-${index}-descriptionColor`}
            label="Description color"
            value={card.descriptionColor}
            error={errors[`card-${index}-descriptionColor`]}
            onChange={(value) => onUpdate({ descriptionColor: value })}
          />

          <div>
            <label
              htmlFor={`card-${index}-textRows`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Text rows (1-3)
            </label>
            <select
              id={`card-${index}-textRows`}
              value={card.textRows}
              onChange={(e) =>
                onUpdate({ textRows: Number.parseInt(e.target.value, 10) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                CTA buttons ({card.ctaButtons.length}/3)
              </h4>
              <button
                type="button"
                onClick={handleAddCta}
                disabled={card.ctaButtons.length >= 3}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Add CTA button
              </button>
            </div>

            <CtaButtonsList
              ctas={formCtas}
              onReorder={handleReorderCtas}
              renderCta={(cta, ctaIndex, dragHandle) => (
              <div
                className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dragHandle}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CTA {ctaIndex + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCta(ctaIndex)}
                    className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label
                    htmlFor={`card-${index}-cta-${ctaIndex}-text`}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Text (Optional)
                  </label>
                  <input
                    type="text"
                    id={`card-${index}-cta-${ctaIndex}-text`}
                    value={cta.text}
                    onChange={(e) =>
                      handleCtaUpdate(ctaIndex, { text: e.target.value })
                    }
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      errors[`card-${index}-cta-${ctaIndex}-text`]
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    placeholder="Button text"
                  />
                  {errors[`card-${index}-cta-${ctaIndex}-text`] && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors[`card-${index}-cta-${ctaIndex}-text`]}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField
                    id={`card-${index}-cta-${ctaIndex}-textColor`}
                    label="Text color"
                    value={cta.textColor}
                    onChange={(value) =>
                      handleCtaUpdate(ctaIndex, { textColor: value })
                    }
                  />
                  <ColorField
                    id={`card-${index}-cta-${ctaIndex}-bgColor`}
                    label="Background color"
                    value={cta.bgColor || "#7360F2"}
                    onChange={(value) =>
                      handleCtaUpdate(ctaIndex, { bgColor: value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`card-${index}-cta-${ctaIndex}-actionType`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Action type
                    </label>
                    <select
                      id={`card-${index}-cta-${ctaIndex}-actionType`}
                      value={cta.actionType}
                      onChange={(e) =>
                        handleCtaUpdate(ctaIndex, {
                          actionType: e.target.value as CarouselCtaActionType,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="reply">Reply</option>
                      <option value="open-url">Open URL</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`card-${index}-cta-${ctaIndex}-actionBody`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Action body
                      {cta.actionType !== "none" && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <input
                      type="text"
                      id={`card-${index}-cta-${ctaIndex}-actionBody`}
                      value={cta.actionBody}
                      onChange={(e) =>
                        handleCtaUpdate(ctaIndex, { actionBody: e.target.value })
                      }
                      className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                        errors[`card-${index}-cta-${ctaIndex}-actionBody`]
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder={
                        cta.actionType === "open-url" ? "https://..." : "Reply text"
                      }
                    />
                    {errors[`card-${index}-cta-${ctaIndex}-actionBody`] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors[`card-${index}-cta-${ctaIndex}-actionBody`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              )}
            />
          </div>

          <p
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="card-editor-rows-indicator"
          >
            Image gets {imageRows} of {buttonsGroupRows} rows
            {card.image || card.title.trim() || card.description.trim()
              ? ` · card fills ${getRowsUsed(card, buttonsGroupRows)} / ${buttonsGroupRows}`
              : ""}
          </p>
          {errors[`card-${index}`] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors[`card-${index}`]}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Buttons ({formButtons.length})
            </h4>
            <button
              type="button"
              onClick={handleAddButton}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Add button
            </button>
          </div>

          {formButtons.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No buttons yet. Click &quot;Add button&quot; to start a custom grid.
            </p>
          ) : (
            <CarouselButtonsList
              buttons={formButtons}
              editingIndex={editingButtonIndex}
              onEdit={handleToggleEditButton}
              onRemove={handleRemoveButton}
              onReorder={handleReorderButtons}
              renderEditor={(buttonIndex) => (
                <CarouselButtonForm
                  button={formButtons[buttonIndex]}
                  index={buttonIndex}
                  cardIndex={index}
                  buttonsGroupColumns={buttonsGroupColumns}
                  buttonsGroupRows={buttonsGroupRows}
                  errors={errors}
                  onUpdate={(updates) =>
                    handleUpdateButton(buttonIndex, updates)
                  }
                />
              )}
            />
          )}

          <p
            className={`text-xs ${
              customRowsFilled === buttonsGroupRows
                ? "text-gray-500 dark:text-gray-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
            data-testid="card-editor-rows-indicator"
          >
            Rows filled: {customRowsFilled} / {buttonsGroupRows}
            {customRowsFilled !== buttonsGroupRows
              ? " — every card must fill the block exactly"
              : ""}
          </p>
          {errors[`card-${index}`] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors[`card-${index}`]}
            </p>
          )}
        </>
      )}
    </div>
  );
};
