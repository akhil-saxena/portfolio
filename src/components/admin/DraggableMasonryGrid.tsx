"use client";

import { useState, useCallback, useRef } from "react";
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
    height: isDragging ? 0 : undefined,
    overflow: isDragging ? "hidden" as const : undefined,
    margin: isDragging ? 0 : undefined,
    padding: isDragging ? 0 : undefined,
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

function DragOverlayItem({ photo, width }: { photo: Photo; width: number }) {
  return (
    <div
      className="masonry-item loaded"
      style={{
        width,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        cursor: "grabbing",
      }}
    >
      <img
        src={photo.urls.medium}
        alt={photo.title}
        className="masonry-img"
        style={{ width: "100%", height: "auto" }}
      />
      <div className="masonry-overlay" style={{ opacity: 1 }}>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState(200);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    // Measure the actual width of the dragged element
    if (gridRef.current) {
      const el = gridRef.current.querySelector(`[data-photo-id="${id}"]`) as HTMLElement;
      if (el) {
        setActiveWidth(el.getBoundingClientRect().width);
      }
    }
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
      <SortableContext items={photos.map((p) => p.id)}>
        <div className="masonry-grid" ref={gridRef}>
          {photos.map((photo, index) => (
            <div key={photo.id} data-photo-id={photo.id}>
              <SortableMasonryItem
                photo={photo}
                isSelected={selectedId === photo.id}
                onClick={() => onPhotoClick(index)}
              />
            </div>
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activePhoto ? <DragOverlayItem photo={activePhoto} width={activeWidth} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
