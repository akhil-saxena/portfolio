// Canonical data model — mirrors the JSON in `data/` (the source of truth).
// Consumers should import these rather than re-deriving shapes or casting.
//
// NOTE: the /admin editor (src/app/admin/page.tsx, components/admin/PropertiesPanel.tsx)
// still defines its own local copies that have drifted from these (e.g. it splits
// experience dates into startMonth/startYear/... while resume.json stores a single
// `period` string). When the admin is rebuilt, point it at these types.

// ── Photos (data/portfolio_images.json) ──────────────────────────────────────

export interface PhotoExif {
  camera: string | null;
  lens: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
  focalLength: string | null;
}

export interface PhotoUrls {
  original: string;
  large: string;
  medium: string;
  small: string;
  /** base64 LQIP data URI used as a blur placeholder */
  thumb: string;
}

export interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  /** ISO date (YYYY-MM-DD) the photo was taken/added */
  date?: string;
  urls: PhotoUrls;
  exif?: PhotoExif;
  order: number;
  dimensions?: { width: number; height: number };
}

// ── Resume (data/resume.json) ────────────────────────────────────────────────

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  /** Free-text range, e.g. "Jul 2023 – Present" */
  period: string;
  location?: string;
  logo?: string | null;
  url?: string | null;
  /** Bullet strings; may contain inline <strong> markup (author-controlled) */
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  period: string;
  cgpa?: string;
  logo?: string | null;
  url?: string | null;
  leadership?: string[];
}

export interface ProjectBadge {
  label: string;
  href?: string;
  icon?: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  label?: { text: string; icon?: string };
  description: string;
  tech: string[];
  icon?: string | null;
  href?: string;
  badges?: ProjectBadge[];
}

export interface SkillGroup {
  category: string;
  icon?: string;
  items: string[];
}

export interface ResumeData {
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  education: EducationEntry[];
}
