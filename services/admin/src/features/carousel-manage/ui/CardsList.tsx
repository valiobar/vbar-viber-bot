"use client";

/**
 * CardsList
 *
 * Vertical sortable list of carousel cards with edit / duplicate / remove.
 */

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CarouselCardDTO } from "@/entities/carousel";

export type EditableCard = CarouselCardDTO & { tempId: string };

interface CardsListProps {
  cards: EditableCard[];
  activeCardIndex?: number | null;
  onEdit: (index: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface SortableCardRowProps {
  card: EditableCard;
  index: number;
  isActive: boolean;
  canReorder: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const GripIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="5" cy="3" r="1.25" />
    <circle cx="11" cy="3" r="1.25" />
    <circle cx="5" cy="8" r="1.25" />
    <circle cx="11" cy="8" r="1.25" />
    <circle cx="5" cy="13" r="1.25" />
    <circle cx="11" cy="13" r="1.25" />
  </svg>
);

const cardSummary = (card: EditableCard): string => {
  if (card.mode === "custom") {
    const count = card.Buttons.length;
    return `${count} button${count === 1 ? "" : "s"}`;
  }
  const title = card.title.trim() || "Untitled";
  const ctaCount = card.ctaButtons.length;
  if (ctaCount === 0) return title;
  const ctaLabel = ctaCount === 1 ? "1 CTA" : `${ctaCount} CTAs`;
  return `${title} · ${ctaLabel}`;
};

const SortableCardRow = ({
  card,
  index,
  isActive,
  canReorder,
  onEdit,
  onDuplicate,
  onRemove,
}: SortableCardRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.tempId, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center justify-between rounded-lg border p-3 ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700"
      } ${isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-blue-500" : ""}`}
      data-testid={`cards-list-row-${index}`}
    >
      <div
        ref={setActivatorNodeRef}
        className={`flex min-w-0 flex-1 select-none items-center gap-2 rounded ${
          canReorder
            ? "cursor-grab touch-none active:cursor-grabbing"
            : "cursor-default"
        }`}
        {...(canReorder ? { ...attributes, ...listeners } : {})}
        aria-label={`Reorder card ${index + 1}`}
      >
        <span
          className="shrink-0 rounded p-1 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        >
          <GripIcon />
        </span>
        {card.image && (
          <span
            className="h-8 w-8 shrink-0 rounded bg-cover bg-center"
            style={{ backgroundImage: `url(${card.image})` }}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="font-medium text-gray-900 dark:text-white">
            #{index + 1} — {card.mode === "structured" ? "structured" : "custom"}
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {cardSummary(card)}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export const CardsList = ({
  cards,
  activeCardIndex,
  onEdit,
  onDuplicate,
  onRemove,
  onReorder,
}: CardsListProps) => {
  const canReorder = cards.length >= 2;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = cards.findIndex((card) => card.tempId === active.id);
    const toIndex = cards.findIndex((card) => card.tempId === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  if (cards.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        No cards added yet. Click &quot;Add Card&quot; to get started.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cards.map((card) => card.tempId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2" data-testid="cards-list">
          {cards.map((card, index) => (
            <SortableCardRow
              key={card.tempId}
              card={card}
              index={index}
              isActive={index === activeCardIndex}
              canReorder={canReorder}
              onEdit={() => onEdit(index)}
              onDuplicate={() => onDuplicate(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
