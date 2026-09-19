"use client";

/**
 * CarouselForm
 *
 * Create/edit a carousel: meta fields + cards list/editor on the left,
 * sticky phone preview on the right. Cards are sent as Cards[] on submit.
 */

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  CarouselPreview,
  listCarousels,
  type CarouselCardDTO,
  type CarouselDTO,
  type CreateCarouselInput,
  type UpdateCarouselInput,
} from "@/entities/carousel";
import {
  resolveButtonColors,
  resolveButtonFrame,
  resolveCtaColors,
  useBotSettingsStore,
} from "@/entities/bot-settings";
import { MissingFieldsNotice } from "@/shared";
import type { CarouselDraft } from "@vbar/shared";
import { reorderItems } from "../lib/reorderItems";
import { simulateCardRows } from "../lib/simulateCardRows";
import { newTempId } from "../lib/tempId";
import { CardEditor } from "./CardEditor";
import { CardsList, type EditableCard } from "./CardsList";
import { CarouselAiChat } from "./CarouselAiChat";

interface CarouselFormProps {
  initialData?: CarouselDTO;
  onSubmit: (data: CreateCarouselInput | UpdateCarouselInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Page heading rendered in the squeezed content column (create + AI panel) */
  heading?: ReactNode;
}

const getDefaultCard = (): CarouselCardDTO => ({
  mode: "structured",
  image: null,
  title: "",
  titleColor: "#323232",
  description: "",
  descriptionColor: "#777777",
  textRows: 2,
  ctaButtons: [],
  Buttons: [],
});

const stampItemTempId = <T,>(
  item: T,
  prefix: string
): T & { tempId: string } => ({
  ...item,
  tempId: (item as { tempId?: string }).tempId || newTempId(prefix),
});

const toEditableCard = (card: CarouselCardDTO, idx: number): EditableCard => ({
  ...card,
  title: card.title ?? "",
  description: card.description ?? "",
  tempId: `card-${idx}-${newTempId("card")}`,
  Buttons: (card.Buttons ?? []).map((button) => stampItemTempId(button, "btn")),
  ctaButtons: (card.ctaButtons ?? []).map((cta) => stampItemTempId(cta, "cta")),
});

const stripTempId = <T extends { tempId?: string }>({
  tempId: _tempId,
  ...rest
}: T) => rest;

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isHexColor = (value: string): boolean => /^#[0-9A-F]{6}$/i.test(value);

const readText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readActionBody = (value: unknown): string => {
  const text = readText(value);
  if (text) return text;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
};

const firstButtonText = (card: EditableCard): string => {
  const firstButton = card.Buttons[0];
  if (readText(firstButton?.Text)) return readText(firstButton?.Text);
  const firstCta = card.ctaButtons[0];
  if (readText(firstCta?.text)) return readText(firstCta?.text);
  return "";
};

const cardLabel = (card: EditableCard, index: number): string => {
  if (readText(card.title)) return `"${readText(card.title)}"`;
  const buttonText = firstButtonText(card);
  if (buttonText) return `"${buttonText}"`;
  return `#${index + 1}`;
};

const validateJsonActionBody = (raw: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return "JSON action body must be an object";
    }
    const trigger = (parsed as { trigger?: unknown }).trigger;
    if (typeof trigger !== "string" || !trigger.trim()) {
      return "JSON action body requires a non-empty 'trigger' property";
    }
    return null;
  } catch {
    return "Action body must be valid JSON";
  }
};

const collectCtaErrors = (
  card: EditableCard,
  index: number,
  groupRows: number
): Record<string, string> => {
  const cardErrors: Record<string, string> = {};
  const hasText = Boolean(readText(card.title) || readText(card.description));
  const ctas = card.ctaButtons ?? [];
  if (!card.image && !hasText && ctas.length === 0) {
    cardErrors[`card-${index}`] = "Add an image, text, or at least one button";
  }
  if (card.image && !isValidHttpUrl(card.image)) {
    cardErrors[`card-${index}-image`] = "Image must be a valid http(s) URL";
  }
  const textRows = hasText ? card.textRows : 0;
  if (card.image && groupRows - textRows - ctas.length < 1) {
    cardErrors[`card-${index}`] =
      "No rows left for the image — reduce text rows or CTA buttons";
  }
  ctas.forEach((cta, j) => {
    const actionType = cta.actionType || "reply";
    const actionBody = readActionBody(cta.actionBody);
    if (actionType !== "none" && !actionBody) {
      cardErrors[`card-${index}-cta-${j}-actionBody`] =
        actionType === "reply"
          ? "reply text (ActionBody)"
          : "URL to open (ActionBody)";
    } else if (actionType === "open-url" && actionBody && !isValidHttpUrl(actionBody)) {
      cardErrors[`card-${index}-cta-${j}-actionBody`] =
        "Action body must be a valid http(s) URL";
    }
  });
  return cardErrors;
};

