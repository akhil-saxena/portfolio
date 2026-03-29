# Admin Panel Plan 1: Data Extraction & Icon Library

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract hardcoded resume data into `data/resume.json`, update the dev page to import from it, and create a shared SVG icon library used by both the main site and future admin panel.

**Architecture:** Move all experience, projects, skills, and education data from `src/app/dev/page.tsx` into `data/resume.json` matching the spec schema (with optional logo, url, icon fields). Create `src/components/icons.tsx` centralizing all SVG icons. Update existing components to use the icon library instead of inline SVGs.

**Tech Stack:** Next.js 15, TypeScript, JSON.

---

## File Structure

```
data/
├── portfolio_images.json          ← existing, no change
└── resume.json                    ← NEW: extracted resume data

src/
├── components/
│   ├── icons.tsx                  ← NEW: shared SVG icon library
│   ├── Timeline.tsx               ← MODIFY: add logo, url support
│   ├── ProjectCard.tsx            ← MODIFY: use icons.tsx, structured label
│   ├── ThemeToggle.tsx            ← MODIFY: use icons.tsx
│   ├── Footer.tsx                 ← MODIFY: use icons.tsx
│   └── Nav.tsx                    ← no change
├── app/
│   ├── page.tsx                   ← MODIFY: use icons.tsx for social links
│   └── dev/
│       └── page.tsx               ← MODIFY: import from resume.json
└── styles/
    └── dev.css                    ← MODIFY: add logo styles
```

---

## Chunk 1: Data Extraction + Icon Library

### Task 1: Create `data/resume.json`

**Files:**
- Create: `data/resume.json`

- [ ] **Step 1: Create the resume JSON file**

Create `data/resume.json` with all current data from `src/app/dev/page.tsx`, restructured to match the spec schema:

```json
{
  "experience": [
    {
      "id": "brevo",
      "company": "Brevo (Formerly Sendinblue)",
      "role": "Senior Software Engineer",
      "period": "Jul 2023 – Present",
      "location": "Noida",
      "logo": null,
      "url": "https://www.brevo.com",
      "bullets": [
        "Engineered a unified settings navigation package adopted across <strong>18+ micro-frontend apps</strong>, accelerating development cycles by <strong>20%</strong>",
        "Migrated login to Next.js, revamped UIs with NAOS design system; migrated 2FA from PHP Twig to React with <strong>90%+ test coverage</strong>",
        "Redesigned checkout for <strong>2.5M+ users</strong> to a 3-step flow, leading to <strong>15% conversion uplift</strong>",
        "Reduced support tickets by <strong>12%</strong> in the senders module (<strong>10K+ weekly users</strong>) via automated domain authentication",
        "Led A/B testing and onboarding revamp with address autosuggest, building FE/BE systems with Omni dashboards"
      ]
    },
    {
      "id": "pharmeasy",
      "company": "PharmEasy",
      "role": "Software Engineer",
      "period": "Nov 2022 – Jun 2023",
      "location": "Bengaluru",
      "logo": null,
      "url": null,
      "bullets": [
        "Modernized orders page for the B2B portal, enhancing productivity for <strong>4K+ franchises</strong> across <strong>4 countries</strong>",
        "Achieved <strong>30% decrease</strong> in support ticket volume by developing receipt generation UIs with React and Redux",
        "Delivered a client-side recommendation system leveraging a proprietary rule engine for product upsell and cross-sell",
        "Integrated CleverTap into ThyroNext for real-time analytics, driving retention and engagement"
      ]
    },
    {
      "id": "maq",
      "company": "MAQ Software",
      "role": "Data Engineer",
      "period": "Dec 2021 – Nov 2022",
      "location": "Mumbai",
      "logo": null,
      "url": null,
      "bullets": [
        "Led data modeling in a 4-member team, delivering an analytics solution for PepsiCo North America in <strong>under 3 months</strong>",
        "Built a real-time write-back sync system for a live app deployed to <strong>16K+ stores</strong>",
        "Automated reporting across <strong>8+ teams</strong> by developing a real-time Power BI dashboard used by <strong>100+ employees</strong>",
        "Reduced pipeline execution time by <strong>6×</strong> by replacing Power Automate with Azure Data Factory"
      ]
    }
  ],
  "projects": [
    {
      "id": "momentum",
      "title": "Momentum",
      "label": {
        "text": "Android App",
        "icon": "android"
      },
      "description": "Goal tracker with adaptive daily targets, streaks, milestones, badges, home screen widgets, and cloud sync.",
      "tech": ["Kotlin", "Jetpack Compose", "Room", "Hilt", "Material 3"],
      "icon": "/assets/momentum-icon.png",
      "href": "https://github.com/akhil-saxena/momentum-android",
      "badges": [
        { "label": "Play Store", "href": "#", "icon": "play-store" },
        { "label": "GitHub", "href": "https://github.com/akhil-saxena/momentum-android", "icon": "github" }
      ]
    },
    {
      "id": "timeshift",
      "title": "TimeShift",
      "label": {
        "text": "Chrome Extension",
        "icon": "chrome"
      },
      "description": "Right-click any time on the web to convert it instantly. NLP-powered parsing with smart timezone disambiguation and DST awareness.",
      "tech": ["JavaScript", "Chrome APIs", "NLP"],
      "icon": "/assets/timeshift-icon.png",
      "href": "https://github.com/akhil-saxena/convert-timezone",
      "badges": [
        { "label": "Chrome Store", "href": "#", "icon": "chrome-store" },
        { "label": "GitHub", "href": "https://github.com/akhil-saxena/convert-timezone", "icon": "github" }
      ]
    },
    {
      "id": "steganography",
      "title": "Steganography",
      "label": {
        "text": "CLI Tool",
        "icon": "terminal"
      },
      "description": "Hide images inside images using LSB encoding. Supports multithreaded encode/decode, verbose mode, and lossless output.",
      "tech": ["C++", "Multithreading", "Image Processing"],
      "icon": null,
      "href": "https://github.com/akhil-saxena/Steganography",
      "badges": [
        { "label": "GitHub", "href": "https://github.com/akhil-saxena/Steganography", "icon": "github" }
      ]
    }
  ],
  "skills": [
    {
      "category": "Frontend",
      "icon": "code",
      "items": ["React", "Next.js", "TypeScript", "JavaScript", "Redux", "HTML5", "CSS3"]
    },
    {
      "category": "Platform & Experience",
      "icon": "layers",
      "items": ["Responsive UI", "a11y", "i18n", "CI/CD", "Monitoring", "Metabase", "Omni"]
    }
  ],
  "education": [
    {
      "id": "vit",
      "school": "Vellore Institute of Technology (VIT), Vellore",
      "logo": null,
      "degree": "B.Tech, Computer Science & Engineering",
      "cgpa": "8.62",
      "period": "Jul 2018 – Jun 2022",
      "url": null,
      "leadership": [
        "Director of Events, SEDS-VIT",
        "Lead, NASA-sponsored CAMS-SETI"
      ]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add data/resume.json
git commit -m "feat: create resume.json with extracted dev page data"
```

