"use client";

/**
 * Sortable list of custom-card buttons (same dnd pattern as keyboard ButtonsList).
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
import type { ButtonDTO } from "@/entities/carousel";
import type { ReactNode } from "react";

export type FormButton = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
  tempId: string;
};

interface CarouselButtonsListProps {
  buttons: FormButton[];
  editingIndex: number | null;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderEditor: (index: number) => ReactNode;
}

interface SortableButtonRowProps {
  button: FormButton;
  index: number;
  canReorder: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  editor: ReactNode;
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

const SortableButtonRow = ({
  button,
  index,
  canReorder,
  isEditing,
  onEdit,
  onRemove,
  editor,
}: SortableButtonRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: button.tempId, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${
        isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          ref={setActivatorNodeRef}
          className={`flex min-w-0 flex-1 select-none items-center gap-2 rounded ${
            canReorder
              ? "cursor-grab touch-none active:cursor-grabbing"
              : "cursor-default"
          }`}
          {...(canReorder ? { ...attributes, ...listeners } : {})}
          aria-label={`Reorder button ${index + 1}`}
        >
          <span
            className="shrink-0 rounded p-1 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          >
            <GripIcon />
          </span>
          <span className="min-w-0 font-medium text-gray-900 dark:text-white">
            Button {index + 1}: {button.Text || "Untitled"}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({button.Columns}×{button.Rows})
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            {isEditing ? "Close" : "Edit"}
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
      {editor}
    </div>
  );
};

export const CarouselButtonsList = ({
  buttons,
  editingIndex,
  onEdit,
  onRemove,
  onReorder,
  renderEditor,
}: CarouselButtonsListProps) => {
  const canReorder = buttons.length >= 2;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = buttons.findIndex((button) => button.tempId === active.id);
    const toIndex = buttons.findIndex((button) => button.tempId === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={buttons.map((button) => button.tempId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {buttons.map((button, index) => (
            <SortableButtonRow
              key={button.tempId}
              button={button}
              index={index}
              canReorder={canReorder}
              isEditing={editingIndex === index}
              onEdit={() => onEdit(index)}
              onRemove={() => onRemove(index)}
              editor={
                editingIndex === index ? renderEditor(index) : null
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
