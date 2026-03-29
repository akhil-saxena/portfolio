"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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

type ItemState = "idle" | "dragging" | "over";

function DraggablePhoto({
  photo,
  isSelected,
  isPlaceholder,
  onClick,
  onHover,
  onDrop,
}: {
  photo: Photo;
  isSelected: boolean;
  isPlaceholder: boolean;
  onClick: () => void;
  onHover: (targetId: string) => void;
  onDrop: (sourceId: string, targetId: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<ItemState>("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ id: photo.id }),
        onDragStart: () => setState("dragging"),
        onDrop: () => setState("idle"),
      }),
      dropTargetForElements({
        element: el,
        getData: () => ({ id: photo.id }),
        canDrop: ({ source }) => source.data.id !== photo.id,
        onDragEnter: () => {
          setState("over");
          onHover(photo.id);
        },
        onDragLeave: () => setState("idle"),
        onDrop: ({ source }) => {
          setState("idle");
          onDrop(source.data.id as string, photo.id);
        },
      })
    );
  }, [photo.id, onHover, onDrop]);

  if (isPlaceholder) {
    return (
      <div className="masonry-item admin-photo-placeholder" ref={ref as unknown as React.RefObject<HTMLDivElement>}>
        <div style={{
          width: "100%",
          aspectRatio: "4/3",
          border: "2px dashed var(--ink-muted)",
          borderRadius: "8px",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-faint)",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
        }}>
          Drop here
        </div>
      </div>
    );
  }

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Compute the preview order: remove dragged item, insert placeholder at hover position
  const previewPhotos = useMemo(() => {
    if (!dragId || !hoverId || dragId === hoverId) return photos;

    const dragPhoto = photos.find((p) => p.id === dragId);
    if (!dragPhoto) return photos;

    // Remove dragged photo
    const without = photos.filter((p) => p.id !== dragId);
    // Find hover index in the remaining array
    const hoverIndex = without.findIndex((p) => p.id === hoverId);
    if (hoverIndex === -1) return photos;

    // Insert at hover position
    const result = [...without];
    result.splice(hoverIndex, 0, dragPhoto);
    return result;
  }, [photos, dragId, hoverId]);

  const handleHover = useCallback((targetId: string) => {
    setHoverId(targetId);
  }, []);

  const handleDrop = useCallback(
    (sourceId: string, targetId: string) => {
      // Use the preview order as the final order
      if (!dragId) return;
      const dragPhoto = photos.find((p) => p.id === sourceId);
      if (!dragPhoto) return;

      const without = photos.filter((p) => p.id !== sourceId);
      const targetIndex = without.findIndex((p) => p.id === targetId);
      if (targetIndex === -1) return;

      const result = [...without];
      result.splice(targetIndex, 0, dragPhoto);
      onReorder(result.map((p, i) => ({ ...p, order: i + 1 })));

      setDragId(null);
      setHoverId(null);
    },
    [photos, dragId, onReorder]
  );

  // Track drag start/end globally
  useEffect(() => {
    const handleDragStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.source?.data?.id) {
        setDragId(detail.source.data.id);
      }
    };

    // Use a MutationObserver-like approach: check for dragging class
    const interval = setInterval(() => {
      const dragging = document.querySelector(".admin-photo-dragging");
      if (!dragging && dragId) {
        setDragId(null);
        setHoverId(null);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [dragId]);

  // Detect drag start from child component state changes
  useEffect(() => {
    const el = document.querySelector(".admin-photo-dragging");
    if (el) {
      const id = photos.find((_, i) => {
        const items = document.querySelectorAll(".masonry-item");
        return items[i] === el;
      })?.id;
      if (id && id !== dragId) setDragId(id);
    }
  });

  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid" style={{ columns }}>
      {previewPhotos.map((photo, index) => (
        <DraggablePhoto
          key={photo.id}
          photo={photo}
          isSelected={selectedId === photo.id}
          isPlaceholder={dragId === photo.id}
          onClick={() => {
            const realIndex = photos.findIndex((p) => p.id === photo.id);
            if (realIndex !== -1) onPhotoClick(realIndex);
          }}
          onHover={handleHover}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