const collectCustomButtonErrors = (
  card: EditableCard,
  index: number,
  groupColumns: number,
  groupRows: number
): Record<string, string> => {
  const cardErrors: Record<string, string> = {};
  const buttons = card.Buttons ?? [];
  if (buttons.length === 0) {
    cardErrors[`card-${index}`] = "Custom card must have at least one button";
    return cardErrors;
  }
  buttons.forEach((button, j) => {
    if (button.Columns < 1 || button.Columns > groupColumns) {
      cardErrors[`card-${index}-button-${j}-columns`] =
        `Columns must be 1-${groupColumns}`;
    }
    if (button.Rows < 1 || button.Rows > groupRows) {
      cardErrors[`card-${index}-button-${j}-rows`] =
        `Rows must be 1-${groupRows}`;
    }
    const actionType = button.ActionType || "reply";
    const actionBody = readActionBody(button.ActionBody);
    if (actionType !== "none" && !actionBody) {
      cardErrors[`card-${index}-button-${j}-actionBody`] =
        actionType === "reply"
          ? "reply text (ActionBody)"
          : "URL to open (ActionBody)";
    } else if (button.isJson && actionType === "reply") {
      const jsonError = validateJsonActionBody(actionBody);
      if (jsonError) {
        cardErrors[`card-${index}-button-${j}-actionBody`] = jsonError;
      }
    } else if (
      actionType === "open-url" &&
      actionBody &&
      !isValidHttpUrl(actionBody)
    ) {
      cardErrors[`card-${index}-button-${j}-actionBody`] =
        "Action body must be a valid http(s) URL";
    }
    if (button.BgMedia && !isValidHttpUrl(button.BgMedia)) {
      cardErrors[`card-${index}-button-${j}-bgMedia`] =
        "Background media must be a valid http(s) URL";
    }
  });
  const usedRows = simulateCardRows(buttons, groupColumns);
  if (usedRows !== groupRows) {
    cardErrors[`card-${index}`] =
      `Buttons fill ${usedRows} of ${groupRows} rows — every card must fill the block exactly`;
  }
  return cardErrors;
};

const collectCardErrors = (
  card: EditableCard,
  index: number,
  groupColumns: number,
  groupRows: number
): Record<string, string> => {
  const cardErrors: Record<string, string> = {};

  if (card.titleColor && !isHexColor(card.titleColor)) {
    cardErrors[`card-${index}-titleColor`] = "Valid hex color is required";
  }
  if (card.descriptionColor && !isHexColor(card.descriptionColor)) {
    cardErrors[`card-${index}-descriptionColor`] = "Valid hex color is required";
  }

  if (card.mode === "structured") {
    return { ...cardErrors, ...collectCtaErrors(card, index, groupRows) };
  }
  return { ...cardErrors, ...collectCustomButtonErrors(card, index, groupColumns, groupRows) };
};

const itemLabelFromKey = (
  key: string,
  prefix: string,
  getLabel: (itemIndex: number) => string
): string | null => {
  const match = new RegExp(String.raw`-${prefix}-(\d+)-`).exec(key);
  if (!match) return null;
  const itemIndex = Number(match[1]);
  return getLabel(itemIndex);
};

const summarizeCardError = (
  key: string,
  message: string,
  card: EditableCard,
  index: number
): string => {
  const label = cardLabel(card, index);
  const buttonLabel = itemLabelFromKey(key, "button", (itemIndex) => {
    const button = card.Buttons[itemIndex];
    const text = readText(button?.Text);
    return text ? `"${text}"` : `#${itemIndex + 1}`;
  });
  if (buttonLabel) return `Card ${label}, button ${buttonLabel}: ${message}`;
  const ctaLabel = itemLabelFromKey(key, "cta", (itemIndex) => {
    const cta = card.ctaButtons[itemIndex];
    const text = readText(cta?.text);
    return text ? `"${text}"` : `#${itemIndex + 1}`;
  });
  if (ctaLabel) return `Card ${label}, button ${ctaLabel}: ${message}`;
  return `Card ${label}: ${message}`;
};

