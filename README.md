# Akhil Saxena — Portfolio

Personal portfolio site with photography gallery, resume/projects page, and a WYSIWYG admin panel.

**Live:** [akhilsaxena.pages.dev](https://akhilsaxena.pages.dev)

---

## Features

**Public Site**
- Homepage with gallery preview, dynamic CTAs, and social links
- Photography gallery — masonry layout, category filters, search, immersive lightbox with EXIF data and swipe navigation
- Development page — experience timeline, skill tags, education, project cards with store links
- Light/dark theme with system preference detection
- Self-hosted fonts, responsive images (4 variants), near-100 Lighthouse scores

**Admin Panel** (`/admin`)
- WYSIWYG editor — content area renders the actual site, right-side properties panel for editing
- Drag-and-drop photo reorder in masonry layout
- Inline editing for experience, projects, skills, education
- Visual photo picker for homepage gallery with focal point positioning
- Per-category column layout configuration
- Resume PDF upload
- Save & Deploy — commits changes to GitHub, triggers Cloudflare Pages rebuild
- Protected by Cloudflare Access (email-code authentication)

**Image Pipeline**
- Upload via admin → GitHub Action processes with sharp
- 4 responsive variants (2000px, 1200px, 800px, 400px) + 40px blur placeholder
- Watermark on served variants, clean originals stored privately on R2
- EXIF extraction (camera, lens, aperture, shutter, ISO, focal length)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS with CSS variables (light/dark themes) |
| Fonts | DM Sans, DM Mono, Libre Baskerville (self-hosted woff2) |
| Hosting | Cloudflare Pages |
| Images | Cloudflare R2 (S3-compatible) |
| Image Processing | sharp (resize, WebP, watermark) |
| Drag & Drop | @atlaskit/pragmatic-drag-and-drop |
| Touch Gestures | react-swipeable |
| Auth | Cloudflare Access (Zero Trust) |
| CI/CD | GitHub Actions + Cloudflare Pages auto-deploy |

---

## Architecture

```
akhilsaxena.pages.dev
├── /                    → Homepage
├── /photography         → Masonry gallery with filters, search, lightbox
├── /dev                 → Resume timeline, skills, projects
├── /admin               → WYSIWYG editor (protected)
└── /api/*               → Edge API routes

Cloudflare R2
├── /photos/             → Watermarked variants (original, lg, md, sm)
└── /private/            → Clean originals

Data (JSON in repo)
├── portfolio_images.json → Photo manifest
├── resume.json           → Resume content
├── home_config.json      → Homepage configuration
└── site_config.json      → Layout settings
```

---

## Design System

The visual language is being extracted into **@inkpaper** — a standalone design system with tokens, React components, and icon library.

---

## License

© 2026 Akhil Saxena. All rights reserved.
