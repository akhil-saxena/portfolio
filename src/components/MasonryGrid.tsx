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
    <div className="masonry-grid" style={columns ? { columns } : undefined}>
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className={`masonry-item ${loadedIds.has(photo.id) ? "loaded" : ""}`}
          onClick={() => onPhotoClick(index)}
          aria-label={`View ${photo.title}`}
        >
          <Image
            src={index < 8 ? photo.urls.medium : (photo.urls.small || photo.urls.medium)}
            width={800}
            height={600}
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            alt={photo.title}
            loading={index < 4 ? "eager" : "lazy"}
            priority={index < 4}
            className="masonry-img"
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
