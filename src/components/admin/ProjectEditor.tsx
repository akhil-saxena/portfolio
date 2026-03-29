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
                  <label className="admin-field">
                    <span className="admin-field-label">Tech (comma-separated)</span>
                    <input type="text" value={project.tech.join(", ")} onChange={(e) => updateProject(project.id, { tech: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field-label">GitHub/Link URL</span>
                    <input type="text" value={project.href} onChange={(e) => updateProject(project.id, { href: e.target.value })} className="admin-input" />
                  </label>
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
