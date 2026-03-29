"use client";

import { useState, useMemo, useCallback } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useInView } from "@/hooks/useInView";
import ProjectCard from "@/components/ProjectCard";
import DraggableMasonry from "@/components/admin/DraggableMasonry";
import FilterTabs from "@/components/FilterTabs";
import SearchBar from "@/components/SearchBar";
import Lightbox from "@/components/Lightbox";
import { getIcon, IconDownload } from "@/components/icons";
import type { Photo } from "@/types";
import AdminTopBar from "@/components/admin/AdminTopBar";
import PropertiesPanel from "@/components/admin/PropertiesPanel";
import type { Selection } from "@/components/admin/PropertiesPanel";
import "@/styles/admin.css";
import "@/styles/dev.css";
import "@/styles/photography.css";
import "@/styles/home.css";
import portfolioData from "../../../data/portfolio_images.json";
import resumeData from "../../../data/resume.json";
import siteConfig from "../../../data/site_config.json";
import homeConfig from "../../../data/home_config.json";

type Tab = "home" | "photography" | "dev";

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

const initialPhotos: PortfolioPhoto[] = [...(portfolioData as PortfolioPhoto[])].sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0)
);

function SortableGalleryItem({ id, photo, isSelected, objectPosition, onClick }: { id: string; photo: PortfolioPhoto; isSelected: boolean; objectPosition?: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`hd-gallery-item admin-editable ${isSelected ? "selected" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <img src={photo.urls.medium} alt={photo.title} style={{ width: "100%", height: "160px", objectFit: "cover", objectPosition: objectPosition || "center" }} />
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("photography");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [selection, setSelection] = useState<Selection>({ type: "none", tab: "photography" });

  const [photos, setPhotos] = useState<PortfolioPhoto[]>(initialPhotos);
  const [experience, setExperience] = useState<ExperienceEntry[]>(resumeData.experience as ExperienceEntry[]);
  const [projects, setProjects] = useState(resumeData.projects);
  const [skills, setSkills] = useState(resumeData.skills);
  const [education, setEducation] = useState<EducationEntry[]>(resumeData.education as EducationEntry[]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Home tab state
  const [homeTitle, setHomeTitle] = useState(homeConfig.title);
  const [homeSubtitle, setHomeSubtitle] = useState(homeConfig.subtitle);
  const [homeIntro, setHomeIntro] = useState(homeConfig.intro);
  const [homePeekIds, setHomePeekIds] = useState(homeConfig.peekIds);
  const [homePeekPositions, setHomePeekPositions] = useState<Record<string, string>>(homeConfig.peekPositions || {});
  const [socialLinks, setSocialLinks] = useState(homeConfig.socialLinks);
  const [homeCtas, setHomeCtas] = useState(homeConfig.ctas as { text: string; link: string; style: "primary" | "secondary" }[]);

  // Photography state
  const [photoCategory, setPhotoCategory] = useState("All");
  const [photoSearch, setPhotoSearch] = useState("");
  const [categoryColumns, setCategoryColumns] = useState<Record<string, number>>(siteConfig.categoryColumns || {});
  const [categoryOrders, setCategoryOrders] = useState<Record<string, string[]>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


  const devRef = useInView();

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelection({ type: "none", tab });
  }, []);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleGalleryDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setHomePeekIds(prev => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasUnsaved(true);
  }, []);

  // Photo filtering (same as PreviewPanel / real photography page)
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

    // Apply per-category ordering if available
    const catOrder = categoryOrders[photoCategory];
    if (catOrder && catOrder.length > 0) {
      const orderMap = new Map(catOrder.map((id, i) => [id, i]));
      result = [...result].sort((a, b) => {
        const aIdx = orderMap.get(a.id);
        const bIdx = orderMap.get(b.id);
        if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
        if (aIdx !== undefined) return -1;
        if (bIdx !== undefined) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
    }

    return result;
  }, [sortedPhotos, photoCategory, photoSearch, categoryOrders]);

  const photoCounts = useMemo(() => {
    const c: Record<string, number> = { All: sortedPhotos.length };
    sortedPhotos.forEach((p) => {
      const cat = p.category.charAt(0).toUpperCase() + p.category.slice(1);
      c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [sortedPhotos]);

  // Build full Photo objects for MasonryGrid
  const fullPhotos: Photo[] = useMemo(() => filteredPhotos.map((p) => ({
    ...p,
    tags: p.tags || [],
    order: p.order || 0,
    urls: {
      original: (p.urls.original as string) ?? p.urls.medium,
      large: (p.urls as Record<string, string>).large ?? p.urls.medium,
      medium: p.urls.medium,
      small: (p.urls as Record<string, string>).small ?? p.urls.medium,
      thumb: p.urls.thumb,
    },
    dimensions: p.dimensions as Photo["dimensions"],
  })), [filteredPhotos]);

  // Homepage peek photos
  const peekPhotos = useMemo(() => {
    return homePeekIds
      .map((id) => sortedPhotos.find((p) => p.id === id))
      .filter(Boolean) as PortfolioPhoto[];
  }, [sortedPhotos, homePeekIds]);

  // Available photos for home gallery picker
  const availablePhotos = useMemo(() =>
    sortedPhotos.map((p) => ({ id: p.id, title: p.title, url: p.urls.medium, category: p.category })),
    [sortedPhotos]
  );

  // Deselect when clicking empty areas
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking directly on the content area, not on an editable
    if (e.target === e.currentTarget) {
      setSelection({ type: "none", tab: activeTab });
    }
  }, [activeTab]);

  // Photo upload handler
  const handlePhotoUpload = useCallback(async (file: File, metadata: { title: string; category: string; tags: string }) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", metadata.category);
      formData.append("title", metadata.title);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await uploadRes.json() as { error?: string; message?: string };
      if (!uploadRes.ok) throw new Error(result.error || "Upload failed");

      alert(result.message || "Photo uploaded! The GitHub Action will process it and the site will rebuild.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Update handlers
  const handleUpdatePhoto = useCallback((id: string, updates: Partial<PortfolioPhoto>) => {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
    setHasUnsaved(true);
    // Update selection if this photo is currently selected
    setSelection((prev) => {
      if (prev.type === "photo" && prev.photo.id === id) {
        return { type: "photo", photo: { ...prev.photo, ...updates } };
      }
      return prev;
    });
  }, []);

  const handleDeletePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })));
    setHasUnsaved(true);
    setSelection((prev) => prev.type === "photo" && prev.photo.id === id ? { type: "none", tab: "photography" } : prev);
  }, []);

  const handleMovePhotoUp = useCallback((id: string) => {
    setPhotos(prev => {
      const sorted = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = sorted.findIndex(p => p.id === id);
      if (idx <= 0) return prev;
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[idx - 1].order };
      sorted[idx - 1] = { ...sorted[idx - 1], order: temp };
      return sorted;
    });
    setHasUnsaved(true);
  }, []);

  const handleMovePhotoDown = useCallback((id: string) => {
    setPhotos(prev => {
      const sorted = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = sorted.findIndex(p => p.id === id);
      if (idx >= sorted.length - 1) return prev;
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[idx + 1].order };
      sorted[idx + 1] = { ...sorted[idx + 1], order: temp };
      return sorted;
    });
    setHasUnsaved(true);
  }, []);

  // Home tab handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateHome = useCallback((field: string, value: any) => {
    switch (field) {
      case "title": setHomeTitle(value); break;
      case "subtitle": setHomeSubtitle(value); break;
      case "intro": setHomeIntro(value); break;
    }
    setHasUnsaved(true);
  }, []);

  const handleUpdateHomePeekId = useCallback((index: number, newId: string) => {
    setHomePeekIds(prev => prev.map((id, i) => i === index ? newId : id));
    setHasUnsaved(true);
  }, []);

  const handleRemoveHomePeekId = useCallback((index: number) => {
    setHomePeekIds(prev => prev.filter((_, i) => i !== index));
    setHasUnsaved(true);
    setSelection({ type: "none", tab: "home" });
  }, []);

  const handleAddHomePeekId = useCallback((id: string) => {
    setHomePeekIds(prev => [...prev, id]);
    setHasUnsaved(true);
  }, []);

  const handleUpdateSocialLinks = useCallback((links: { icon: string; url: string; label: string }[]) => {
    setSocialLinks(links);
    setHasUnsaved(true);
  }, []);

  const handleUpdateExperience = useCallback((index: number, updated: ExperienceEntry) => {
    setExperience((prev) => prev.map((e, i) => i === index ? updated : e));
    setHasUnsaved(true);
    setSelection((prev) => {
      if (prev.type === "role" && prev.entryIndex === index) {
        return { type: "role", entry: updated, entryIndex: index };
      }
      return prev;
    });
  }, []);

  const handleDeleteExperience = useCallback((index: number) => {
    setExperience((prev) => prev.filter((_, i) => i !== index));
    setHasUnsaved(true);
    setSelection({ type: "none", tab: "dev" });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateProject = useCallback((index: number, updated: any) => {
    setProjects((prev) => prev.map((p, i) => i === index ? updated : p));
    setHasUnsaved(true);
    setSelection((prev) => {
      if (prev.type === "project" && prev.projectIndex === index) {
        return { type: "project", project: updated, projectIndex: index };
      }
      return prev;
    });
  }, []);

  const handleDeleteProject = useCallback((index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
    setHasUnsaved(true);
    setSelection({ type: "none", tab: "dev" });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateSkillGroup = useCallback((index: number, updated: any) => {
    setSkills((prev) => prev.map((g, i) => i === index ? updated : g));
    setHasUnsaved(true);
    setSelection((prev) => {
      if (prev.type === "skillGroup" && prev.groupIndex === index) {
        return { type: "skillGroup", group: updated, groupIndex: index };
      }
      return prev;
    });
  }, []);

  const handleDeleteSkillGroup = useCallback((index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
    setHasUnsaved(true);
    setSelection({ type: "none", tab: "dev" });
  }, []);

  const handleUpdateEducation = useCallback((index: number, updated: EducationEntry) => {
    setEducation((prev) => prev.map((e, i) => i === index ? updated : e));
    setHasUnsaved(true);
    setSelection((prev) => {
      if (prev.type === "education" && prev.entryIndex === index) {
        return { type: "education", entry: updated, entryIndex: index };
      }
      return prev;
    });
  }, []);

  const handleAddRole = useCallback(() => {
    const newEntry: ExperienceEntry = {
      id: `role-${Date.now()}`,
      company: "Company Name",
      role: "Role Title",
      period: "Jan 2024 – Present",
      startMonth: "Jan",
      startYear: "2024",
      endMonth: "",
      endYear: "",
      isPresent: true,
      location: "City",
      logo: null,
      url: null,
      bullets: ["Describe your achievement..."],
    };
    setExperience((prev) => [newEntry, ...prev]);
    setHasUnsaved(true);
    setSelection({ type: "role", entry: newEntry, entryIndex: 0 });
  }, []);

  const handleAddProject = useCallback(() => {
    const newProject = {
      id: `project-${Date.now()}`,
      title: "New Project",
      label: { text: "Type", icon: "code" },
      description: "Project description...",
      tech: [] as string[],
      icon: null,
      href: "",
      badges: [{ label: "GitHub", href: "", icon: "github" }],
    };
    setProjects((prev) => [...prev, newProject]);
    setHasUnsaved(true);
    setSelection({ type: "project", project: newProject, projectIndex: projects.length });
  }, [projects.length]);

  const handleAddSkillGroup = useCallback(() => {
    const newGroup = { category: "New Category", icon: "code", items: [] as string[] };
    setSkills((prev) => [...prev, newGroup]);
    setHasUnsaved(true);
    setSelection({ type: "skillGroup", group: newGroup, groupIndex: skills.length });
  }, [skills.length]);

  const handleDeselect = useCallback(() => {
    setSelection({ type: "none", tab: activeTab });
  }, [activeTab]);

  return (
    <div className="admin-wysiwyg">
      <AdminTopBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        deployProps={{
          hasUnsaved,
          photos,
          resume: { experience, projects, skills, education },
          siteConfig: { categoryColumns },
          homeConfig: { title: homeTitle, subtitle: homeSubtitle, intro: homeIntro, peekIds: homePeekIds, peekPositions: homePeekPositions, socialLinks, ctas: homeCtas },
          onDeploySuccess: () => setHasUnsaved(false),
          disabled: isDispatching,
        }}
      />

      <div className="admin-wysiwyg-body">
        <div className="admin-wysiwyg-content" onClick={handleContentClick}>

          {/* ===== Photography Tab ===== */}
          {activeTab === "photography" && (
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

              <div className="admin-layout-selector">
                <span className="admin-layout-label">Columns:</span>
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`admin-layout-btn ${(categoryColumns[photoCategory] || 4) === n ? "active" : ""}`}
                    onClick={() => {
                      setCategoryColumns(prev => ({ ...prev, [photoCategory]: n }));
                      setHasUnsaved(true);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <DraggableMasonry
                photos={fullPhotos}
                columns={categoryColumns[photoCategory] || 4}
                selectedId={selection.type === "photo" ? selection.photo.id : undefined}
                onPhotoClick={(index) => {
                  const photo = filteredPhotos[index];
                  if (photo) setSelection({ type: "photo", photo });
                }}
                onReorder={(reordered) => {
                  // Save per-category order
                  setCategoryOrders(prev => ({
                    ...prev,
                    [photoCategory]: reordered.map((p) => p.id),
                  }));

                  // If "All" tab, also update the global order
                  if (photoCategory === "All") {
                    setPhotos(reordered.map((p, i) => ({ ...p, order: i + 1 })) as unknown as PortfolioPhoto[]);
                  }

                  setHasUnsaved(true);
                }}
              />

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

          {/* ===== Dev Tab ===== */}
          {activeTab === "dev" && (
            <div className="dev-page" style={{ padding: "0 2rem 2rem" }} ref={devRef}>
              <header className="dev-header reveal">
                <p className="dev-label">Resume & Projects</p>
                <div className="dev-header-row">
                  <h1 className="dev-title">Development</h1>
                  <div
                    className={`resume-btn admin-editable ${selection.type === "resume" ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelection({ type: "resume" } as Selection); }}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="admin-edit-badge">✎</span>
                    <IconDownload size={16} />
                    Resume
                  </div>
                </div>
              </header>

              {/* Experience */}
              <section>
                <h2 className="section-title reveal">Experience</h2>
                <div className="timeline">
                  {experience.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`admin-editable ${selection.type === "role" && selection.entryIndex === i ? "selected" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setSelection({ type: "role", entry, entryIndex: i }); }}
                    >
                      <span className="admin-edit-badge">&#9998;</span>
                      <div className="timeline-entry reveal">
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-header-left">
                              {entry.logo && (
                                <img src={entry.logo} alt={`${entry.company} logo`} className="timeline-logo" width={32} height={32} />
                              )}
                              <div>
                                <h3 className="timeline-company">
                                  {entry.url ? (
                                    <a href={entry.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>{entry.company}</a>
                                  ) : entry.company}
                                </h3>
                                <p className="timeline-role">{entry.role}</p>
                              </div>
                            </div>
                            <div className="timeline-meta">
                              <span className="timeline-period">{entry.period}</span>
                              <span className="timeline-location">{entry.location}</span>
                            </div>
                          </div>
                          <ul className="timeline-bullets">
                            {entry.bullets.map((bullet, bi) => (
                              <li key={bi} dangerouslySetInnerHTML={{ __html: bullet }} />
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Skills */}
              <section className="skills-section">
                <h2 className="section-title reveal">Skills</h2>
                {skills.map((group, gi) => (
                  <div
                    key={group.category}
                    className={`admin-editable ${selection.type === "skillGroup" && selection.groupIndex === gi ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelection({ type: "skillGroup", group, groupIndex: gi }); }}
                  >
                    <span className="admin-edit-badge">&#9998;</span>
                    <div className="skills-group reveal">
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
                  </div>
                ))}
              </section>

              {/* Education */}
              <section className="education-section">
                <h2 className="section-title reveal">Education</h2>
                {education.map((edu, ei) => (
                  <div
                    key={edu.id}
                    className={`admin-editable ${selection.type === "education" && selection.entryIndex === ei ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelection({ type: "education", entry: edu, entryIndex: ei }); }}
                  >
                    <span className="admin-edit-badge">&#9998;</span>
                    <div className="education-entry reveal">
                      <div className="education-header">
                        <div className="education-header-left">
                          {edu.logo && (
                            <img src={edu.logo} alt={`${edu.school} logo`} className="education-logo" width={32} height={32} />
                          )}
                          <p className="education-school">
                            {edu.url ? (
                              <a href={edu.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>{edu.school}</a>
                            ) : edu.school}
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
                  </div>
                ))}
              </section>

              {/* Projects */}
              <section>
                <h2 className="section-title reveal">Projects</h2>
                <div className="projects-grid">
                  {projects.map((p, pi) => (
                    <div
                      key={p.id}
                      className={`admin-editable ${selection.type === "project" && selection.projectIndex === pi ? "selected" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setSelection({ type: "project", project: p, projectIndex: pi }); }}
                    >
                      <span className="admin-edit-badge">&#9998;</span>
                      <ProjectCard {...p} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ===== Home Tab ===== */}
          {activeTab === "home" && (
            <div className="home-d" style={{ minHeight: "auto" }}>
              <header className="hd-hero">
                <div
                  className={`admin-editable ${selection.type === "homeTitle" ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setSelection({ type: "homeTitle" }); }}
                >
                  <span className="admin-edit-badge">&#9998;</span>
                  <h1 className="hd-name">{homeTitle}</h1>
                </div>
                <div
                  className={`admin-editable ${selection.type === "homeSubtitle" ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setSelection({ type: "homeSubtitle" }); }}
                >
                  <span className="admin-edit-badge">&#9998;</span>
                  <p className="hd-tagline">{homeSubtitle}</p>
                </div>
                <div
                  className={`admin-editable ${selection.type === "homeIntro" ? "selected" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setSelection({ type: "homeIntro" }); }}
                >
                  <span className="admin-edit-badge">&#9998;</span>
                  <p className="hd-intro">{homeIntro}</p>
                </div>
              </header>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGalleryDragEnd}>
                <SortableContext items={homePeekIds} strategy={rectSortingStrategy}>
                  <div className="hd-gallery">
                    {homePeekIds.map((id, i) => {
                      const photo = sortedPhotos.find((p) => p.id === id);
                      if (!photo) return null;
                      return (
                        <SortableGalleryItem
                          key={id}
                          id={id}
                          photo={photo}
                          objectPosition={homePeekPositions[id] || "center"}
                          isSelected={selection.type === "homeGallery" && (selection as { type: "homeGallery"; photoIndex: number }).photoIndex === i}
                          onClick={() => setSelection({ type: "homeGallery", photoIndex: i })}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="hd-ctas">
                {homeCtas.map((cta, i) => (
                  <div
                    key={i}
                    className={`admin-editable ${selection.type === "homeCta" && (selection as { type: "homeCta"; ctaIndex: number }).ctaIndex === i ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelection({ type: "homeCta", ctaIndex: i } as Selection); }}
                  >
                    <span className="admin-edit-badge">✎</span>
                    <span className={`hd-cta hd-cta-${cta.style}`} style={{ cursor: "pointer" }}>{cta.text}</span>
                  </div>
                ))}
              </div>

              <div
                className={`admin-editable ${selection.type === "homeSocial" ? "selected" : ""}`}
                onClick={(e) => { e.stopPropagation(); setSelection({ type: "homeSocial" }); }}
              >
                <span className="admin-edit-badge">&#9998;</span>
                <footer className="hd-bottom">
                  <div className="hd-social">
                    {socialLinks.map((link, i) => (
                      <span key={i} aria-label={link.label}>{getIcon(link.icon, { size: 18 })}</span>
                    ))}
                  </div>
                  <p className="hd-footer">&copy; 2026 Akhil Saxena</p>
                </footer>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          selection={selection}
          onUpdatePhoto={handleUpdatePhoto}
          onDeletePhoto={handleDeletePhoto}
          onUpdateExperience={handleUpdateExperience}
          onDeleteExperience={handleDeleteExperience}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onUpdateSkillGroup={handleUpdateSkillGroup}
          onDeleteSkillGroup={handleDeleteSkillGroup}
          onUpdateEducation={handleUpdateEducation}
          onPhotoUpload={handlePhotoUpload}
          isUploading={isUploading}
          onAddRole={handleAddRole}
          onAddProject={handleAddProject}
          onAddSkillGroup={handleAddSkillGroup}
          onDeselect={handleDeselect}
          onMovePhotoUp={handleMovePhotoUp}
          onMovePhotoDown={handleMovePhotoDown}
          homeData={{ title: homeTitle, subtitle: homeSubtitle, intro: homeIntro, peekIds: homePeekIds, socialLinks }}
          onUpdateHome={handleUpdateHome}
          onUpdateHomePeekId={handleUpdateHomePeekId}
          onUpdateSocialLinks={handleUpdateSocialLinks}
          homeCtas={homeCtas}
          onUpdateHomeCta={(index, updates) => {
            setHomeCtas(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
            setHasUnsaved(true);
          }}
          availablePhotos={availablePhotos}
          onRemoveHomePeekId={handleRemoveHomePeekId}
          onAddHomePeekId={handleAddHomePeekId}
          homePeekPositions={homePeekPositions}
          onUpdateHomePeekPosition={(id, position) => {
            setHomePeekPositions(prev => ({ ...prev, [id]: position }));
            setHasUnsaved(true);
          }}
        />
      </div>
    </div>
  );
}
