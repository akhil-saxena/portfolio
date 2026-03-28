"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import ProjectCard from "@/components/ProjectCard";
import { useInView } from "@/hooks/useInView";
import "@/styles/dev.css";

const experience = [
  {
    company: "Brevo",
    role: "Senior Software Engineer",
    period: "Jul 2023 – Present",
    location: "Noida",
    bullets: [
      "Unified settings nav package across 18+ micro-frontend apps (+20% dev velocity)",
      "Migrated login to Next.js, revamped UIs with NAOS design system, 2FA PHP→React (90%+ tests)",
      "RBAC: 40+ permissions, 6 verticals, 1K+ enterprise users",
      "Checkout redesign for 2.5M+ users → 15% conversion uplift",
      "Reduced support tickets 12% via automated domain auth",
      "i18n pipeline: react-intl + Smartling, 6 languages",
      "Led A/B testing + onboarding revamp with Omni dashboards",
    ],
  },
  {
    company: "PharmEasy",
    role: "Software Engineer",
    period: "Nov 2022 – Jun 2023",
    location: "Bengaluru",
    bullets: [
      "Modernized orders page for 4K+ franchises across 4 countries",
      "30% support ticket reduction via receipt generation UIs (React + Redux)",
      "Overhauled 10+ ThyroCare pages",
      "CleverTap integration + client-side recommendation engine",
    ],
  },
  {
    company: "MAQ Software",
    role: "Data Engineer",
    period: "Dec 2021 – Nov 2022",
    location: "Mumbai",
    bullets: [
      "PepsiCo analytics solution (4-person team, <3 months)",
      "Real-time write-back sync for 16K+ stores",
      "Power BI dashboard for 100+ employees across 8+ teams",
      "Pipeline execution time reduced 6x (Power Automate → Azure Data Factory)",
    ],
  },
];

const projects = [
  {
    title: "Momentum",
    description: "Goal tracker with adaptive targets, streaks, badges, widgets, and cloud sync.",
    tech: "Kotlin · Jetpack Compose · Room · Hilt · Material 3",
    badges: [
      { label: "Play Store", href: "#" },
      { label: "GitHub", href: "https://github.com/akhil-saxena/momentum" },
    ],
  },
  {
    title: "TimeShift",
    description: "Right-click timezone converter with NLP parsing, DST-aware.",
    tech: "JavaScript · Chrome APIs",
    badges: [
      { label: "Chrome Web Store", href: "#" },
      { label: "GitHub", href: "https://github.com/akhil-saxena/convert-timezone" },
    ],
  },
  {
    title: "Steganography",
    description: "Hide images inside images via LSB encoding, multithreaded.",
    tech: "C++",
    badges: [
      { label: "GitHub", href: "https://github.com/akhil-saxena/Steganography" },
    ],
  },
];

export default function DevPage() {
  const ref = useInView();

  return (
    <>
      <Nav title="Development" />
      <main className="dev-page" id="main" ref={ref}>
        <header className="dev-header reveal">
          <p className="dev-label">Resume & Portfolio</p>
          <h1 className="dev-title">Development</h1>
        </header>

        <section>
          <h2 className="section-title reveal">Experience</h2>
          <Timeline entries={experience} />
        </section>

        <section className="skills-section">
          <h2 className="section-title reveal">Skills</h2>
          <div className="skills-group reveal">
            <p className="skills-label">Frontend</p>
            <p className="skills-list">React, Next.js, TypeScript, JavaScript (ES6+), Redux, HTML5, CSS3</p>
          </div>
          <div className="skills-group reveal">
            <p className="skills-label">Platform & Experience</p>
            <p className="skills-list">Responsive UI, a11y, i18n, CI/CD, Monitoring, Metabase, Omni</p>
          </div>
        </section>

        <section className="education-section">
          <h2 className="section-title reveal">Education</h2>
          <div className="education-entry reveal">
            <p className="education-school">B.Tech CSE, VIT Vellore</p>
            <p className="education-detail">8.62 CGPA · Jul 2018 – Jun 2022</p>
            <p className="education-extra">Director of Events at SEDS-VIT · Lead at NASA-sponsored CAMS-SETI</p>
          </div>
        </section>

        <section>
          <h2 className="section-title reveal">Projects</h2>
          <div className="projects-grid">
            {projects.map((p, i) => (
              <ProjectCard key={i} {...p} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
