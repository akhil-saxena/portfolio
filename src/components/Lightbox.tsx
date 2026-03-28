"use client";

import { useEffect, useCallback, useState, useRef } from "react";

interface ExifData {
  camera: string | null;
  lens: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
  focalLength: string | null;
}

interface Photo {
  id: string;
  title: string;
  urls: { original: string; medium: string; thumb: string };
  exif?: ExifData;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex];
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  // Reset loaded state on navigation
  useEffect(() => {
    setLoaded(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const focusableEls = el.querySelectorAll<HTMLElement>("button");
    focusableEls[0]?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  // Fire analytics event via CF Pages Function proxy
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: photo.id }),
    }).catch(() => {}); // fail silently
  }, [photo.id]);

  const hasExif = photo.exif && Object.values(photo.exif).some((v) => v !== null);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-label={`Photo: ${photo.title}`}
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close lightbox">
        ×
      </button>

      <button className="lightbox-nav lightbox-prev" onClick={goPrev} aria-label="Previous photo">
        ‹
      </button>

      <div className="lightbox-content">
        {!loaded && (
          <img
            src={photo.urls.thumb}
            alt=""
            className="lightbox-placeholder"
            aria-hidden="true"
          />
        )}
        <img
          src={photo.urls.original}
          alt={photo.title}
          className={`lightbox-img ${loaded ? "loaded" : ""}`}
          onLoad={() => setLoaded(true)}
        />

        <div className="lightbox-info">
          <h2 className="lightbox-title">{photo.title}</h2>

          {hasExif && (
            <div className="lightbox-exif">
              {photo.exif!.camera && <span>{photo.exif!.camera}</span>}
              {photo.exif!.lens && <span>{photo.exif!.lens}</span>}
              {photo.exif!.aperture && <span>{photo.exif!.aperture}</span>}
              {photo.exif!.shutter && <span>{photo.exif!.shutter}</span>}
              {photo.exif!.iso && <span>ISO {photo.exif!.iso}</span>}
              {photo.exif!.focalLength && <span>{photo.exif!.focalLength}</span>}
            </div>
          )}
        </div>
      </div>

      <button className="lightbox-nav lightbox-next" onClick={goNext} aria-label="Next photo">
        ›
      </button>
    </div>
  );
}