const collectFormValidation = (
  name: string,
  color: string | null,
  formCards: EditableCard[],
  cols: number,
  rows: number
): {
  errors: Record<string, string>;
  summary: string[];
  firstInvalidCardIndex: number | null;
  firstInvalidButtonIndex: number | null;
} => {
  const errors: Record<string, string> = {};
  const summary: string[] = [];
  let firstInvalidCardIndex: number | null = null;
  let firstInvalidButtonIndex: number | null = null;

  if (!readText(name)) {
    errors.humanReadableName = "Name is required";
    summary.push("Carousel name (required)");
  } else if (readText(name).length > 100) {
    errors.humanReadableName = "Name must be 100 characters or less";
    summary.push("Carousel name must be 100 characters or less");
  }

  if (color && !isHexColor(color)) {
    errors.bgColor = "Valid hex color is required";
    summary.push("Carousel background color must be a valid hex color");
  }

  if (formCards.length === 0) {
    errors.cards = "At least one card is required";
    summary.push("At least one card is required");
  }

  formCards.forEach((card, i) => {
    const cardErrors = collectCardErrors(card, i, cols, rows);
    if (Object.keys(cardErrors).length > 0 && firstInvalidCardIndex === null) {
      firstInvalidCardIndex = i;
    }
    Object.assign(errors, cardErrors);
    Object.entries(cardErrors).forEach(([key, message]) => {
      summary.push(summarizeCardError(key, message, card, i));
    });
  });

  const firstActionBodyKey = Object.keys(errors).find((key) =>
    key.endsWith("-actionBody")
  );
  if (firstActionBodyKey) {
    const cardMatch = /^card-(\d+)/.exec(firstActionBodyKey);
    const buttonMatch = /-button-(\d+)-actionBody$/.exec(firstActionBodyKey);
    const ctaMatch = /-cta-(\d+)-actionBody$/.exec(firstActionBodyKey);
    const cardIndex = Number(cardMatch?.[1]);
    const itemIndex = Number(buttonMatch?.[1] ?? ctaMatch?.[1]);
    if (Number.isFinite(cardIndex)) {
      firstInvalidCardIndex = cardIndex;
    }
    if (Number.isFinite(itemIndex)) {
      firstInvalidButtonIndex = itemIndex;
    }
  }

  return { errors, summary, firstInvalidCardIndex, firstInvalidButtonIndex };
};

