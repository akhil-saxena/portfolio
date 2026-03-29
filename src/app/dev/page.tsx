"use client";

import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import ProjectCard from "@/components/ProjectCard";
import ThemeToggle from "@/components/ThemeToggle";
import { useInView } from "@/hooks/useInView";
import { IconDownload, getIcon } from "@/components/icons";
import resumeData from "../../../data/resume.json";
import "@/styles/dev.css";

export default function DevPage() {
  const ref = useInView();

  return (
    <>
      <div className="page-sticky-bar">
        <div className="page-sticky-row-1">
          <div className="page-sticky-left">
            <Link href="/" className="page-back" aria-label="Go back">←</Link>
            <h1 className="page-sticky-title">Development</h1>
            <span className="page-sticky-subtitle">Resume & Projects</span>
          </div>
          <div className="page-sticky-right">
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="page-sticky-btn">
              <IconDownload size={14} />
              Resume
            </a>
            <ThemeToggle />
          </div>
        </div>
        <div className="page-sticky-row-2">
          <a href="#experience" className="page-anchor active">Experience</a>
          <a href="#skills" className="page-anchor">Skills</a>
          <a href="#education" className="page-anchor">Education</a>
          <a href="#projects" className="page-anchor">Projects</a>
        </div>
      </div>

      <main className="dev-page" id="main" ref={ref}>
        <section id="experience">
          <h2 className="section-title reveal">Experience</h2>
          <Timeline entries={resumeData.experience} />
        </section>

        <section className="skills-section" id="skills">
          <h2 className="section-title reveal">Skills</h2>
          {resumeData.skills.map((group) => (
            <div key={group.category} className="skills-group reveal">
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

        <section className="education-section" id="education">
          <h2 className="section-title reveal">Education</h2>
          {resumeData.education.map((edu) => (
            <div key={edu.id} className="education-entry reveal">
              <div className="education-header">
                <div className="education-header-left">
                  {edu.logo && (
                    <Image src={edu.logo} alt={`${edu.school} logo`} className="education-logo" width={32} height={32} />
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

        <section id="projects">
          <h2 className="section-title reveal">Projects</h2>
          <div className="projects-grid">
            {resumeData.projects.map((p) => (
              <ProjectCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
