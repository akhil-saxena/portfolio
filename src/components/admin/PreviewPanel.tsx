"use client";

import { useState } from "react";
import Timeline from "../Timeline";
import ProjectCard from "../ProjectCard";
import MasonryGrid from "../MasonryGrid";

interface SkillGroup {
  category: string;
  items: string[];
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
}

interface ExperienceEntry {
  id?: string;
  company: string;
  role: string;
  period: string;
  location: string;
  logo?: string | null;
  url?: string | null;
  bullets: string[];
}

interface PhotoEntry {
  id: string;
  title: string;
  category: string;
  urls: {
    original?: string;
    medium: string;
    thumb: string;
  };
}

interface PreviewPanelProps {
  photos: PhotoEntry[];
  resume: {
    experience: ExperienceEntry[];
    projects: ProjectEntry[];
    skills: SkillGroup[];
    education: unknown[];
  };
  onClose: () => void;
}

export default function PreviewPanel({ photos, resume, onClose }: PreviewPanelProps) {
  const [tab, setTab] = useState<"dev" | "photography">("dev");

  return (
    <div className="admin-preview-overlay" onClick={onClose}>
      <div className="admin-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-preview-header">
          <h3 className="admin-preview-title">Preview</h3>
          <div className="admin-preview-tabs">
            <button
              className={`admin-pill ${tab === "dev" ? "active" : ""}`}
              onClick={() => setTab("dev")}
            >
              Dev Page
            </button>
            <button
              className={`admin-pill ${tab === "photography" ? "active" : ""}`}
              onClick={() => setTab("photography")}
            >
              Photography
            </button>
          </div>
          <button className="admin-preview-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-preview-content">
          {tab === "dev" && (
            <div className="admin-preview-dev">
              <section>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--ink)", marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>Experience</h2>
                <Timeline entries={resume.experience} />
              </section>

              <section style={{ marginTop: "2rem" }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--ink)", marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>Skills</h2>
                {resume.skills.map((group) => (
                  <div key={group.category} style={{ marginBottom: "1rem" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", marginBottom: "0.5rem" }}>{group.category}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {group.items.map((s) => (
                        <span key={s} style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem", border: "1px solid var(--border)", borderRadius: "20px", color: "var(--ink-body)", fontFamily: "var(--font-mono)" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section style={{ marginTop: "2rem" }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--ink)", marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>Projects</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  {resume.projects.map((p) => (
                    <ProjectCard key={p.id} {...p} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "photography" && (
            <div className="admin-preview-photography">
              <MasonryGrid
                photos={photos.map((p) => ({ ...p, urls: { original: p.urls.original ?? p.urls.medium, medium: p.urls.medium, thumb: p.urls.thumb } }))}
                onPhotoClick={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