---

### Task 2: Create shared icon library

**Files:**
- Create: `src/components/icons.tsx`

- [ ] **Step 1: Create the icon library**

Create `src/components/icons.tsx` with all SVG icons used across the site, plus icons needed for the admin panel and project labels. Each icon is a React component accepting `width`, `height`, and `className` props. Also export an `iconMap` for string-based lookups.

```tsx
import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function makeIcon(children: React.ReactNode, defaultFill?: "currentColor") {
  return function Icon({ size = 16, width, height, ...props }: IconProps) {
    return (
      <svg
        width={width ?? size}
        height={height ?? size}
        viewBox="0 0 24 24"
        fill={defaultFill === "currentColor" ? "currentColor" : "none"}
        stroke={defaultFill === "currentColor" ? "none" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

// ===== Navigation & UI =====
export const IconMoon = makeIcon(<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />);
export const IconSun = makeIcon(<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>);
export const IconArrowUpRight = makeIcon(<path d="M7 17L17 7M17 7H7M17 7v10" />);
export const IconDownload = makeIcon(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>);
export const IconUpload = makeIcon(<><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>);
export const IconPlus = makeIcon(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
export const IconEdit = makeIcon(<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>);
export const IconDots = makeIcon(<><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>);
export const IconFilter = makeIcon(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />);
export const IconEye = makeIcon(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>);

// ===== Sidebar / Section =====
export const IconImage = makeIcon(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>);
export const IconBriefcase = makeIcon(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></>);
export const IconBook = makeIcon(<><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>);
export const IconCode = makeIcon(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>);
export const IconGraduationCap = makeIcon(<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></>);
export const IconLayers = makeIcon(<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>);
export const IconTerminal = makeIcon(<><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>);

// ===== Social =====
export const IconGitHub = makeIcon(<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />, "currentColor");
export const IconLinkedIn = makeIcon(<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />, "currentColor");
export const IconMail = makeIcon(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></>);

// ===== Platform / Store =====
export const IconPlayStore = makeIcon(<path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 010 2.594zM1.337.924a1.486 1.486 0 00-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 00-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />, "currentColor");
export const IconChromeStore = makeIcon(<path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0112 6.545h10.691A12 12 0 0012 0zM1.931 5.47A11.943 11.943 0 000 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 01-6.865-2.29zm13.342 2.166a5.446 5.446 0 011.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 110-8.728 4.364 4.364 0 010 8.728Z" />, "currentColor");
export const IconAndroid = makeIcon(<path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 00-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 00-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 00-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" />, "currentColor");
// Note: IconChrome uses the same logo as IconChromeStore — they are the same brand.
// If a distinct icon is needed later, replace with a browser-window SVG.
export const IconChrome = IconChromeStore;

// ===== Icon map for string-based lookups (used by admin, project labels, etc.) =====
export const iconMap: Record<string, React.ComponentType<IconProps>> = {
  "moon": IconMoon,
  "sun": IconSun,
  "arrow-up-right": IconArrowUpRight,
  "download": IconDownload,
  "upload": IconUpload,
  "plus": IconPlus,
  "edit": IconEdit,
  "dots": IconDots,
  "filter": IconFilter,
  "eye": IconEye,
  "image": IconImage,
  "briefcase": IconBriefcase,
  "book": IconBook,
  "code": IconCode,
  "graduation-cap": IconGraduationCap,
  "layers": IconLayers,
  "terminal": IconTerminal,
  "github": IconGitHub,
  "linkedin": IconLinkedIn,
  "mail": IconMail,
  "play-store": IconPlayStore,
  "chrome-store": IconChromeStore,
  "android": IconAndroid,
  "chrome": IconChrome,
};

// Helper to get icon by string name
export function getIcon(name: string, props?: IconProps) {
  const Component = iconMap[name];
  if (!Component) return null;
  return <Component {...props} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/icons.tsx
git commit -m "feat: create shared SVG icon library with string-based lookups"
```

