"use client";

import { useState } from "react";
import { IconPlus } from "../icons";
import PhotoUploadZone from "./PhotoUploadZone";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PortfolioPhoto {
  id: string;
  title: string;
  category: string;
  tags: string[];
  order: number;
  urls: { original?: string; medium: string; thumb: string };
  exif?: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;
    shutter: string | null;
    iso: number | null;
    focalLength: string | null;
  };
  [key: string]: unknown;
}

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  period: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isPresent: boolean;
  location: string;
  logo: string | null;
  url: string | null;
  bullets: string[];
}

interface ProjectEntry {
  id: string;
  title: string;
  label: string | { text: string; icon: string };
  description: string;
  tech: string[];
  icon?: string | null;
  badges: { label: string; href: string; icon: string }[];
  href: string;
  [key: string]: unknown;
}

interface SkillGroup {
  category: string;
  icon?: string;
  items: string[];
  [key: string]: unknown;
}

interface EducationEntry {
  id: string;
  school: string;
  logo: string | null;
  degree: string;
  cgpa: string;
  period: string;
  url: string | null;
  leadership: string[];
}

interface SocialLink {
  icon: string;
  url: string;
  label: string;
}

export type Selection =
  | { type: "none"; tab: "home" | "photography" | "dev" }
  | { type: "photo"; photo: PortfolioPhoto }
  | { type: "role"; entry: ExperienceEntry; entryIndex: number }
  | { type: "project"; project: ProjectEntry; projectIndex: number }
  | { type: "skillGroup"; group: SkillGroup; groupIndex: number }
  | { type: "education"; entry: EducationEntry; entryIndex: number }
  | { type: "homeTitle" }
  | { type: "homeSubtitle" }
  | { type: "homeIntro" }
  | { type: "homeGallery"; photoIndex: number }
  | { type: "homeSocial" }
  | { type: "homeCta"; ctaIndex: number }
  | { type: "resume" };

interface PropertiesPanelProps {
  selection: Selection;
  onUpdatePhoto: (id: string, updates: Partial<PortfolioPhoto>) => void;
  onDeletePhoto: (id: string) => void;
  onUpdateExperience: (index: number, updates: ExperienceEntry) => void;
  onDeleteExperience: (index: number) => void;
  onUpdateProject: (index: number, updates: ProjectEntry) => void;
  onDeleteProject: (index: number) => void;
  onUpdateSkillGroup: (index: number, updates: SkillGroup) => void;
  onDeleteSkillGroup: (index: number) => void;
  onUpdateEducation: (index: number, updates: EducationEntry) => void;
  onPhotoUpload: (file: File, metadata: { title: string; category: string; tags: string }) => void;
  isUploading: boolean;
  onAddRole: () => void;
  onAddProject: () => void;
  onAddSkillGroup: () => void;
  onDeselect: () => void;
  onMovePhotoUp?: (id: string) => void;
  onMovePhotoDown?: (id: string) => void;
  homeData?: { title: string; subtitle: string; intro: string; peekIds: string[]; socialLinks: SocialLink[] };
  onUpdateHome?: (field: string, value: string) => void;
  onUpdateHomePeekId?: (index: number, newId: string) => void;
  onUpdateSocialLinks?: (links: SocialLink[]) => void;
  homeCtas?: { text: string; link: string; style: "primary" | "secondary" }[];
  onUpdateHomeCta?: (index: number, updates: { text?: string; link?: string; style?: "primary" | "secondary" }) => void;
  availablePhotos?: { id: string; title: string; url: string; category?: string }[];
  onRemoveHomePeekId?: (index: number) => void;
  onAddHomePeekId?: (id: string) => void;
  homePeekPositions?: Record<string, string>;
  onUpdateHomePeekPosition?: (id: string, position: string) => void;
}

const CATEGORIES = ["abstract", "architecture", "nature", "portraits", "street", "wildlife", "product"];

