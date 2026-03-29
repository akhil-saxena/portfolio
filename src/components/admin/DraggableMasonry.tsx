"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Photo } from "@/types";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";

interface DraggableMasonryProps {
  photos: Photo[];
  selectedId?: string;
  columns?: number;
  onPhotoClick: (index: number) => void;
  onReorder: (photos: Photo[]) => void;
}

type DragState = "idle" | "dragging" | "over";

function DraggablePhoto({
  photo,
  index,
  isSelected,
  onClick,
  onDrop,
}: {
  photo: Photo;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDrop: (sourceId: string, targetId: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<DragState>("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ id: photo.id, index }),
        onDragStart: () => setState("dragging"),
        onDrop: () => setState("idle"),
      }),
      dropTargetForElements({
        element: el,
        getData: () => ({ id: photo.id, index }),
        canDrop: ({ source }) => source.data.id !== photo.id,
        onDragEnter: () => setState("over"),
        onDragLeave: () => setState("idle"),
        onDrop: ({ source }) => {
          setState("idle");
          onDrop(source.data.id as string, photo.id);
        },
      })
    );
  }, [photo.id, index, onDrop]);

  return (
    <button
      ref={ref}
      className={[
        "masonry-item",
        loaded ? "loaded" : "",
        isSelected ? "admin-photo-selected" : "",
        state === "dragging" ? "admin-photo-dragging" : "",
        state === "over" ? "admin-photo-drop-target" : "",
      ].filter(Boolean).join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
        onLoad={() => setLoaded(true)}
      />
      <div className="masonry-overlay">
        <span className="masonry-title">{photo.title}</span>
      </div>
    </button>
  );
}

export default function DraggableMasonry({
  photos,
  selectedId,
  columns = 4,
  onPhotoClick,
  onReorder,
}: DraggableMasonryProps) {
  const handleDrop = useCallback(
    (sourceId: string, targetId: string) => {
      const fromIndex = photos.findIndex((p) => p.id === sourceId);
      const toIndex = photos.findIndex((p) => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reordered = [...photos];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      onReorder(reordered.map((p, i) => ({ ...p, order: i + 1 })));
    },
    [photos, onReorder]
  );

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid" style={{ columns }}>
      {photos.map((photo, index) => (
        <DraggablePhoto
          key={photo.id}
          photo={photo}
          index={index}
          isSelected={selectedId === photo.id}
          onClick={() => onPhotoClick(index)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
