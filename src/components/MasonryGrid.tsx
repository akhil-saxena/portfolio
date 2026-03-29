"use client";

import { useState, useCallback } from "react";
import { Photo } from "@/types";

interface MasonryGridProps {
  photos: Photo[];
  onPhotoClick: (index: number) => void;
}

export default function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const handleLoad = useCallback((id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  }, []);

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className={`masonry-item ${loadedIds.has(photo.id) ? "loaded" : ""}`}
          onClick={() => onPhotoClick(index)}
          aria-label={`View ${photo.title}`}
        >
          <img
            src={photo.urls.medium}
            srcSet={`${photo.urls.small} 400w, ${photo.urls.medium} 800w`}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            alt={photo.title}
            loading="lazy"
            className="masonry-img"
            style={{ backgroundImage: `url(${photo.urls.thumb})` }}
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
