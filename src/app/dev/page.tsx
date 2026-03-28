"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import ProjectCard from "@/components/ProjectCard";
import { useInView } from "@/hooks/useInView";
import "@/styles/dev.css";

const experience = [
  {
    company: "Brevo (Formerly Sendinblue)",
    role: "Senior Software Engineer",
    period: "Jul 2023 – Present",
    location: "Noida",
    bullets: [
      "Engineered a unified settings navigation package adopted across <strong>18+ micro-frontend apps</strong>, accelerating development cycles by <strong>20%</strong>",
      "Migrated login to Next.js, revamped UIs with NAOS design system; migrated 2FA from PHP Twig to React with <strong>90%+ test coverage</strong>",
      "Redesigned checkout for <strong>2.5M+ users</strong> to a 3-step flow, leading to <strong>15% conversion uplift</strong>",
      "Reduced support tickets by <strong>12%</strong> in the senders module (<strong>10K+ weekly users</strong>) via automated domain authentication",
      "Led A/B testing and onboarding revamp with address autosuggest, building FE/BE systems with Omni dashboards",
    ],
  },
  {
    company: "PharmEasy",
    role: "Software Engineer",
    period: "Nov 2022 – Jun 2023",
    location: "Bengaluru",
    bullets: [
      "Modernized orders page for the B2B portal, enhancing productivity for <strong>4K+ franchises</strong> across <strong>4 countries</strong>",
      "Achieved <strong>30% decrease</strong> in support ticket volume by developing receipt generation UIs with React and Redux",
      "Delivered a client-side recommendation system leveraging a proprietary rule engine for product upsell and cross-sell",
      "Integrated CleverTap into ThyroNext for real-time analytics, driving retention and engagement",
    ],
  },
  {
    company: "MAQ Software",
    role: "Data Engineer",
    period: "Dec 2021 – Nov 2022",
    location: "Mumbai",
    bullets: [
      "Led data modeling in a 4-member team, delivering an analytics solution for PepsiCo North America in <strong>under 3 months</strong>",
      "Built a real-time write-back sync system for a live app deployed to <strong>16K+ stores</strong>",
      "Automated reporting across <strong>8+ teams</strong> by developing a real-time Power BI dashboard used by <strong>100+ employees</strong>",
      "Reduced pipeline execution time by <strong>6×</strong> by replacing Power Automate with Azure Data Factory",
    ],
  },
  {
    company: "AMTDC, IIT Madras",
    role: "Full Stack Developer",
    period: "Jul 2020 – Sep 2020",
    location: "Chennai",
    bullets: [
      "Developed 'Kite' website in <strong>2 months</strong> using Django, hosted on IIT Madras server",
      "Designed UI in collaboration with TCS and IIT Madras for an industry-academia platform",
    ],
  },
];

const projects = [
  {
    title: "Momentum",
    description: "Goal tracker with adaptive targets, streaks, badges, widgets, and cloud sync.",
    tech: "Kotlin · Jetpack Compose · Room · Hilt · Material 3",
    icon: "🎯",
    badges: [
      { label: "Play Store", href: "#" },
      { label: "GitHub", href: "https://github.com/akhil-saxena/momentum" },
    ],
  },
  {
    title: "TimeShift",
    description: "Right-click timezone converter with NLP parsing, DST-aware.",
    tech: "JavaScript · Chrome APIs",
    icon: "🕐",
    badges: [
      { label: "Chrome Web Store", href: "#" },
      { label: "GitHub", href: "https://github.com/akhil-saxena/convert-timezone" },
    ],
  },
  {
    title: "Steganography",
    description: "Hide images inside images via LSB encoding, multithreaded.",
    tech: "C++",
    icon: "🔐",
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
          <div className="dev-header-row">
            <h1 className="dev-title">Development</h1>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="resume-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Resume
            </a>
          </div>
        </header>

        <section>
          <h2 className="section-title reveal">Experience</h2>
          <Timeline entries={experience} />
        </section>

        <section className="skills-section">
          <h2 className="section-title reveal">Skills</h2>
          <div className="skills-group reveal">
            <p className="skills-label">Frontend</p>
            <div className="skills-tags">
              {["React", "Next.js", "TypeScript", "JavaScript", "Redux", "HTML5", "CSS3"].map((s) => (
                <span key={s} className="skill-tag">{s}</span>
              ))}
            </div>
          </div>
          <div className="skills-group reveal">
            <p className="skills-label">Platform & Experience</p>
            <div className="skills-tags">
              {["Responsive UI", "a11y", "i18n", "CI/CD", "Monitoring", "Metabase", "Omni"].map((s) => (
                <span key={s} className="skill-tag">{s}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="education-section">
          <h2 className="section-title reveal">Education</h2>
          <div className="education-entry reveal">
            <div className="education-header">
              <p className="education-school">Vellore Institute of Technology (VIT), Vellore</p>
              <span className="education-period">Jul 2018 – Jun 2022</span>
            </div>
            <p className="education-detail">B.Tech, Computer Science & Engineering · 8.62 CGPA</p>
            <div className="education-leadership">
              <span className="education-badge">Director of Events, SEDS-VIT</span>
              <span className="education-badge">Lead, NASA-sponsored CAMS-SETI</span>
            </div>
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
