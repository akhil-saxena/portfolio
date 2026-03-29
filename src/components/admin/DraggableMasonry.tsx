"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
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
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const handleLoad = useCallback((id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    setDragId(photoId);
    e.dataTransfer.effectAllowed = "move";

    // Use the dragged element as the drag image
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    e.dataTransfer.setDragImage(el, rect.width / 2, rect.height / 2);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragId && targetId !== dragId) {
      setDropTargetId(targetId);
    }
  }, [dragId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, targetId: string) => {
    // Only clear if leaving the actual target (not a child)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dropTargetId === targetId) {
        setDropTargetId(null);
      }
    }
  }, [dropTargetId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    if (dragId && dropTargetId && dragId !== dropTargetId) {
      const fromIndex = photos.findIndex((p) => p.id === dragId);
      const toIndex = photos.findIndex((p) => p.id === dropTargetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        const reordered = [...photos];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        onReorder(reordered.map((p, i) => ({ ...p, order: i + 1 })));
      }
    }

    setDragId(null);
    setDropTargetId(null);
  }, [dragId, dropTargetId, photos, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid" onDragOver={handleDragOver}>
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className={[
            "masonry-item",
            loadedIds.has(photo.id) ? "loaded" : "",
            selectedId === photo.id ? "admin-photo-selected" : "",
            dragId === photo.id ? "admin-photo-dragging" : "",
            dropTargetId === photo.id ? "admin-photo-drop-target" : "",
          ].filter(Boolean).join(" ")}
          draggable
          onDragStart={(e) => handleDragStart(e, photo.id)}
          onDragEnter={(e) => handleDragEnter(e, photo.id)}
          onDragLeave={(e) => handleDragLeave(e, photo.id)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            e.stopPropagation();
            if (!dragId) onPhotoClick(index);
          }}
          aria-label={`${photo.title} — drag to reorder`}
        >
          <Image
            src={photo.urls.medium}
            width={800}
            height={600}
            alt={photo.title}
            loading="lazy"
            className="masonry-img"
            draggable={false}
            style={{ width: "100%", height: "auto", backgroundImage: `url(${photo.urls.thumb})` }}
            onLoad={() => handleLoad(photo.id)}
          />
          <div className="masonry-overlay">
            <span className="masonry-title">{photo.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