const STORE_ICONS = [
  { id: "github", label: "GitHub" },
  { id: "play-store", label: "Play Store" },
  { id: "chrome-store", label: "Chrome Store" },
  { id: "apple", label: "App Store" },
  { id: "windows", label: "Windows Store" },
];

const SOCIAL_ICONS = [
  { id: "github", label: "GitHub" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "mail", label: "Email" },
  { id: "twitter", label: "Twitter/X" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "dribbble", label: "Dribbble" },
  { id: "behance", label: "Behance" },
];

function SortableBullet({ id, bullet, onEdit, onDelete }: {
  id: string;
  bullet: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="admin-bullet" {...attributes}>
      <span className="admin-bullet-handle" {...listeners}>⠿</span>
      <span className="admin-bullet-text" dangerouslySetInnerHTML={{ __html: bullet }} />
      <div className="admin-bullet-actions">
        <button className="admin-bullet-btn" onClick={onEdit}>✎</button>
        <button className="admin-bullet-btn admin-bullet-delete" onClick={onDelete}>×</button>
      </div>
    </div>
  );
}

function CategorizedPhotoPicker({ photos, excludeIds, onSelect, galleryIds }: {
  photos: { id: string; title: string; url: string; category?: string }[];
  excludeIds: string[];
  onSelect: (id: string) => void;
  galleryIds?: string[];
}) {
  const filtered = photos.filter(p => !excludeIds.includes(p.id));
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(p => {
    const cat = (p.category || "other").charAt(0).toUpperCase() + (p.category || "other").slice(1);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  return (
    <div className="admin-categorized-picker">
      {Object.entries(grouped).map(([category, items]) => (
        <details key={category} open>
          <summary className="admin-picker-category">{category} ({items.length})</summary>
          <div className="admin-photo-picker-grid">
            {items.map((p) => {
              const isInGallery = galleryIds?.includes(p.id) ?? false;
              return (
                <button
                  key={p.id}
                  className={`admin-photo-picker-item ${isInGallery ? "in-gallery" : ""}`}
                  onClick={() => onSelect(p.id)}
                  title={p.title}
                  disabled={isInGallery}
                >
                  <img src={p.url} alt={p.title} />
                  {isInGallery && <span className="admin-picker-check">{"\u2713"}</span>}
                </button>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function PropertiesPanel({
  selection,
  onUpdatePhoto,
  onDeletePhoto,
  onUpdateExperience,
  onDeleteExperience,
  onUpdateProject,
  onDeleteProject,
  onUpdateSkillGroup,
  onDeleteSkillGroup,
  onUpdateEducation,
  onPhotoUpload,
  isUploading,
  onAddRole,
  onAddProject,
  onAddSkillGroup,
  onDeselect,
  onMovePhotoUp,
  onMovePhotoDown,
  homeData,
  onUpdateHome,
  onUpdateHomePeekId,
  onUpdateSocialLinks,
  homeCtas,
  onUpdateHomeCta,
  availablePhotos,
  onRemoveHomePeekId,
  onAddHomePeekId,
  homePeekPositions,
  onUpdateHomePeekPosition,
}: PropertiesPanelProps) {
  const [showExif, setShowExif] = useState(false);
  const bulletSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Nothing selected — show page actions
  if (selection.type === "none") {
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Actions</h3>
        </div>
        <div className="admin-props-body">
          {selection.tab === "photography" && (
            <>
              <p className="admin-props-hint">Click a photo to edit it. Drag to reorder.</p>
              <div className="admin-props-section">
                <h4 className="admin-props-section-title">Upload Photo</h4>
                <PhotoUploadZone onUpload={onPhotoUpload} isUploading={isUploading} />
              </div>
            </>
          )}
          {selection.tab === "dev" && (
            <>
              <p className="admin-props-hint">Click any section on the page to edit it.</p>

              <div className="admin-props-section">
                <h4 className="admin-props-section-title">Resume PDF</h4>
                <p className="admin-props-hint" style={{ marginBottom: "8px" }}>
                  Current: <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)" }}>resume.pdf</a>
                </p>
                <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", textAlign: "center" }}>
                  Upload New Resume
                  <input type="file" accept=".pdf" hidden onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // For now, just show a message — actual upload would need an API endpoint
                      alert("Resume upload: In a full implementation, this would upload to /public/resume.pdf via the deploy API. For now, replace the file manually in the repo.");
                    }
                  }} />
                </label>
              </div>

              <div className="admin-props-section" style={{ marginTop: "16px" }}>
                <h4 className="admin-props-section-title">Add Content</h4>
                <div className="admin-props-actions">
                  <button className="admin-btn admin-btn-primary" onClick={onAddRole}>
                    <IconPlus size={14} /> Add Role
                  </button>
                  <button className="admin-btn admin-btn-primary" onClick={onAddProject}>
                    <IconPlus size={14} /> Add Project
                  </button>
                  <button className="admin-btn admin-btn-primary" onClick={onAddSkillGroup}>
                    <IconPlus size={14} /> Add Skill Group
                  </button>
                </div>
              </div>
            </>
          )}
          {selection.tab === "home" && (
            <>
              <p className="admin-props-hint">Click elements to edit. Drag gallery photos to reorder.</p>
              {homeData && homeData.peekIds.length < 8 && availablePhotos && onAddHomePeekId && (
                <div className="admin-props-section">
                  <h4 className="admin-props-section-title">Add Photo to Gallery</h4>
                  <CategorizedPhotoPicker
                    photos={availablePhotos}
                    excludeIds={homeData.peekIds}
                    onSelect={(id) => onAddHomePeekId(id)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Photo selected
  if (selection.type === "photo") {
    const photo = selection.photo;
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Photo</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <div className="admin-props-thumb">
            <img src={photo.urls?.medium || photo.urls?.thumb} alt={photo.title} />
          </div>
          <label className="admin-field">
            <span className="admin-field-label">Title</span>
            <input type="text" value={photo.title} onChange={(e) => onUpdatePhoto(photo.id, { title: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Category</span>
            <select value={photo.category} onChange={(e) => onUpdatePhoto(photo.id, { category: e.target.value })} className="admin-input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Tags</span>
            <input
              type="text"
              value={(photo.tags || []).join(", ")}
              onChange={(e) => onUpdatePhoto(photo.id, { tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })}
              className="admin-input"
              placeholder="comma-separated"
            />
          </label>

          <div className="admin-props-section">
            <h4 className="admin-props-section-title">Order</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => onMovePhotoUp?.(photo.id)} style={{ flex: 1 }}>&#8593; Move Up</button>
              <button className="admin-btn admin-btn-secondary" onClick={() => onMovePhotoDown?.(photo.id)} style={{ flex: 1 }}>&#8595; Move Down</button>
            </div>
          </div>

          <div className="admin-props-section">
            <button className="admin-add-pill" onClick={() => setShowExif(!showExif)} style={{ marginBottom: "8px" }}>
              {showExif ? "Hide" : "Edit"} EXIF Data
            </button>
            {showExif && (
              <div className="admin-exif-grid">
                <label className="admin-field">
                  <span className="admin-field-label">Camera</span>
                  <input type="text" value={photo.exif?.camera || ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, camera: e.target.value || null } })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Lens</span>
                  <input type="text" value={photo.exif?.lens || ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, lens: e.target.value || null } })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Aperture</span>
                  <input type="text" value={photo.exif?.aperture || ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, aperture: e.target.value || null } })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Shutter</span>
                  <input type="text" value={photo.exif?.shutter || ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, shutter: e.target.value || null } })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">ISO</span>
                  <input type="text" value={photo.exif?.iso ?? ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, iso: e.target.value ? Number(e.target.value) : null } })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Focal Length</span>
                  <input type="text" value={photo.exif?.focalLength || ""} onChange={(e) => onUpdatePhoto(photo.id, { exif: { ...{ camera: null, lens: null, aperture: null, shutter: null, iso: null, focalLength: null }, ...photo.exif, focalLength: e.target.value || null } })} className="admin-input" />
                </label>
              </div>
            )}
          </div>

          <button className="admin-delete-link" onClick={() => { if (confirm("Delete this photo?")) onDeletePhoto(photo.id); }}>
            Delete photo
          </button>
        </div>
      </div>
    );
  }

  // Role selected
  if (selection.type === "role") {
    const entry = selection.entry;
    const idx = selection.entryIndex;
    const update = (updates: Partial<ExperienceEntry>) => onUpdateExperience(idx, { ...entry, ...updates });
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Experience</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body admin-props-scroll">
          <label className="admin-field">
            <span className="admin-field-label">Company</span>
            <input type="text" value={entry.company} onChange={(e) => update({ company: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Role</span>
            <input type="text" value={entry.role} onChange={(e) => update({ role: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Location</span>
            <input type="text" value={entry.location} onChange={(e) => update({ location: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Period</span>
            <input type="text" value={entry.period} onChange={(e) => update({ period: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">URL</span>
            <input type="text" value={entry.url || ""} onChange={(e) => update({ url: e.target.value || null })} className="admin-input" placeholder="https://..." />
          </label>

          <div className="admin-props-section">
            <h4 className="admin-props-section-title">Bullets</h4>
            <DndContext
              sensors={bulletSensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIndex = parseInt(String(active.id).split("-")[1]);
                const newIndex = parseInt(String(over.id).split("-")[1]);
                update({ bullets: arrayMove([...entry.bullets], oldIndex, newIndex) });
              }}
            >
              <SortableContext items={entry.bullets.map((_: string, i: number) => `bullet-${i}`)} strategy={verticalListSortingStrategy}>
                {entry.bullets.map((bullet: string, i: number) => (
                  <SortableBullet
                    key={`bullet-${i}`}
                    id={`bullet-${i}`}
                    bullet={bullet}
                    onEdit={() => {
                      const newText = prompt("Edit bullet:", bullet);
                      if (newText !== null) {
                        const bullets = [...entry.bullets];
                        bullets[i] = newText;
                        update({ bullets });
                      }
                    }}
                    onDelete={() => update({ bullets: entry.bullets.filter((_: string, j: number) => j !== i) })}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <button className="admin-add-pill" onClick={() => update({ bullets: [...entry.bullets, "New achievement..."] })}>
              + Add bullet
            </button>
          </div>

          <button className="admin-delete-link" onClick={() => { if (confirm("Delete this role?")) onDeleteExperience(idx); }}>
            Delete role
          </button>
        </div>
      </div>
    );
  }

  // Project selected
  if (selection.type === "project") {
    const project = selection.project;
    const idx = selection.projectIndex;
    const update = (updates: Partial<ProjectEntry>) => onUpdateProject(idx, { ...project, ...updates });
    const labelText = typeof project.label === "string" ? project.label : project.label?.text || "";
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Project</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body admin-props-scroll">
          <label className="admin-field">
            <span className="admin-field-label">Title</span>
            <input type="text" value={project.title} onChange={(e) => update({ title: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Label</span>
            <input type="text" value={labelText} onChange={(e) => update({ label: { ...(typeof project.label === "object" ? project.label : { text: "", icon: "code" }), text: e.target.value } })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Description</span>
            <textarea value={project.description} onChange={(e) => update({ description: e.target.value })} className="admin-input admin-textarea" rows={3} />
          </label>
          <div className="admin-field">
            <span className="admin-field-label">Tech Stack</span>
            <div className="admin-chip-field">
              {project.tech.map((t: string, i: number) => (
                <span key={i} className="admin-chip">
                  {t}
                  <button className="admin-chip-remove" onClick={() => update({ tech: project.tech.filter((_: string, j: number) => j !== i) })}>×</button>
                </span>
              ))}
              <input type="text" className="admin-chip-input" placeholder="Add..." onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  update({ tech: [...project.tech, e.currentTarget.value.trim()] });
                  e.currentTarget.value = "";
                }
              }} />
            </div>
          </div>
          <label className="admin-field">
            <span className="admin-field-label">Link URL</span>
            <input type="text" value={project.href} onChange={(e) => update({ href: e.target.value })} className="admin-input" />
          </label>

          <div className="admin-props-section">
            <h4 className="admin-props-section-title">Store Links</h4>
            {project.badges.map((badge, i: number) => (
              <div key={i} className="admin-link-row">
                <select value={badge.icon} onChange={(e) => {
                  const badges = [...project.badges];
                  badges[i] = { ...badge, icon: e.target.value, label: STORE_ICONS.find(s => s.id === e.target.value)?.label || badge.label };
                  update({ badges });
                }} className="admin-input admin-link-select">
                  {STORE_ICONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <input type="text" value={badge.href} onChange={(e) => {
                  const badges = [...project.badges];
                  badges[i] = { ...badge, href: e.target.value };
                  update({ badges });
                }} className="admin-input" style={{ flex: 1 }} placeholder="https://..." />
                <button className="admin-bullet-btn admin-bullet-delete" onClick={() => update({ badges: project.badges.filter((_: { label: string; href: string; icon: string }, j: number) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="admin-add-pill" onClick={() => update({ badges: [...project.badges, { label: "GitHub", href: "", icon: "github" }] })}>
              + Add Link
            </button>
          </div>

          <button className="admin-delete-link" onClick={() => { if (confirm("Delete this project?")) onDeleteProject(idx); }}>
            Delete project
          </button>
        </div>
      </div>
    );
  }

  // Skill group selected
  if (selection.type === "skillGroup") {
    const group = selection.group;
    const idx = selection.groupIndex;
    const update = (updates: Partial<SkillGroup>) => onUpdateSkillGroup(idx, { ...group, ...updates });
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Skill Group</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <label className="admin-field">
            <span className="admin-field-label">Category</span>
            <input type="text" value={group.category} onChange={(e) => update({ category: e.target.value })} className="admin-input" />
          </label>
          <div className="admin-field">
            <span className="admin-field-label">Skills</span>
            <div className="admin-chip-field">
              {group.items.map((item: string, i: number) => (
                <span key={i} className="admin-chip">
                  {item}
                  <button className="admin-chip-remove" onClick={() => update({ items: group.items.filter((_: string, j: number) => j !== i) })}>×</button>
                </span>
              ))}
              <input type="text" className="admin-chip-input" placeholder="Add skill..." onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  update({ items: [...group.items, e.currentTarget.value.trim()] });
                  e.currentTarget.value = "";
                }
              }} />
            </div>
          </div>
          <button className="admin-delete-link" onClick={() => { if (confirm("Delete this group?")) onDeleteSkillGroup(idx); }}>
            Delete group
          </button>
        </div>
      </div>
    );
  }

  // Education selected
  if (selection.type === "education") {
    const edu = selection.entry;
    const idx = selection.entryIndex;
    const update = (updates: Partial<EducationEntry>) => onUpdateEducation(idx, { ...edu, ...updates });
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Education</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body admin-props-scroll">
          <label className="admin-field">
            <span className="admin-field-label">School</span>
            <input type="text" value={edu.school} onChange={(e) => update({ school: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Degree</span>
            <input type="text" value={edu.degree} onChange={(e) => update({ degree: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">CGPA</span>
            <input type="text" value={edu.cgpa} onChange={(e) => update({ cgpa: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Period</span>
            <input type="text" value={edu.period} onChange={(e) => update({ period: e.target.value })} className="admin-input" />
          </label>
          <div className="admin-field">
            <span className="admin-field-label">Leadership</span>
            <div className="admin-chip-field">
              {edu.leadership.map((l: string, i: number) => (
                <span key={i} className="admin-chip">
                  {l}
                  <button className="admin-chip-remove" onClick={() => update({ leadership: edu.leadership.filter((_: string, j: number) => j !== i) })}>×</button>
                </span>
              ))}
              <input type="text" className="admin-chip-input" placeholder="Add..." onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  update({ leadership: [...edu.leadership, e.currentTarget.value.trim()] });
                  e.currentTarget.value = "";
                }
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home Title
  if (selection.type === "homeTitle" && homeData && onUpdateHome) {
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Site Title</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <label className="admin-field">
            <span className="admin-field-label">Name</span>
            <input type="text" value={homeData.title} onChange={(e) => onUpdateHome("title", e.target.value)} className="admin-input" />
          </label>
        </div>
      </div>
    );
  }

  // Home Subtitle
  if (selection.type === "homeSubtitle" && homeData && onUpdateHome) {
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Tagline</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <label className="admin-field">
            <span className="admin-field-label">Subtitle</span>
            <input type="text" value={homeData.subtitle} onChange={(e) => onUpdateHome("subtitle", e.target.value)} className="admin-input" />
          </label>
        </div>
      </div>
    );
  }

  // Home Intro
  if (selection.type === "homeIntro" && homeData && onUpdateHome) {
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Intro Text</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <label className="admin-field">
            <span className="admin-field-label">Introduction</span>
            <textarea value={homeData.intro} onChange={(e) => onUpdateHome("intro", e.target.value)} className="admin-input admin-textarea" rows={3} />
          </label>
        </div>
      </div>
    );
  }

  // Home Gallery photo picker
  if (selection.type === "homeGallery" && homeData && onUpdateHomePeekId && availablePhotos) {
    const idx = selection.photoIndex;
    const currentId = homeData.peekIds[idx] || "";
    const currentPhoto = availablePhotos.find(p => p.id === currentId);
    const currentPosition = homePeekPositions?.[currentId] || "50% 50%";

    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Gallery Photo {idx + 1}</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          {currentPhoto && (
            <div className="admin-field">
              <span className="admin-field-label">Position (drag to adjust)</span>
              <div
                className="admin-pan-frame"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const frame = e.currentTarget;
                  const img = frame.querySelector("img") as HTMLImageElement;
                  if (!img) return;

                  const startX = e.clientX;
                  const startY = e.clientY;
                  const pos = (currentPosition || "50% 50%").split(" ");
                  const startPosX = parseFloat(pos[0]) || 50;
                  const startPosY = parseFloat(pos[1]) || 50;

                  const handleMove = (ev: MouseEvent) => {
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    const newX = Math.max(0, Math.min(100, startPosX - (dx / 2)));
                    const newY = Math.max(0, Math.min(100, startPosY - (dy / 2)));
                    const newPos = `${Math.round(newX)}% ${Math.round(newY)}%`;
                    img.style.objectPosition = newPos;
                    frame.dataset.currentPos = newPos;
                  };

                  const handleUp = () => {
                    document.removeEventListener("mousemove", handleMove);
                    document.removeEventListener("mouseup", handleUp);
                    const finalPos = frame.dataset.currentPos;
                    if (finalPos) {
                      onUpdateHomePeekPosition?.(currentId, finalPos);
                    }
                  };

                  document.addEventListener("mousemove", handleMove);
                  document.addEventListener("mouseup", handleUp);
                }}
              >
                <img
                  src={currentPhoto.url}
                  alt="Position preview"
                  className="admin-pan-img"
                  style={{ objectPosition: currentPosition || "50% 50%" }}
                  draggable={false}
                />
                <div className="admin-pan-crosshair" />
              </div>
              <p className="admin-props-hint" style={{ marginTop: "4px" }}>Drag the image to adjust which part shows in the card</p>
            </div>
          )}

          {onRemoveHomePeekId && (
            <button className="admin-btn admin-btn-secondary" style={{ width: "100%", justifyContent: "center", color: "#e74c3c", borderColor: "#e74c3c" }} onClick={() => onRemoveHomePeekId(idx)}>
              Remove from Gallery
            </button>
          )}

          <div className="admin-props-section" style={{ marginTop: "12px" }}>
            <h4 className="admin-props-section-title">Replace with</h4>
            <CategorizedPhotoPicker
              photos={availablePhotos}
              excludeIds={[]}
              onSelect={(id) => onUpdateHomePeekId(idx, id)}
              galleryIds={homeData.peekIds}
            />
          </div>
        </div>
      </div>
    );
  }

  // Home Social Links
  if (selection.type === "homeSocial" && homeData && onUpdateSocialLinks) {
    const links = homeData.socialLinks;
    const updateLink = (index: number, updates: Partial<SocialLink>) => {
      const updated = links.map((l, i) => i === index ? { ...l, ...updates } : l);
      onUpdateSocialLinks(updated);
    };
    const removeLink = (index: number) => {
      onUpdateSocialLinks(links.filter((_, i) => i !== index));
    };
    const addLink = () => {
      onUpdateSocialLinks([...links, { icon: "github", url: "", label: "GitHub" }]);
    };
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Social Links</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body admin-props-scroll">
          {links.map((link, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <label className="admin-field" style={{ marginBottom: "6px" }}>
                <span className="admin-field-label">Icon</span>
                <select value={link.icon} onChange={(e) => {
                  const chosen = SOCIAL_ICONS.find(s => s.id === e.target.value);
                  updateLink(i, { icon: e.target.value, label: chosen?.label || link.label });
                }} className="admin-input">
                  {SOCIAL_ICONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="admin-field" style={{ marginBottom: "6px" }}>
                <span className="admin-field-label">URL</span>
                <input type="text" value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} className="admin-input" placeholder="https://..." />
              </label>
              <label className="admin-field">
                <span className="admin-field-label">Label</span>
                <input type="text" value={link.label} onChange={(e) => updateLink(i, { label: e.target.value })} className="admin-input" />
              </label>
              <button className="admin-delete-link" onClick={() => removeLink(i)} style={{ marginTop: "4px" }}>
                Remove
              </button>
            </div>
          ))}
          <button className="admin-add-pill" onClick={addLink}>
            + Add Link
          </button>
        </div>
      </div>
    );
  }

  // Home CTA button
  if (selection.type === "homeCta" && homeCtas && onUpdateHomeCta) {
    const cta = homeCtas[selection.ctaIndex];
    if (!cta) return null;
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Button</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <label className="admin-field">
            <span className="admin-field-label">Text</span>
            <input type="text" value={cta.text} onChange={(e) => onUpdateHomeCta(selection.ctaIndex, { text: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Link</span>
            <input type="text" value={cta.link} onChange={(e) => onUpdateHomeCta(selection.ctaIndex, { link: e.target.value })} className="admin-input" placeholder="/photography" />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Style</span>
            <select value={cta.style} onChange={(e) => onUpdateHomeCta(selection.ctaIndex, { style: e.target.value as "primary" | "secondary" })} className="admin-input">
              <option value="primary">Primary (filled)</option>
              <option value="secondary">Secondary (outlined)</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  // Resume
  if (selection.type === "resume") {
    return (
      <div className="admin-props">
        <div className="admin-props-header">
          <h3 className="admin-props-title">Resume</h3>
          <button className="admin-props-close" onClick={onDeselect}>×</button>
        </div>
        <div className="admin-props-body">
          <p className="admin-props-hint">
            Current resume: <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "underline" }}>Download PDF</a>
          </p>
          <div className="admin-props-section">
            <h4 className="admin-props-section-title">Upload New Resume</h4>
            <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", textAlign: "center", display: "flex", justifyContent: "center" }}>
              <IconPlus size={14} /> Choose PDF
              <input type="file" accept=".pdf" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file);
                try {
                  const res = await fetch("/api/upload-resume", {
                    method: "POST",
                    body: formData,
                  });
                  if (res.ok) {
                    alert("Resume updated! Site will rebuild in ~1-2 minutes.");
                  } else {
                    const err = await res.json() as { error?: string };
                    alert("Failed: " + (err.error || "Unknown error"));
                  }
                } catch {
                  alert("Failed to upload resume");
                }
              }} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