export const CarouselForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  heading,
}: CarouselFormProps) => {
  const [humanReadableName, setHumanReadableName] = useState("");
  const [hidden, setHidden] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<CarouselDTO[]>([]);
  const [sourceCarousels, setSourceCarousels] = useState<CarouselDTO[]>([]);
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [groupColumns, setGroupColumns] = useState(6);
  const [groupRows, setGroupRows] = useState(7);
  const [cards, setCards] = useState<EditableCard[]>([]);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [focusButtonIndex, setFocusButtonIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAiChat, setShowAiChat] = useState(false);
  const [submitMissingFields, setSubmitMissingFields] = useState<string[]>([]);
  const formColumnRef = useRef<HTMLDivElement>(null);
  const settings = useBotSettingsStore((state) => state.settings);
  const loadBotSettings = useBotSettingsStore((state) => state.load);

  useEffect(() => {
    void loadBotSettings();
  }, [loadBotSettings]);

  useEffect(() => {
    if (!initialData) return;
    setHumanReadableName(initialData.humanReadableName);
    setHidden(initialData.hidden);
    setIsTemplate(initialData.isTemplate);
    setBgColor(initialData.BgColor);
    setGroupColumns(initialData.ButtonsGroupColumns);
    setGroupRows(initialData.ButtonsGroupRows);
    setCards(initialData.Cards.map((card, idx) => toEditableCard(card, idx)));
  }, [initialData]);

  useEffect(() => {
    if (initialData) return;
    const loadCarousels = async () => {
      try {
        const data = await listCarousels({ hidden: false }, { limit: 100 });
        setSourceCarousels(data.carousels);
        setTemplates(data.carousels.filter((c) => c.isTemplate));
      } catch (err) {
        console.error("Error fetching carousels:", err);
      }
    };
    void loadCarousels();
  }, [initialData]);

  /** Live form state as a draft — the AI chat sends it so manual edits survive refinements. */
  const currentFormDraft: CarouselDraft = {
    humanReadableName,
    BgColor: bgColor,
    ButtonsGroupColumns: groupColumns,
    ButtonsGroupRows: groupRows,
    Cards: cards.map(({ tempId: _t, ...card }) => ({
      ...card,
      Buttons: card.Buttons.map((button) =>
        stripTempId(button as typeof button & { tempId?: string })
      ),
      ctaButtons: card.ctaButtons.map((cta) =>
        stripTempId(cta as typeof cta & { tempId?: string })
      ),
    })),
  };

  const scrollFormToTop = () => {
    formColumnRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyValidationResult = (
    result: ReturnType<typeof collectFormValidation>,
    extraSummary: string[] = []
  ): boolean => {
    const summary = [...result.summary];
    extraSummary.forEach((field) => {
      if (field && !summary.includes(field)) {
        summary.push(field);
      }
    });
    setErrors(result.errors);
    setSubmitMissingFields(summary);
    setFocusButtonIndex(result.firstInvalidButtonIndex);
    if (result.firstInvalidCardIndex !== null) {
      setEditingCardIndex(result.firstInvalidCardIndex);
    }
    if (summary.length > 0) {
      scrollFormToTop();
    }
    return summary.length === 0;
  };

  const hydrateFormFromDraft = (
    draft: CarouselDraft,
    missingFields?: string[]
  ) => {
    const nextCards = draft.Cards.map((card, idx) =>
      toEditableCard(card as CarouselCardDTO, idx)
    );
    setHumanReadableName(draft.humanReadableName);
    setBgColor(draft.BgColor);
    setGroupColumns(draft.ButtonsGroupColumns);
    setGroupRows(draft.ButtonsGroupRows);
    setCards(nextCards);
    setEditingCardIndex(null);
    try {
      applyValidationResult(
        collectFormValidation(
          draft.humanReadableName,
          draft.BgColor,
          nextCards,
          draft.ButtonsGroupColumns,
          draft.ButtonsGroupRows
        ),
        missingFields
      );
    } catch {
      const fallback = (missingFields ?? []).filter(Boolean);
      setSubmitMissingFields(fallback);
      if (fallback.length > 0) {
        scrollFormToTop();
      }
    }
  };

  const handleSelectTemplate = (id: string) => {
    if (!id) {
      setTemplateId("");
      return;
    }
    const template = templates.find((c) => c.id === id);
    if (!template) return;
    if (
      cards.length > 0 &&
      !confirm("Replace current cards with this template?")
    ) {
      return;
    }
    setTemplateId(id);
    setGroupColumns(template.ButtonsGroupColumns);
    setGroupRows(template.ButtonsGroupRows);
    setBgColor(template.BgColor);
    setCards(template.Cards.map((card, idx) => toEditableCard(card, idx)));
    setEditingCardIndex(null);
  };

  const handleAddCard = () => {
    const nextIndex = cards.length;
    setCards((prev) => [
      ...prev,
      { ...getDefaultCard(), tempId: `card-${Date.now()}` },
    ]);
    setEditingCardIndex(nextIndex);
  };

  const handleDuplicateCard = (index: number) => {
    const source = cards[index];
    if (!source) return;
    const clone = structuredClone(source);
    const copy: EditableCard = {
      ...clone,
      tempId: newTempId("card"),
      Buttons: clone.Buttons.map((button) => ({
        ...button,
        tempId: newTempId("btn"),
      })),
      ctaButtons: clone.ctaButtons.map((cta) => ({
        ...cta,
        tempId: newTempId("cta"),
      })),
    };
    setCards((prev) => [
      ...prev.slice(0, index + 1),
      copy,
      ...prev.slice(index + 1),
    ]);
    setEditingCardIndex((current) => {
      if (current === null) return current;
      if (current > index) return current + 1;
      return current;
    });
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setEditingCardIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const handleUpdateCard = (updates: Partial<CarouselCardDTO>) => {
    if (editingCardIndex === null) return;
    setCards((prev) =>
      prev.map((card, i) =>
        i === editingCardIndex ? { ...card, ...updates } : card
      )
    );
  };

  const handleReorderCards = (from: number, to: number) => {
    setCards((prev) => reorderItems(prev, from, to));
    setEditingCardIndex((current) => {
      if (current === null) return current;
      if (current === from) return to;
      if (from < current && current <= to) return current - 1;
      if (to <= current && current < from) return current + 1;
      return current;
    });
  };

  /**
   * Validate the whole form. Field errors stay on the inputs; the summary
   * banner is shown after Create / Update, or when an AI draft is applied
   * with missing fields.
   */
  const validate = (): boolean =>
    applyValidationResult(
      collectFormValidation(
        humanReadableName,
        bgColor,
        cards,
        groupColumns,
        groupRows
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const formData: CreateCarouselInput | UpdateCarouselInput = {
      humanReadableName: humanReadableName.trim(),
      hidden,
      isTemplate,
      BgColor: bgColor || null,
      ButtonsGroupColumns: groupColumns,
      ButtonsGroupRows: groupRows,
      Cards: cards.map(({ tempId: _t, ...card }) => ({
        ...card,
        Buttons: card.Buttons.map((button) =>
          stripTempId(button as typeof button & { tempId?: string })
        ),
        ctaButtons: card.ctaButtons.map((cta) =>
          stripTempId(cta as typeof cta & { tempId?: string })
        ),
      })),
    };
    await onSubmit(formData);
  };

  const editingCard =
    editingCardIndex !== null ? cards[editingCardIndex] : undefined;
  let submitLabel = "Create Carousel";
  if (isLoading) {
    submitLabel = "Saving...";
  } else if (initialData) {
    submitLabel = "Update Carousel";
  }

  return (
    <div className="-m-4 -mt-20 flex h-screen md:-m-8 md:-mt-8">
      <div
        ref={formColumnRef}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pt-20 md:p-8 md:pt-8"
      >
        {heading}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="space-y-6"
          data-testid="carousel-form"
        >
      <MissingFieldsNotice
        testId="form-missing-fields-notice"
        title="Complete these required fields:"
        fields={submitMissingFields}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Carousel Information
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
                    {templates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.humanReadableName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-testid="ai-chat-open"
                    onClick={() => setShowAiChat(true)}
                    className="mt-2 w-full rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Create with AI
                  </button>
                </div>
              )}

              {initialData && (
                <button
                  type="button"
                  data-testid="ai-chat-open"
                  onClick={() => setShowAiChat(true)}
                  className="w-full rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Edit with AI
                </button>
              )}

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
                  placeholder="Enter carousel name"
                  maxLength={100}
                />
                {errors.humanReadableName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.humanReadableName}
                  </p>
                )}
              </div>

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
                    pattern="#[0-9A-Fa-f]{6}"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="buttonsGroupColumns"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Card columns (1-6)
                  </label>
                  <select
                    id="buttonsGroupColumns"
                    value={groupColumns}
                    onChange={(e) =>
                      setGroupColumns(Number.parseInt(e.target.value, 10))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="buttonsGroupRows"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Card rows (1-7)
                  </label>
                  <select
                    id="buttonsGroupRows"
                    value={groupRows}
                    onChange={(e) =>
                      setGroupRows(Number.parseInt(e.target.value, 10))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  Template Carousel
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Templates cannot be attached to messages. Use them as a starting
                point when creating a new carousel.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cards ({cards.length})
              </h2>
              <button
                type="button"
                onClick={handleAddCard}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Add Card
              </button>
            </div>

            {errors.cards && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                {errors.cards}
              </p>
            )}

            <CardsList
              cards={cards}
              activeCardIndex={editingCardIndex}
              onEdit={setEditingCardIndex}
              onDuplicate={handleDuplicateCard}
              onRemove={handleRemoveCard}
              onReorder={handleReorderCards}
            />
          </div>

          {editingCard && editingCardIndex !== null && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <CardEditor
                card={editingCard}
                index={editingCardIndex}
                buttonsGroupColumns={groupColumns}
                buttonsGroupRows={groupRows}
                errors={errors}
                openButtonIndex={focusButtonIndex}
                onUpdate={handleUpdateCard}
              />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Carousel Preview
            </h2>
            <CarouselPreview
              cards={cards}
              bgColor={bgColor}
              buttonsGroupColumns={groupColumns}
              buttonsGroupRows={groupRows}
              activeCardIndex={editingCardIndex}
              onCardClick={setEditingCardIndex}
            />
          </div>
        </div>
      </div>

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
          {submitLabel}
        </button>
      </div>
        </form>
      </div>

      <CarouselAiChat
        isOpen={showAiChat}
        mode={initialData ? "edit" : "create"}
        sourceCarousels={sourceCarousels}
        ctaDefaults={{
          ...resolveCtaColors(settings),
          Frame: resolveButtonFrame(settings),
        }}
        buttonDefaults={{
          ...resolveButtonColors(settings),
          Frame: resolveButtonFrame(settings),
        }}
        currentDraft={currentFormDraft}
        onApply={hydrateFormFromDraft}
        onClose={() => setShowAiChat(false)}
      />
    </div>
  );
};
