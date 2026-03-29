"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Photo } from "@/types";

interface MasonryGridProps {
  photos: Photo[];
  columns?: number;
  onPhotoClick: (index: number) => void;
}

export default function MasonryGrid({ photos, columns, onPhotoClick }: MasonryGridProps) {
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const handleLoad = useCallback((id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  }, []);

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid" data-columns={columns || 4}>
      {photos.map((photo, index) => {
        const w = photo.dimensions?.width || 800;
        const h = photo.dimensions?.height || 600;
        return (
          <button
            key={photo.id}
            className={`masonry-item ${loadedIds.has(photo.id) ? "loaded" : ""}`}
            onClick={() => onPhotoClick(index)}
            aria-label={`View ${photo.title}`}
            style={{ aspectRatio: `${w} / ${h}` }}
          >
            <Image
              src={index < 8 ? photo.urls.medium : (photo.urls.small || photo.urls.medium)}
              width={w}
              height={h}
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              alt={photo.title}
              loading={index < 4 ? "eager" : "lazy"}
              priority={index < 4}
              className="masonry-img"
              style={{ width: "100%", height: "100%", objectFit: "cover", backgroundImage: `url(${photo.urls.thumb})`, backgroundSize: "cover" }}
              onLoad={() => handleLoad(photo.id)}
            />
            <div className="masonry-overlay">
              <span className="masonry-title">{photo.title}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
