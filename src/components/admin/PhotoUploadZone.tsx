"use client";

import { useState, useCallback } from "react";
import { IconPlus } from "../icons";

interface PhotoUploadZoneProps {
  onUpload: (file: File, metadata: { title: string; category: string; tags: string }) => void;
  isUploading: boolean;
}

const CATEGORIES = ["abstract", "architecture", "nature", "portraits", "street", "wildlife", "product"];

export default function PhotoUploadZone({ onUpload, isUploading }: PhotoUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Pre-fill title from filename
    const name = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    setTitle(name.charAt(0).toUpperCase() + name.slice(1));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  const handleSubmit = () => {
    if (!file || !title || !category) return;
    onUpload(file, { title, category, tags });
    // Reset form
    setFile(null);
    setPreview(null);
    setTitle("");
    setTags("");
  };

  return (
    <div className="admin-upload">
      {!file ? (
        <div
          className={`admin-upload-zone ${isDragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("admin-file-input")?.click()}
        >
          <IconPlus size={24} />
          <p>Drop an image here or click to browse</p>
          <input
            id="admin-file-input"
            type="file"
            accept="image/jpeg,image/png,image/tiff,image/webp"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            hidden
          />
        </div>
      ) : (
        <div className="admin-upload-form">
          <div className="admin-upload-preview">
            <img src={preview!} alt="Preview" />
          </div>
          <div className="admin-upload-fields">
            <label className="admin-field">
              <span className="admin-field-label">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="admin-input"
              />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="admin-input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Tags (comma-separated)</span>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="admin-input"
                placeholder="landscape, sunset, ..."
              />
            </label>
            <div className="admin-upload-actions">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSubmit}
                disabled={isUploading || !title}
              >
                {isUploading ? "Uploading..." : "Upload & Process"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
