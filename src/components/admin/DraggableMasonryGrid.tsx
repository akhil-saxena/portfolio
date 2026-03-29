"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Photo } from "@/types";

interface DraggableMasonryGridProps {
  photos: Photo[];
  selectedId?: string;
  onPhotoClick: (index: number) => void;
  onReorder: (reordered: Photo[]) => void;
}

function SortableMasonryItem({
  photo,
  index,
  isSelected,
  onClick,
}: {
  photo: Photo;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`masonry-item loaded admin-editable ${isSelected ? "selected" : ""}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="admin-edit-badge">✎</span>
      <img
        src={photo.urls.medium}
        alt={photo.title}
        className="masonry-img"
        loading="lazy"
        style={{ backgroundImage: `url(${photo.urls.thumb})`, width: "100%", height: "auto" }}
      />
      <div className="masonry-overlay">
        <span className="masonry-title">{photo.title}</span>
      </div>
    </div>
  );
}

export default function DraggableMasonryGrid({
  photos,
  selectedId,
  onPhotoClick,
  onReorder,
}: DraggableMasonryGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
        ...p,
        order: i + 1,
      }));
      onReorder(reordered);
    },
    [photos, onReorder]
  );

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map((p) => p.id)}>
        <div className="masonry-grid">
          {photos.map((photo, index) => (
            <SortableMasonryItem
              key={photo.id}
              photo={photo}
              index={index}
              isSelected={selectedId === photo.id}
              onClick={() => onPhotoClick(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
