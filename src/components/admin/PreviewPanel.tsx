"use client";

import { useState, useMemo } from "react";
import Timeline from "../Timeline";
import ProjectCard from "../ProjectCard";
import MasonryGrid from "../MasonryGrid";
import FilterTabs from "../FilterTabs";
import SearchBar from "../SearchBar";
import Lightbox from "../Lightbox";
import { getIcon, IconDownload } from "../icons";
import { Photo } from "@/types";
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

interface PreviewPanelProps {
  photos: Photo[];
  resume: {
    experience: ExperienceEntry[];
    projects: ProjectEntry[];
    skills: SkillGroup[];
    education: EducationEntry[];
  };
  onClose: () => void;
  onPhotoReorder?: (photos: Photo[]) => void;
}

export default function PreviewPanel({ photos, resume, onClose }: PreviewPanelProps) {
  const [tab, setTab] = useState<"dev" | "photography">("dev");
  const [photoCategory, setPhotoCategory] = useState("All");
  const [photoSearch, setPhotoSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [photos]
  );

  const filteredPhotos = useMemo(() => {
    let result = sortedPhotos;
    if (photoSearch.trim()) {
      const q = photoSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    } else if (photoCategory !== "All") {
      result = result.filter(
        (p) => p.category.toLowerCase() === photoCategory.toLowerCase()
      );
    }
    return result;
  }, [sortedPhotos, photoCategory, photoSearch]);

  const photoCounts = useMemo(() => {
    const c: Record<string, number> = { All: sortedPhotos.length };
    sortedPhotos.forEach((p) => {
      const cat = p.category.charAt(0).toUpperCase() + p.category.slice(1);
      c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [sortedPhotos]);

  const fullPhotos: Photo[] = filteredPhotos.map((p) => ({
    ...p,
    tags: p.tags || [],
    order: p.order || 0,
    urls: {
      original: p.urls.original ?? p.urls.medium,
      large: p.urls.large ?? p.urls.medium,
      medium: p.urls.medium,
      small: p.urls.small ?? p.urls.medium,
      thumb: p.urls.thumb,
    },
    dimensions: p.dimensions,
  }));

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
          <button className="admin-preview-close" onClick={onClose}>← Back to editor</button>
        </div>

        <div className="admin-preview-content">
          {tab === "dev" && (
            <div className="dev-page" style={{ padding: "0 2rem 2rem" }}>
              <header className="dev-header">
                <p className="dev-label">Resume & Portfolio</p>
                <div className="dev-header-row">
                  <h1 className="dev-title">Development</h1>
                  <span className="resume-btn">
                    <IconDownload size={16} />
                    Resume
                  </span>
                </div>
              </header>

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
                {resume.education.map((edu) => (
                  <div key={edu.id} className="education-entry">
                    <div className="education-header">
                      <div className="education-header-left">
                        {edu.logo && (
                          <img
                            src={edu.logo}
                            alt={`${edu.school} logo`}
                            className="education-logo"
                            width={32}
                            height={32}
                          />
                        )}
                        <p className="education-school">
                          {edu.url ? (
                            <a href={edu.url} target="_blank" rel="noopener noreferrer">{edu.school}</a>
                          ) : (
                            edu.school
                          )}
                        </p>
                      </div>
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
            <div className="photo-page" style={{ maxWidth: "100%", padding: "0" }}>
              <header className="photo-header">
                <p className="photo-label">Portfolio</p>
                <div className="photo-header-row">
                  <h1 className="photo-title">Photography</h1>
                  <span className="photo-count">{filteredPhotos.length} photos</span>
                </div>
              </header>

              <div className="photo-toolbar">
                <FilterTabs
                  active={photoCategory}
                  onSelect={(cat) => {
                    setPhotoCategory(cat);
                    setPhotoSearch("");
                  }}
                  searchActive={photoSearch.trim().length > 0}
                  counts={photoCounts}
                />
                <SearchBar value={photoSearch} onChange={setPhotoSearch} />
              </div>

              <div className="admin-watermarked-grid">
                <MasonryGrid
                  photos={fullPhotos}
                  onPhotoClick={setLightboxIndex}
                />
              </div>

              {lightboxIndex !== null && (
                <Lightbox
                  photos={fullPhotos}
                  currentIndex={lightboxIndex}
                  onClose={() => setLightboxIndex(null)}
                  onNavigate={setLightboxIndex}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
