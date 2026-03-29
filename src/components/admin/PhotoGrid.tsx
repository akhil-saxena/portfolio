"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconEdit, IconDots } from "../icons";

interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  urls: { original?: string; medium: string; thumb: string };
  order: number;
  [key: string]: unknown;
}

interface PhotoGridProps {
  photos: Photo[];
  onReorder: (photos: Photo[]) => void;
  onEdit: (photo: Photo) => void;
  onDelete: (id: string) => void;
  categoryFilter: string;
}

function SortablePhotoCard({
  photo,
  onEdit,
  onDelete,
}: {
  photo: Photo;
  onEdit: () => void;
  onDelete: () => void;
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
    <div ref={setNodeRef} style={style} className="admin-photo-card" {...attributes} {...listeners}>
      <div className="admin-photo-thumb">
        <img
          src={photo.urls.medium}
          alt={photo.title}
          loading="lazy"
          style={{ backgroundImage: `url(${photo.urls.thumb})` }}
        />
        <div className="admin-photo-actions">
          <button className="admin-photo-action" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Edit">
            <IconEdit size={12} />
          </button>
          <button className="admin-photo-action" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete">
            <IconDots size={12} />
          </button>
        </div>
      </div>
      <div className="admin-photo-info">
        <p className="admin-photo-title">{photo.title}</p>
        <p className="admin-photo-category">{photo.category}</p>
      </div>
    </div>
  );
}

export default function PhotoGrid({ photos, onReorder, onEdit, onDelete, categoryFilter }: PhotoGridProps) {
  const filtered = categoryFilter === "All"
    ? photos
    : photos.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      order: i + 1,
    }));
    onReorder(reordered);
  };

  if (filtered.length === 0) {
    return <p className="admin-placeholder">No photos in this category.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filtered.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="admin-photo-grid">
          {filtered.map((photo) => (
            <SortablePhotoCard
              key={photo.id}
              photo={photo}
              onEdit={() => onEdit(photo)}
              onDelete={() => onDelete(photo.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
