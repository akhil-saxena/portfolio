"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
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
  isSelected,
  onClick,
}: {
  photo: Photo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-draggable-photo admin-editable ${isSelected ? "selected" : ""}`}
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
        loading="lazy"
        style={{ backgroundImage: `url(${photo.urls.thumb})` }}
      />
      <div className="admin-draggable-photo-overlay">
        <span className="admin-draggable-photo-title">{photo.title}</span>
        <span className="admin-draggable-photo-cat">{photo.category}</span>
      </div>
    </div>
  );
}

function DragOverlayItem({ photo }: { photo: Photo }) {
  return (
    <div className="admin-draggable-photo admin-drag-overlay-item">
      <img
        src={photo.urls.medium}
        alt={photo.title}
        style={{ backgroundImage: `url(${photo.urls.thumb})` }}
      />
      <div className="admin-draggable-photo-overlay" style={{ opacity: 1 }}>
        <span className="admin-draggable-photo-title">{photo.title}</span>
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
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

  const activePhoto = activeId ? photos.find((p) => p.id === activeId) : null;

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="admin-photo-sortable-grid">
          {photos.map((photo, index) => (
            <SortableMasonryItem
              key={photo.id}
              photo={photo}
              isSelected={selectedId === photo.id}
              onClick={() => onPhotoClick(index)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activePhoto ? <DragOverlayItem photo={activePhoto} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