---

### Task 3: Update ThemeToggle to use icon library

**Files:**
- Modify: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Replace inline SVGs with icon imports**

Replace `src/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current || "light");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="theme-toggle"
    >
      {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
    </button>
  );
}
```

Note: The icon strokeWidth changes from 2 to 1.5 — this is intentional, aligning with the site-wide "1.5px stroke, round caps" icon system defined in the spec.

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "refactor: use icon library in ThemeToggle"
```

---

### Task 4: Update Footer to use icon library

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Replace inline SVGs with icon imports**

Replace `src/components/Footer.tsx`:

```tsx
import { IconGitHub, IconLinkedIn, IconMail } from "./icons";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-social">
        <a href="https://github.com/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <IconGitHub size={20} />
        </a>
        <a href="https://www.linkedin.com/in/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <IconLinkedIn size={20} />
        </a>
        <a href="mailto:saxena.akhil42@gmail.com" aria-label="Email">
          <IconMail size={20} />
        </a>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} Akhil Saxena</p>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "refactor: use icon library in Footer"
```

---

### Task 5: Update homepage to use icon library

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace inline SVGs with icon imports**

In `src/app/page.tsx`, replace the inline SVGs in the `home-social` section with `<IconGitHub size={18} />`, `<IconLinkedIn size={18} />`, `<IconMail size={18} />`. Add import at top:

```tsx
import { IconGitHub, IconLinkedIn, IconMail } from "@/components/icons";
```

Replace each `<svg>...</svg>` inside the social links with the corresponding icon component.

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: use icon library in homepage social links"
```

---

### Task 6: Update ProjectCard to use icon library and structured label

**Files:**
- Modify: `src/components/ProjectCard.tsx`

- [ ] **Step 1: Rewrite ProjectCard with icon library**

Replace `src/components/ProjectCard.tsx`:

