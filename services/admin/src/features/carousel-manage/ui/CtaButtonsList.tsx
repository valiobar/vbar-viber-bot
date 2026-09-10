"use client";

/**
 * Sortable list of structured-card CTA buttons.
 */

import type { ReactNode } from "react";
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
import type { CarouselCtaDTO } from "@/entities/carousel";

export type EditableCta = CarouselCtaDTO & { tempId: string };

interface CtaButtonsListProps {
  ctas: EditableCta[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderCta: (
    cta: EditableCta,
    index: number,
    dragHandle: ReactNode
  ) => ReactNode;
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

const SortableCtaRow = ({
  cta,
  index,
  canReorder,
  renderCta,
}: {
  cta: EditableCta;
  index: number;
  canReorder: boolean;
  renderCta: CtaButtonsListProps["renderCta"];
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cta.tempId, disabled: !canReorder });

  const dragHandle = (
    <span
      ref={setActivatorNodeRef}
      className={`shrink-0 rounded p-1 text-gray-400 dark:text-gray-500 ${
        canReorder
          ? "cursor-grab touch-none active:cursor-grabbing"
          : "cursor-default"
      }`}
      {...(canReorder ? { ...attributes, ...listeners } : {})}
      aria-label={`Reorder CTA ${index + 1}`}
    >
      <GripIcon />
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-blue-500" : ""}
    >
      {renderCta(cta, index, dragHandle)}
    </div>
  );
};

export const CtaButtonsList = ({
  ctas,
  onReorder,
  renderCta,
}: CtaButtonsListProps) => {
  const canReorder = ctas.length >= 2;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = ctas.findIndex((item) => item.tempId === active.id);
    const toIndex = ctas.findIndex((item) => item.tempId === over.id);
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
        items={ctas.map((cta) => cta.tempId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {ctas.map((cta, index) => (
            <SortableCtaRow
              key={cta.tempId}
              cta={cta}
              index={index}
              canReorder={canReorder}
              renderCta={renderCta}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
