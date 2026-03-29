"use client";

import { useState } from "react";
import { IconPlus } from "../icons";

interface ProjectBadge {
  label: string;
  href: string;
  icon: string;
}

interface Project {
  id: string;
  title: string;
  label: { text: string; icon: string };
  description: string;
  tech: string[];
  icon: string | null;
  href: string;
  badges: ProjectBadge[];
}

interface ProjectEditorProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

const STORE_ICONS = [
  { id: "github", label: "GitHub" },
  { id: "play-store", label: "Play Store" },
  { id: "chrome-store", label: "Chrome Store" },
  { id: "apple", label: "App Store" },
  { id: "windows", label: "Windows Store" },
];

export default function ProjectEditor({ projects, onChange }: ProjectEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateProject = (id: string, updates: Partial<Project>) => {
    onChange(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const addProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: "New Project",
      label: { text: "Type", icon: "code" },
      description: "Project description...",
      tech: [],
      icon: null,
      href: "",
      badges: [{ label: "GitHub", href: "", icon: "github" }],
    };
    onChange([...projects, newProject]);
    setEditingId(newProject.id);
  };

  const deleteProject = (id: string) => {
    if (confirm("Delete this project?")) {
      onChange(projects.filter((p) => p.id !== id));
    }
  };

  return (
    <div>
      <div className="admin-content-header">
        <div>
          <p className="admin-content-label">Resume</p>
          <h2 className="admin-content-title">Projects</h2>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={addProject}>
          <IconPlus size={14} /> Add Project
        </button>
      </div>

      <div className="admin-role-list">
        {projects.map((project) => (
          <div key={project.id} className="admin-role-card">
            <div className="admin-role-header" onClick={() => setEditingId(editingId === project.id ? null : project.id)}>
              <div>
                <h3 className="admin-role-company">{project.title}</h3>
                <p className="admin-role-meta">{typeof project.label === 'string' ? project.label : project.label.text} · {project.tech.join(", ")}</p>
              </div>
              <span className={`admin-role-chevron ${editingId === project.id ? "open" : ""}`}>▸</span>
            </div>

            {editingId === project.id && (
              <div className="admin-role-body">
                <div className="admin-role-fields">
                  <div className="admin-role-field-row">
                    <label className="admin-field">
                      <span className="admin-field-label">Title</span>
                      <input type="text" value={project.title} onChange={(e) => updateProject(project.id, { title: e.target.value })} className="admin-input" />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">Label Text</span>
                      <input type="text" value={project.label.text} onChange={(e) => updateProject(project.id, { label: { ...project.label, text: e.target.value } })} className="admin-input" />
                    </label>
                  </div>
                  <label className="admin-field">
                    <span className="admin-field-label">Description</span>
                    <textarea value={project.description} onChange={(e) => updateProject(project.id, { description: e.target.value })} className="admin-input admin-textarea" rows={3} />
                  </label>
                  <div className="admin-field">
                    <span className="admin-field-label">Tech Stack</span>
                    <div className="admin-chip-field">
                      {project.tech.map((t, i) => (
                        <span key={i} className="admin-chip">
                          {t}
                          <button className="admin-chip-remove" onClick={() => {
                            updateProject(project.id, { tech: project.tech.filter((_, j) => j !== i) });
                          }}>×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="admin-chip-input"
                        placeholder="Add tech..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (!project.tech.includes(value)) {
                              updateProject(project.id, { tech: [...project.tech, value] });
                            }
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="admin-role-field-row">
                    <label className="admin-field">
                      <span className="admin-field-label">Main Link (href)</span>
                      <input type="text" value={project.href} onChange={(e) => updateProject(project.id, { href: e.target.value })} className="admin-input" placeholder="https://..." />
                    </label>
                    <div className="admin-field">
                      <span className="admin-field-label">Project Icon</span>
                      <div className="admin-logo-field">
                        {project.icon ? (
                          <div className="admin-logo-preview">
                            <img src={project.icon} alt="Icon" width={32} height={32} />
                            <button className="admin-logo-remove" onClick={() => updateProject(project.id, { icon: null })}>×</button>
                          </div>
                        ) : (
                          <input type="text" onChange={(e) => updateProject(project.id, { icon: e.target.value || null })} className="admin-input" placeholder="Paste image URL..." />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="admin-field">
                    <span className="admin-field-label">Links</span>
                    <div className="admin-links-list">
                      {project.badges.map((badge, i) => (
                        <div key={i} className="admin-link-row">
                          <select
                            value={badge.icon}
                            onChange={(e) => {
                              const updated = [...project.badges];
                              updated[i] = { ...badge, icon: e.target.value, label: STORE_ICONS.find((s) => s.id === e.target.value)?.label || badge.label };
                              updateProject(project.id, { badges: updated });
                            }}
                            className="admin-input admin-link-select"
                          >
                            {STORE_ICONS.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={badge.href}
                            onChange={(e) => {
                              const updated = [...project.badges];
                              updated[i] = { ...badge, href: e.target.value };
                              updateProject(project.id, { badges: updated });
                            }}
                            className="admin-input"
                            placeholder="https://..."
                            style={{ flex: 1 }}
                          />
                          <button className="admin-bullet-btn admin-bullet-delete" onClick={() => {
                            updateProject(project.id, { badges: project.badges.filter((_, j) => j !== i) });
                          }}>×</button>
                        </div>
                      ))}
                      <button className="admin-add-pill" onClick={() => {
                        updateProject(project.id, { badges: [...project.badges, { label: "GitHub", href: "", icon: "github" }] });
                      }}>
                        + Add Link
                      </button>
                    </div>
                  </div>
                </div>
                <button className="admin-delete-link" onClick={() => deleteProject(project.id)}>Delete project</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
