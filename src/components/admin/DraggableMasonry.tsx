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
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const handleLoad = useCallback((id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    setDragId(photoId);
    e.dataTransfer.effectAllowed = "move";
    // Set transparent drag image — we show the ghost via CSS opacity
    const img = document.createElement("img");
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!dragId || targetId === dragId) return;

    const fromIndex = photos.findIndex((p) => p.id === dragId);
    const toIndex = photos.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered.map((p, i) => ({ ...p, order: i + 1 })));
  }, [dragId, photos, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className={`masonry-item ${loadedIds.has(photo.id) ? "loaded" : ""} ${selectedId === photo.id ? "admin-photo-selected" : ""} ${dragId === photo.id ? "admin-photo-dragging" : ""}`}
          draggable
          onDragStart={(e) => handleDragStart(e, photo.id)}
          onDragOver={(e) => handleDragOver(e, photo.id)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => { e.preventDefault(); handleDragEnd(); }}
          onClick={(e) => {
            e.stopPropagation();
            onPhotoClick(index);
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
