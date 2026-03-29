"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { IconImage, IconBriefcase, IconBook, IconCode, IconGraduationCap, IconEye, IconUpload } from "@/components/icons";
import "@/styles/admin.css";

type Section = "photos" | "experience" | "projects" | "skills" | "education";

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "photos", label: "Photos", icon: <IconImage size={16} /> },
  { id: "experience", label: "Experience", icon: <IconBriefcase size={16} /> },
  { id: "projects", label: "Projects", icon: <IconBook size={16} /> },
  { id: "skills", label: "Skills", icon: <IconCode size={16} /> },
  { id: "education", label: "Education", icon: <IconGraduationCap size={16} /> },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("photos");
  const [hasUnsaved, setHasUnsaved] = useState(false);

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
          <button className="admin-action-btn admin-action-secondary">
            <IconEye size={16} />
            Preview
          </button>
          <button className={`admin-action-btn admin-action-primary ${hasUnsaved ? "has-changes" : ""}`}>
            <IconUpload size={14} />
            Save & Deploy
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-content-header">
          <div>
            <p className="admin-content-label">Manage</p>
            <h2 className="admin-content-title">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </h2>
          </div>
        </div>

        <div className="admin-content-body">
          {activeSection === "photos" && <p className="admin-placeholder">Photo management coming soon...</p>}
          {activeSection === "experience" && <p className="admin-placeholder">Experience editor coming soon...</p>}
          {activeSection === "projects" && <p className="admin-placeholder">Project editor coming soon...</p>}
          {activeSection === "skills" && <p className="admin-placeholder">Skills editor coming soon...</p>}
          {activeSection === "education" && <p className="admin-placeholder">Education editor coming soon...</p>}
        </div>
      </main>
    </div>
  );
}
