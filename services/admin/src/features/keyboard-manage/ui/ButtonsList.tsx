"use client";

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
import { type ButtonDTO } from "@/entities/keyboard";

type FormButton = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt"> & {
  tempId: string;
};

interface ButtonsListProps {
  buttons: FormButton[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface SortableButtonRowProps {
  button: FormButton;
  index: number;
  canReorder: boolean;
  onEdit: () => void;
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

const SortableButtonRow = ({
  button,
  index,
  canReorder,
  onEdit,
  onRemove,
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
      className={`flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${
        isDragging
          ? "z-10 opacity-60 shadow-lg ring-2 ring-blue-500"
          : ""
      }`}
    >
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
        <div className="min-w-0 flex-1">
          <span className="font-medium text-gray-900 dark:text-white">
            Button {index + 1}: {button.Text || "Untitled"}
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            ({button.Columns}×{button.Rows})
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
          onClick={onRemove}
          className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export const ButtonsList = ({
  buttons,
  onEdit,
  onRemove,
  onReorder,
}: ButtonsListProps) => {
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
    const fromIndex = buttons.findIndex((b) => b.tempId === active.id);
    const toIndex = buttons.findIndex((b) => b.tempId === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  if (buttons.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        No buttons added yet. Click &quot;Add New Keyboard Button&quot; to get
        started.
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
        items={buttons.map((b) => b.tempId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {buttons.map((button, index) => (
            <SortableButtonRow
              key={button.tempId}
              button={button}
              index={index}
              canReorder={canReorder}
              onEdit={() => onEdit(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
