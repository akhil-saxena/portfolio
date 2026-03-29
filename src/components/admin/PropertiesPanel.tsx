"use client";

import { IconPlus } from "../icons";
import PhotoUploadZone from "./PhotoUploadZone";

interface PortfolioPhoto {
  id: string;
  title: string;
  category: string;
  tags: string[];
  order: number;
  urls: { original?: string; medium: string; thumb: string };
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

export type Selection =
  | { type: "none"; tab: "home" | "photography" | "dev" }
  | { type: "photo"; photo: PortfolioPhoto }
  | { type: "role"; entry: ExperienceEntry; entryIndex: number }
  | { type: "project"; project: ProjectEntry; projectIndex: number }
  | { type: "skillGroup"; group: SkillGroup; groupIndex: number }
  | { type: "education"; entry: EducationEntry; entryIndex: number };

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
}

const CATEGORIES = ["abstract", "architecture", "nature", "portraits", "street", "wildlife", "product"];

const STORE_ICONS = [
  { id: "github", label: "GitHub" },
  { id: "play-store", label: "Play Store" },
  { id: "chrome-store", label: "Chrome Store" },
  { id: "apple", label: "App Store" },
  { id: "windows", label: "Windows Store" },
];

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
}: PropertiesPanelProps) {

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
            </>
          )}
          {selection.tab === "home" && (
            <p className="admin-props-hint">Homepage content is derived from your photos and site settings.</p>
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
            {entry.bullets.map((bullet: string, i: number) => (
              <div key={i} className="admin-bullet">
                <span className="admin-bullet-text" dangerouslySetInnerHTML={{ __html: bullet }} />
                <div className="admin-bullet-actions">
                  <button className="admin-bullet-btn" onClick={() => {
                    const newText = prompt("Edit bullet:", bullet);
                    if (newText !== null) {
                      const bullets = [...entry.bullets];
                      bullets[i] = newText;
                      update({ bullets });
                    }
                  }}>&#9998;</button>
                  <button className="admin-bullet-btn admin-bullet-delete" onClick={() => {
                    update({ bullets: entry.bullets.filter((_: string, j: number) => j !== i) });
                  }}>×</button>
                </div>
              </div>
            ))}
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

  return null;
}
