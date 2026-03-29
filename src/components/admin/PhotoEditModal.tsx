"use client";

import { useState } from "react";

interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  exif?: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;
    shutter: string | null;
    iso: number | null;
    focalLength: string | null;
  };
}

interface PhotoEditModalProps {
  photo: Photo;
  onSave: (updated: {
    title: string;
    category: string;
    tags: string[];
    exif: {
      camera: string | null;
      lens: string | null;
      aperture: string | null;
      shutter: string | null;
      iso: number | null;
      focalLength: string | null;
    };
  }) => void;
  onClose: () => void;
}

const CATEGORIES = ["abstract", "architecture", "nature", "portraits", "street", "wildlife", "product"];

export default function PhotoEditModal({ photo, onSave, onClose }: PhotoEditModalProps) {
  const [title, setTitle] = useState(photo.title);
  const [category, setCategory] = useState(photo.category);
  const [tagsStr, setTagsStr] = useState(photo.tags.join(", "));
  const [showExif, setShowExif] = useState(false);
  const [exif, setExif] = useState({
    camera: photo.exif?.camera || "",
    lens: photo.exif?.lens || "",
    aperture: photo.exif?.aperture || "",
    shutter: photo.exif?.shutter || "",
    iso: photo.exif?.iso?.toString() || "",
    focalLength: photo.exif?.focalLength || "",
  });

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="admin-modal-title">Edit Photo</h3>
        <label className="admin-field">
          <span className="admin-field-label">Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" />
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="admin-input">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Tags</span>
          <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="admin-input" placeholder="comma-separated" />
        </label>
        <button
          type="button"
          className="admin-add-pill"
          onClick={() => setShowExif(!showExif)}
          style={{ marginBottom: "8px" }}
        >
          {showExif ? "Hide" : "Edit"} EXIF Data
        </button>

        {showExif && (
          <div className="admin-exif-grid">
            <label className="admin-field">
              <span className="admin-field-label">Camera</span>
              <input type="text" value={exif.camera} onChange={(e) => setExif({ ...exif, camera: e.target.value })} className="admin-input" placeholder="e.g. Sony A7III" />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Lens</span>
              <input type="text" value={exif.lens} onChange={(e) => setExif({ ...exif, lens: e.target.value })} className="admin-input" placeholder="e.g. 24-70mm f/2.8" />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Aperture</span>
              <input type="text" value={exif.aperture} onChange={(e) => setExif({ ...exif, aperture: e.target.value })} className="admin-input" placeholder="e.g. f/8" />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Shutter Speed</span>
              <input type="text" value={exif.shutter} onChange={(e) => setExif({ ...exif, shutter: e.target.value })} className="admin-input" placeholder="e.g. 1/250" />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">ISO</span>
              <input type="text" value={exif.iso} onChange={(e) => setExif({ ...exif, iso: e.target.value })} className="admin-input" placeholder="e.g. 100" />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Focal Length</span>
              <input type="text" value={exif.focalLength} onChange={(e) => setExif({ ...exif, focalLength: e.target.value })} className="admin-input" placeholder="e.g. 35mm" />
            </label>
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => onSave({
              title,
              category,
              tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
              exif: {
                camera: exif.camera || null,
                lens: exif.lens || null,
                aperture: exif.aperture || null,
                shutter: exif.shutter || null,
                iso: exif.iso ? Number(exif.iso) : null,
                focalLength: exif.focalLength || null,
              },
            })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
