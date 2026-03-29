"use client";

import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import ProjectCard from "@/components/ProjectCard";
import { useInView } from "@/hooks/useInView";
import { IconDownload, getIcon } from "@/components/icons";
import resumeData from "../../../data/resume.json";
import "@/styles/dev.css";

export default function DevPage() {
  const ref = useInView();

  return (
    <>
      <Nav title="Development" />
      <main className="dev-page" id="main" ref={ref}>
        <header className="dev-header reveal">
          <p className="dev-label">Resume & Projects</p>
          <div className="dev-header-row">
            <h1 className="dev-title">Development</h1>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="resume-btn">
              <IconDownload size={16} />
              Resume
            </a>
          </div>
        </header>

        <section>
          <h2 className="section-title reveal">Experience</h2>
          <Timeline entries={resumeData.experience} />
        </section>

        <section className="skills-section">
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

        <section className="education-section">
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

        <section>
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
