"use client";

import { useState } from "react";
import Timeline from "../Timeline";
import ProjectCard from "../ProjectCard";
import MasonryGrid from "../MasonryGrid";
import { getIcon } from "../icons";
import "@/styles/dev.css";
import "@/styles/photography.css";

interface SkillGroup {
  category: string;
  icon?: string;
  items: string[];
}

interface EducationEntry {
  id: string;
  school: string;
  logo?: string | null;
  degree: string;
  cgpa: string;
  period: string;
  url?: string | null;
  leadership: string[];
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
    education: EducationEntry[];
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
            <div className="dev-page" style={{ padding: "0" }}>
              <section>
                <h2 className="section-title">Experience</h2>
                <Timeline entries={resume.experience} />
              </section>

              <section className="skills-section">
                <h2 className="section-title">Skills</h2>
                {resume.skills.map((group) => (
                  <div key={group.category} className="skills-group">
                    <p className="skills-label">
                      {group.icon && getIcon(group.icon, { size: 14 })}
                      {group.category}
                    </p>
                    <div className="skills-tags">
                      {group.items.map((s) => (
                        <span key={s} className="skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="education-section">
                <h2 className="section-title">Education</h2>
                {resume.education.map((edu: EducationEntry) => (
                  <div key={edu.id} className="education-entry">
                    <div className="education-header">
                      <p className="education-school">{edu.school}</p>
                      <span className="education-period">{edu.period}</span>
                    </div>
                    <p className="education-detail">{edu.degree} · {edu.cgpa} CGPA</p>
                    <div className="education-leadership">
                      {edu.leadership.map((l) => (
                        <span key={l} className="education-badge">{l}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h2 className="section-title">Projects</h2>
                <div className="projects-grid">
                  {resume.projects.map((p) => (
                    <ProjectCard key={p.id} {...p} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "photography" && (
            <div className="photo-page" style={{ padding: "0", maxWidth: "100%" }}>
              <div className="admin-preview-watermark-note">
                Photos shown with CSS watermark overlay (actual watermark is baked into images by the processing pipeline)
              </div>
              <div className="admin-watermarked-grid">
                <MasonryGrid
                  photos={photos.map((p) => ({ ...p, urls: { original: p.urls.original ?? p.urls.medium, medium: p.urls.medium, thumb: p.urls.thumb } }))}
                  onPhotoClick={() => {}}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
