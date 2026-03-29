"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { IconImage, IconBriefcase, IconBook, IconCode, IconGraduationCap, IconEye, IconPlus } from "@/components/icons";
import "@/styles/admin.css";
import PhotoGrid from "@/components/admin/PhotoGrid";
import PhotoUploadZone from "@/components/admin/PhotoUploadZone";
import PhotoEditModal from "@/components/admin/PhotoEditModal";
import ExperienceEditor from "@/components/admin/ExperienceEditor";
import ProjectEditor from "@/components/admin/ProjectEditor";
import SkillsEditor from "@/components/admin/SkillsEditor";
import EducationEditor from "@/components/admin/EducationEditor";
import PreviewPanel from "@/components/admin/PreviewPanel";
import DeployButton from "@/components/admin/DeployButton";
import portfolioData from "../../../data/portfolio_images.json";
import resumeData from "../../../data/resume.json";

type Section = "photos" | "experience" | "projects" | "skills" | "education";

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

interface PortfolioPhoto {
  id: string;
  title: string;
  category: string;
  tags: string[];
  order: number;
  urls: { original?: string; medium: string; thumb: string };
  [key: string]: unknown;
}

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "photos", label: "Photos", icon: <IconImage size={16} /> },
  { id: "experience", label: "Experience", icon: <IconBriefcase size={16} /> },
  { id: "projects", label: "Projects", icon: <IconBook size={16} /> },
  { id: "skills", label: "Skills", icon: <IconCode size={16} /> },
  { id: "education", label: "Education", icon: <IconGraduationCap size={16} /> },
];

const initialPhotos: PortfolioPhoto[] = [...(portfolioData as PortfolioPhoto[])].sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0)
);

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("photos");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const [photos, setPhotos] = useState<PortfolioPhoto[]>(initialPhotos);
  const [experience, setExperience] = useState<ExperienceEntry[]>(resumeData.experience as ExperienceEntry[]);
  const [projects, setProjects] = useState(resumeData.projects);
  const [skills, setSkills] = useState(resumeData.skills);
  const [education, setEducation] = useState<EducationEntry[]>(resumeData.education as EducationEntry[]);
  const [photoFilter, setPhotoFilter] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PortfolioPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const categories = ["All", ...new Set(photos.map((p) => p.category.charAt(0).toUpperCase() + p.category.slice(1)))];
  const photoCounts: Record<string, number> = { All: photos.length };
  photos.forEach((p) => {
    const cat = p.category.charAt(0).toUpperCase() + p.category.slice(1);
    photoCounts[cat] = (photoCounts[cat] || 0) + 1;
  });

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h1 className="admin-title">Admin</h1>
          <p className="admin-subtitle">Portfolio Manager</p>
          <ThemeToggle />
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-actions">
          <button className="admin-action-btn admin-action-secondary" onClick={() => setShowPreview(true)}>
            <IconEye size={16} />
            Preview
          </button>
          <DeployButton
            hasUnsaved={hasUnsaved}
            photos={photos}
            resume={{ experience, projects, skills, education }}
            onDeploySuccess={() => setHasUnsaved(false)}
            disabled={isDispatching}
          />
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-content-body">
          {activeSection === "photos" && (
            <>
              <div className="admin-content-header">
                <div>
                  <p className="admin-content-label">Manage</p>
                  <h2 className="admin-content-title">Photos</h2>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => setShowUpload(!showUpload)}>
                  <IconPlus size={14} />
                  Upload Photo
                </button>
              </div>

              {showUpload && (
                <PhotoUploadZone
                  onUpload={async (file, metadata) => {
                    setIsUploading(true);
                    try {
                      // Step 1: Upload to R2 temp
                      const formData = new FormData();
                      formData.append("file", file);
                      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                      if (!uploadRes.ok) throw new Error("Upload failed");
                      const { tempKey } = await uploadRes.json() as { tempKey: string };

                      // Step 2: Dispatch GitHub Action
                      setIsDispatching(true);
                      const dispatchRes = await fetch("/api/dispatch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tempKey,
                          title: metadata.title,
                          category: metadata.category,
                          tags: metadata.tags,
                        }),
                      });
                      if (!dispatchRes.ok) throw new Error("Dispatch failed");
                      const { runId } = await dispatchRes.json() as { runId?: string };

                      // Step 3: Poll for completion
                      if (runId) {
                        let attempts = 0;
                        while (attempts < 60) {
                          await new Promise((r) => setTimeout(r, 5000));
                          attempts++;
                          // Note: polling GitHub API directly from browser needs CORS proxy
                          // For now, just wait and refresh data
                        }
                      }

                      // Refresh data after processing
                      // TODO: fetch from /api/data when deployed
                      alert("Photo uploaded! It will appear after the GitHub Action completes and the site rebuilds.");
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setIsUploading(false);
                      setIsDispatching(false);
                      setShowUpload(false);
                    }
                  }}
                  isUploading={isUploading}
                />
              )}

              <div className="admin-filter-pills">
                {categories.map((cat) => (
                  <div key={cat} className="admin-pill-wrapper">
                    <button
                      className={`admin-pill ${photoFilter === cat ? "active" : ""}`}
                      onClick={() => setPhotoFilter(cat)}
                    >
                      {cat} {photoCounts[cat] ? `(${photoCounts[cat]})` : ""}
                    </button>
                    {cat !== "All" && (
                      <button
                        className="admin-pill-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete category "${cat}"? Photos will become uncategorized and only show in "All".`)) {
                            setPhotos(photos.map((p) =>
                              p.category.toLowerCase() === cat.toLowerCase() ? { ...p, category: "" } : p
                            ));
                            setPhotoFilter("All");
                            setHasUnsaved(true);
                          }
                        }}
                        title={`Delete ${cat} category`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="admin-pill"
                  onClick={() => {
                    const name = prompt("New category name:");
                    if (name && !categories.includes(name)) {
                      alert(`Category "${name}" will appear when you assign a photo to it.`);
                    }
                  }}
                >
                  +
                </button>
              </div>

              <PhotoGrid
                photos={photos}
                categoryFilter={photoFilter}
                onReorder={(reordered) => { setPhotos(reordered); setHasUnsaved(true); }}
                onEdit={(photo) => setEditingPhoto(photo)}
                onDelete={(id) => {
                  if (confirm("Delete this photo?")) {
                    setPhotos(photos.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })));
                    setHasUnsaved(true);
                  }
                }}
              />

              {editingPhoto && (
                <PhotoEditModal
                  photo={editingPhoto}
                  onClose={() => setEditingPhoto(null)}
                  onSave={(updated) => {
                    setPhotos(photos.map((p) => p.id === editingPhoto.id ? { ...p, ...updated } : p));
                    setEditingPhoto(null);
                    setHasUnsaved(true);
                  }}
                />
              )}
            </>
          )}

          {activeSection === "experience" && (
            <ExperienceEditor entries={experience} onChange={(e) => { setExperience(e); setHasUnsaved(true); }} />
          )}
          {activeSection === "projects" && (
            <ProjectEditor projects={projects} onChange={(p) => { setProjects(p); setHasUnsaved(true); }} />
          )}
          {activeSection === "skills" && (
            <SkillsEditor skills={skills} onChange={(s) => { setSkills(s); setHasUnsaved(true); }} />
          )}
          {activeSection === "education" && (
            <EducationEditor entries={education} onChange={(e) => { setEducation(e); setHasUnsaved(true); }} />
          )}
        </div>
      </main>

      {showPreview && (
        <PreviewPanel
          photos={photos}
          resume={{ experience, projects, skills, education }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
