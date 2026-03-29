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

function DraggablePhoto({
  photo,
  isDragSource,
  isDropTarget,
  isSelected,
  onClick,
  onEnter,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  photo: Photo;
  isDragSource: boolean;
  isDropTarget: boolean;
  isSelected: boolean;
  onClick: () => void;
  onEnter: () => void;
  onDrop: (sourceId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ id: photo.id }),
        onDragStart: () => onDragStart(photo.id),
        onDrop: () => onDragEnd(),
      }),
      dropTargetForElements({
        element: el,
        getData: () => ({ id: photo.id }),
        canDrop: ({ source }) => source.data.id !== photo.id,
        onDragEnter: () => onEnter(),
        onDrop: ({ source }) => onDrop(source.data.id as string),
      })
    );
  }, [photo.id, onEnter, onDrop, onDragStart, onDragEnd]);

  return (
    <button
      ref={ref}
      className={[
        "masonry-item",
        loaded ? "loaded" : "",
        isSelected ? "admin-photo-selected" : "",
        isDragSource ? "admin-photo-dragging" : "",
        isDropTarget ? "admin-photo-drop-target" : "",
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
  const [dropId, setDropId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
    setDropId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropId(null);
  }, []);

  const handleDrop = useCallback(
    (sourceId: string, targetId: string) => {
      const fromIndex = photos.findIndex((p) => p.id === sourceId);
      const toIndex = photos.findIndex((p) => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reordered = [...photos];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      onReorder(reordered.map((p, i) => ({ ...p, order: i + 1 })));

      setDragId(null);
      setDropId(null);
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
          isDragSource={dragId === photo.id}
          isDropTarget={dropId === photo.id}
          isSelected={selectedId === photo.id}
          onClick={() => onPhotoClick(index)}
          onEnter={() => setDropId(photo.id)}
          onDrop={(sourceId) => handleDrop(sourceId, photo.id)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