```tsx
import { IconArrowUpRight, getIcon } from "./icons";

interface ProjectCardProps {
  title: string;
  label: string | { text: string; icon: string };
  description: string;
  tech: string[];
  icon?: string | null;
  badges: { label: string; href: string; icon: string }[];
  href: string;
}

export default function ProjectCard({ title, label, description, tech, icon, badges, href }: ProjectCardProps) {
  const labelText = typeof label === "string" ? label : label.text;
  const labelIcon = typeof label === "string" ? null : label.icon;

  return (
    <div className="project-card reveal">
      <a href={href} target="_blank" rel="noopener noreferrer" className="pc-arrow" aria-label={`View ${title}`}>
        <IconArrowUpRight size={18} />
      </a>
      <div className="pc-top">
        <div className="pc-logo">
          {icon ? (
            <img src={icon} alt={`${title} icon`} width={48} height={48} />
          ) : (
            getIcon("code", { size: 24, className: "pc-logo-fallback" })
          )}
        </div>
        <div>
          <p className="pc-label">
            {labelIcon && getIcon(labelIcon, { size: 12 })}
            {labelText}
          </p>
          <h3 className="pc-name">{title}</h3>
        </div>
      </div>
      <p className="pc-desc">{description}</p>
      <div className="pc-stack">
        {tech.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="pc-stores">
        {badges.map((badge, i) => (
          <a key={i} href={badge.href} target="_blank" rel="noopener noreferrer" className="pc-store">
            {getIcon(badge.icon, { size: 14 })}
            {badge.label}
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add label icon styling to dev.css**

In `src/styles/dev.css`, update `.pc-label` to support the inline icon:

```css
.pc-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 0.125rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectCard.tsx src/styles/dev.css
git commit -m "refactor: use icon library in ProjectCard, support structured labels"
```

---

### Task 7: Update Timeline to support logo and url fields

**Files:**
- Modify: `src/components/Timeline.tsx`
- Modify: `src/styles/dev.css`

- [ ] **Step 1: Update Timeline interface and rendering**

Replace `src/components/Timeline.tsx`:

```tsx
interface TimelineEntry {
  id?: string;
  company: string;
  role: string;
  period: string;
  location: string;
  logo?: string | null;
  url?: string | null;
  bullets: string[];
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export default function Timeline({ entries }: TimelineProps) {
  return (
    <div className="timeline">
      {entries.map((entry, i) => (
        <div key={entry.id || i} className="timeline-entry reveal">
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
                      <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.company}</a>
                    ) : (
                      entry.company
                    )}
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
              {entry.bullets.map((bullet, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: bullet }} />
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add timeline logo styles to dev.css**

Add to `src/styles/dev.css`:

```css
.timeline-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.timeline-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.timeline-company a {
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s;
}

.timeline-company a:hover {
  opacity: 0.7;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.tsx src/styles/dev.css
git commit -m "feat: add logo and url support to Timeline component"
```

---

### Task 8: Update dev page to import from resume.json

**Files:**
- Modify: `src/app/dev/page.tsx`

- [ ] **Step 1: Replace hardcoded data with JSON import**

Replace `src/app/dev/page.tsx`. Remove all the hardcoded `experience`, `projects` arrays and inline skills/education. Import from `resume.json` instead:

```tsx
"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Timeline from "@/components/Timeline";
import ProjectCard from "@/components/ProjectCard";
import { useInView } from "@/hooks/useInView";
import { IconDownload } from "@/components/icons";
import { getIcon } from "@/components/icons";
import resumeData from "../../../data/resume.json";
import "@/styles/dev.css";

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
                    <img src={edu.logo} alt={`${edu.school} logo`} className="education-logo" width={32} height={32} />
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
```

- [ ] **Step 2: Add education logo and skills label icon styles to dev.css**

Add these NEW rules to `src/styles/dev.css`:

```css
.education-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.education-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.education-school a {
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s;
}

.education-school a:hover {
  opacity: 0.7;
}
```

Then MODIFY the existing `.skills-label` rule (do NOT create a new one). Find the existing rule and add three properties to it:

```css
/* EXISTING rule — add display, align-items, gap to it */
.skills-label {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ink);
  margin-bottom: 0.25rem;
  /* ADD these three: */
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

- [ ] **Step 3: Verify the project compiles and the dev page renders**

```bash
npx tsc --noEmit
npm run dev
```

Navigate to `/dev`. Expected: same page as before, but data loaded from JSON. All existing styling preserved. Logos are null so they don't render yet.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dev/page.tsx src/styles/dev.css
git commit -m "refactor: dev page imports from resume.json instead of hardcoded data"
```

---

## Summary

| Task | What it does | Files |
|------|-------------|-------|
| 1 | Create resume.json | `data/resume.json` |
| 2 | Create icon library | `src/components/icons.tsx` |
| 3 | Update ThemeToggle | `src/components/ThemeToggle.tsx` |
| 4 | Update Footer | `src/components/Footer.tsx` |
| 5 | Update Homepage | `src/app/page.tsx` |
| 6 | Update ProjectCard | `src/components/ProjectCard.tsx`, `src/styles/dev.css` |
| 7 | Update Timeline | `src/components/Timeline.tsx`, `src/styles/dev.css` |
| 8 | Update dev page | `src/app/dev/page.tsx`, `src/styles/dev.css` |

After this plan, the codebase has:
- All resume data in `data/resume.json` (editable by future admin panel)
- A shared icon library in `src/components/icons.tsx` (usable by admin panel)
- All components using centralized icons instead of inline SVGs
- Timeline and ProjectCard supporting optional logos, urls, and structured labels
