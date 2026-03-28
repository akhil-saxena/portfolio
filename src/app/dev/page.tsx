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
      "Engineered a unified, responsive settings navigation package adopted across 18+ micro-frontend and non-micro-frontend apps, accelerating development cycles by 20%",
      "Migrated login to Next.js, revamped user-management, senders & domains management UIs using the NAOS design system; migrated 2FA modules from PHP Twig to React with 90%+ unit test coverage",
      "Introduced RBAC with 40+ permissions spanning 6 business verticals, scaling access control for 1K+ enterprise users",
      "Redesigned a one-page checkout for 2.5M+ self-service users to a 3-step flow, leading to 15% conversion uplift",
      "Reduced support tickets by 12% in the high-traffic senders module (10K+ weekly users) via automated domain authentication with Domain Connect & Entri",
      "Implemented i18n pipeline with react-intl and Smartling to localize apps in 6 languages",
      "Integrated Sniper Links into signup emails, boosting engagement across platforms for 5M+ annual signups",
      "Led A/B testing and end-to-end revamp of onboarding with address autosuggest, building FE/BE systems with logging and Omni dashboards",
      "Recognized 6 times for driving critical initiatives, mentoring teammates, and delivering high-impact features under tight deadlines",
    ],
  },
  {
    company: "PharmEasy",
    role: "Software Engineer",
    period: "Nov 2022 – Jun 2023",
    location: "Bengaluru",
    bullets: [
      "Modernized the orders page for the B2B portal, enhancing productivity for 4K+ franchises across 4 countries",
      "Achieved a 30% decrease in support ticket volume by developing UIs for receipt generation and edit feature using React and Redux",
      "Overhauled 10+ pages on the ThyroCare consumer site to improve UI/UX and user engagement",
      "Integrated CleverTap into ThyroNext platform to enable real-time analytics, driving retention and engagement",
      "Delivered a client-side recommendation system leveraging a proprietary rule engine to enable product upsell and cross-sell",
    ],
  },
  {
    company: "MAQ Software",
    role: "Data Engineer",
    period: "Dec 2021 – Nov 2022",
    location: "Mumbai",
    bullets: [
      "Led SQL scripting and data modeling in a 4-member team, delivering an analytics solution for PepsiCo North America in under 3 months",
      "Built a real-time write-back sync system for a live app deployed to 16K+ stores across North America",
      "Automated tracking and reporting across 8+ teams (60+ members) in 4 offices by developing a real-time Power BI dashboard used by 100+ employees",
      "Reduced pipeline execution time by 6× by replacing Power Automate workflows with Azure Data Factory",
    ],
  },
  {
    company: "AMTDC, IIT Madras",
    role: "Full Stack Developer",
    period: "Jul 2020 – Sep 2020",
    location: "Chennai",
    bullets: [
      "Designed UI for the platform in collaboration with industry and academia from TCS and IIT Madras",
      "Developed 'Kite' website in 2 months using Django framework, hosted on IIT Madras server",
      "Facilitated communication between industry and academia to understand market requirements",
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
