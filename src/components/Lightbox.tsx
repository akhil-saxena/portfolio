"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import { Photo } from "@/types";

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

  const [swipeOffset, setSwipeOffset] = useState(0);

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => setSwipeOffset(e.deltaX * 0.3),
    onSwipedLeft: () => { setSwipeOffset(0); goNext(); },
    onSwipedRight: () => { setSwipeOffset(0); goPrev(); },
    onTouchEndOrOnMouseUp: () => setSwipeOffset(0),
    delta: 50,
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  // Reset loaded state on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {...swipeHandlers}
      className="lightbox"
      role="dialog"
      aria-modal="true"
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

      <div className="lightbox-content" style={{ transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined, transition: swipeOffset ? 'none' : 'transform 0.2s ease' }}>
        {!loaded && (
          <Image
            src={photo.urls.thumb}
            alt=""
            width={2000}
            height={1333}
            className="lightbox-placeholder"
            aria-hidden="true"
          />
        )}
        <Image
          src={photo.urls.original}
          sizes="90vw"
          alt={photo.title}
          width={2000}
          height={1333}
          className={`lightbox-img ${loaded ? "loaded" : ""}`}
          style={{ maxWidth: "90vw", maxHeight: "75vh", width: "auto", height: "auto" }}
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
