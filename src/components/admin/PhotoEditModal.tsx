"use client";

import { useState } from "react";

interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

interface PhotoEditModalProps {
  photo: Photo;
  onSave: (updated: { title: string; category: string; tags: string[] }) => void;
  onClose: () => void;
}

const CATEGORIES = ["abstract", "architecture", "nature", "portraits", "street", "wildlife", "product"];

export default function PhotoEditModal({ photo, onSave, onClose }: PhotoEditModalProps) {
  const [title, setTitle] = useState(photo.title);
  const [category, setCategory] = useState(photo.category);
  const [tagsStr, setTagsStr] = useState(photo.tags.join(", "));

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
        <div className="admin-modal-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => onSave({
              title,
              category,
              tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
            })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
