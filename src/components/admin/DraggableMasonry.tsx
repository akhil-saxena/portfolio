"use client";

import { useState, useRef, useCallback } from "react";
import { Photo } from "@/types";

interface DraggableMasonryProps {
  photos: Photo[];
  selectedId?: string;
  onPhotoClick: (index: number) => void;
  onReorder: (photos: Photo[]) => void;
}

export default function DraggableMasonry({
  photos,
  selectedId,
  onPhotoClick,
  onReorder,
}: DraggableMasonryProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragImageRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, photo: Photo) => {
    setDragId(photo.id);
    e.dataTransfer.effectAllowed = "move";

    // Create custom drag image from the element
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    // Use a clone as drag image to preserve size
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.borderRadius = "8px";
    clone.style.overflow = "hidden";
    clone.style.boxShadow = "0 12px 32px rgba(0,0,0,0.25)";
    clone.style.opacity = "0.95";
    document.body.appendChild(clone);

    e.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2);

    // Clean up clone after drag starts
    requestAnimationFrame(() => {
      document.body.removeChild(clone);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (dragId && targetId !== dragId && targetId !== overId) {
      setOverId(targetId);

      // Live reorder: swap positions as you hover
      const fromIndex = photos.findIndex((p) => p.id === dragId);
      const toIndex = photos.findIndex((p) => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = [...photos];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      // Update order numbers
      const withOrder = reordered.map((p, i) => ({ ...p, order: i + 1 }));
      onReorder(withOrder);
    }
  }, [dragId, overId, photos, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragId(null);
    setOverId(null);
  }, []);

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className={`masonry-item loaded admin-editable ${selectedId === photo.id ? "selected" : ""} ${dragId === photo.id ? "admin-dragging" : ""}`}
          draggable
          onDragStart={(e) => handleDragStart(e, photo)}
          onDragOver={(e) => handleDragOver(e, photo.id)}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onClick={(e) => {
            e.stopPropagation();
            onPhotoClick(index);
          }}
        >
          <span className="admin-edit-badge">✎</span>
          <img
            src={photo.urls.medium}
            alt={photo.title}
            className="masonry-img"
            loading="lazy"
            draggable={false}
            style={{
              backgroundImage: `url(${photo.urls.thumb})`,
              width: "100%",
              height: "auto",
            }}
          />
          <div className="masonry-overlay">
            <span className="masonry-title">{photo.title}</span>
          </div>
        </div>
      ))}
      <div ref={dragImageRef} style={{ position: "fixed", top: -9999, left: -9999 }} />
    </div>
  );
}
