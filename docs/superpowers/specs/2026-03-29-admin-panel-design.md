# Admin Panel — Design Specification

## Overview

A visual admin editor at `/admin` for managing photos and resume content on the portfolio site. Edits are previewed in-browser, then committed to GitHub via API which triggers a Cloudflare Pages rebuild. Photos are uploaded to R2 temp storage and processed by a GitHub Action (sharp pipeline with watermark). The admin uses the same design tokens, typography, and component patterns as the main site.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Admin Panel (/admin)            │
│                                                  │
│  Sidebar: Photos | Experience | Projects |       │
│           Skills | Education | Preview | Deploy  │
│                                                  │
│  Content: Section-specific editor                │
│  State: Draft data held in React state           │
└──────────┬──────────────┬────────────────────────┘
           │              │
     Photo upload    Save & Deploy
           │              │
           ▼              ▼
  ┌─────────────────┐  ┌──────────────────┐
  │  CF Pages Func  │  │  CF Pages Func   │
  │  /api/upload    │  │  /api/deploy     │
  │  → R2 temp/     │  │  → GitHub API    │
  └────────┬────────┘  │  → commit JSON   │
           │           └──────────────────┘
           ▼                    │
  ┌─────────────────┐          ▼
  │  CF Pages Func  │  ┌──────────────────┐
  │  /api/dispatch  │  │ Cloudflare Pages  │
  │  → GitHub API   │  │ auto-rebuilds    │
  │  → workflow_    │  └──────────────────┘
  │    dispatch     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  GitHub Action   │
  │  - Download from │
  │    R2 temp       │
  │  - sharp resize  │
  │  - Watermark     │
  │  - Upload to R2  │
  │  - Update JSON   │
  │  - Commit        │
  └──────────────────┘
```

---

## Authentication

Cloudflare Access — email-code login.

- Configured in CF dashboard, zero auth code
- **Two Access policies on the CF Pages project** (not Worker routes):
  - Policy 1: Path `/admin` — allow email `saxena.akhil42@gmail.com`
  - Policy 2: Path `/api/*` — allow email `saxena.akhil42@gmail.com`
- Both policies must be configured to ensure API endpoints are not publicly accessible
- Session duration: configurable (default 24h)
- The existing `/api/track` endpoint (analytics) must be excluded from Access — it's called by unauthenticated visitors. Use a bypass rule for `POST /api/track` specifically.

---

## Data Model

### `data/portfolio_images.json`

No schema change. Existing structure:

```json
{
  "id": "category-slug",
  "title": "Photo Title",
  "category": "architecture",
  "tags": ["tag1", "tag2"],
  "date": "2026-03-29",
  "exif": {
    "camera": "string | null",
    "lens": "string | null",
    "aperture": "string | null",
    "shutter": "string | null",
    "iso": "number | null",
    "focalLength": "string | null"
  },
  "urls": {
    "original": "https://pub-<hash>.r2.dev/photos/<category>/<slug>.webp",
    "medium": "https://pub-<hash>.r2.dev/photos/<category>/<slug>-md.webp",
    "thumb": "data:image/webp;base64,..."
  },
  "order": 1
}
```

### `data/resume.json` (new)

```json
{
  "experience": [
    {
      "id": "brevo",
      "company": "Brevo (Formerly Sendinblue)",
      "role": "Senior Software Engineer",
      "period": "Jul 2023 – Present",
      "location": "Noida",
      "logo": "/assets/logos/brevo.png",
      "url": "https://www.brevo.com",
      "bullets": [
        "Engineered a unified settings navigation package adopted across <strong>18+ micro-frontend apps</strong>, accelerating development cycles by <strong>20%</strong>"
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
      "logo": "/assets/logos/vit.png",
      "degree": "B.Tech, Computer Science & Engineering",
      "cgpa": "8.62",
      "period": "Jul 2018 – Jun 2022",
      "url": "https://vit.ac.in",
      "leadership": [
        "Director of Events, SEDS-VIT",
        "Lead, NASA-sponsored CAMS-SETI"
      ]
    }
  ]
}
```

**All visual fields are optional.** `logo`, `icon`, `url` — if absent, the component simply doesn't render them.

**`period` fields are free-text strings** (e.g. "Jul 2023 – Present"). The admin renders them as plain text inputs, not date pickers. This matches the existing site rendering and avoids unnecessary date formatting logic.

**The dev page (`src/app/dev/page.tsx`) imports from `data/resume.json`** instead of hardcoded arrays.

---

## API Endpoints (CF Pages Functions)

### `GET /api/data`

Fetches current data files from GitHub Contents API (authenticated, always fresh — no CDN caching).

**Endpoint used:** `api.github.com/repos/{owner}/{repo}/contents/{path}` with `Accept: application/vnd.github.raw+json` header.

**Response:**
```json
{
  "photos": [ ... ],
  "resume": { ... },
  "commitSha": "abc123def456..."
}
```

The `commitSha` field returns the current HEAD SHA of the `main` branch at fetch time. The admin stores this and sends it as `baseSha` with deploy requests. The deploy function uses the Git tree/blob/commit API flow (not the single-file Contents API), so per-file SHAs are not needed — the `commitSha` serves as the base for the new commit.

### `POST /api/upload`

Receives a raw image file, uploads to R2 temp path.

**Request:** `multipart/form-data` with image file
**Response:** `{ "tempKey": "temp/1711720000-filename.jpg" }`

### `POST /api/upload-asset`

Receives a logo/icon image, resizes to 96x96, uploads to R2 `/assets/` path.

**Request:** `multipart/form-data` with image file + `path` field (e.g. `logos/brevo.png`)
**Response:** `{ "url": "https://pub-<hash>.r2.dev/assets/logos/brevo.png" }`

Used for experience logos, education logos, and project icons. Small images, no watermark, no variants — just resize and upload directly.

### `POST /api/dispatch`

Triggers GitHub Action via `workflow_dispatch` with photo metadata.

**Request:**
```json
{
  "tempKey": "temp/1711720000-filename.jpg",
  "title": "Hawa Mahal",
  "category": "architecture",
  "tags": ["rajasthan", "jaipur"]
}
```

**Response:** `{ "runId": 12345 }`

**Action polling:** After receiving `runId`, the admin polls `GET https://api.github.com/repos/{owner}/{repo}/actions/runs/{runId}` every 5 seconds. Display states:
- `queued` / `in_progress` → "Processing..." with spinner
- `completed` + `conclusion: success` → "Done" → auto-refresh data via `GET /api/data`
- `completed` + `conclusion: failure` → "Processing failed — check Actions log" with retry button

**Concurrency guard:** The admin UI disables "Save & Deploy" while any photo dispatch is in-flight. Conversely, "Upload Photo" is disabled while a deploy is in-flight. This prevents race conditions where both try to commit `portfolio_images.json` simultaneously.

### `POST /api/deploy`

Commits updated JSON file(s) to GitHub via Contents API (tree/blob/commit flow for multi-file atomic commits).

**Request:**
```json
{
  "files": {
    "data/portfolio_images.json": "{ ... }",
    "data/resume.json": "{ ... }"
  },
  "baseSha": "main-branch-head-sha",
  "message": "chore: update portfolio data via admin"
}
```

The `baseSha` is the commit SHA of `main` at the time data was loaded. If `main` has moved (e.g. a photo Action committed), the deploy function fetches the latest SHAs and merges — or rejects with a 409 if there's a true conflict. The admin then re-fetches data and shows a "Data was updated externally — please review and try again" message.

**Response:** `{ "sha": "abc123", "status": "committed" }`

### Environment Variables (CF Pages)

- `GITHUB_PAT` — fine-grained PAT with `contents: write` + `actions: write` on `portfolio` repo
- `GITHUB_REPO` — `akhil-saxena/portfolio`
- R2 binding: `PORTFOLIO_BUCKET` (for upload and upload-asset functions)

---

## Admin UI

### Layout

Sidebar navigation (persistent) + content area. Uses the site's CSS variables and component patterns.

**Sidebar items:**
| Section | Icon (stroke SVG) |
|---------|------------------|
| Photos | image/landscape |
| Experience | briefcase |
| Projects | book/pages |
| Skills | code brackets |
| Education | graduation cap |
| Preview | eye |
| Save & Deploy | upload arrow |

Active item: `var(--ink)` background, `var(--bg)` text.
Inactive: `var(--ink-muted)` text.
Sidebar background: `var(--surface)`.
Border: `var(--border)`.

Dark mode: same `data-theme="dark"` system, ThemeToggle component in sidebar header.

### State Management

**On load:** Admin calls `GET /api/data` → populates draft state + stores baseline SHAs and commit SHA. Draft state is **not** persisted to localStorage — always fresh from GitHub on load. This prevents stale drafts from clobbering remote changes.

**During editing:** All changes are held in React state (draft). An unsaved-changes flag is computed by diffing draft against baseline.

**Deploy diff:** When clicking "Save & Deploy", the confirmation modal compares draft state against the baseline loaded at page open. It shows a summary like "2 photos reordered, 1 bullet edited, 1 project added". If the admin has been open for a long time, the user can click "Refresh data" to re-fetch baseline before deploying.

### Photos Section

**Grid view:**
- Category filter pills (same pattern as photography page)
- 4-column grid of photo cards
- Each card: thumbnail, title, category badge (mono), edit + menu icons on hover
- Drag-to-reorder within and across categories (@dnd-kit/sortable)
- On reorder or delete: all `order` values are rewritten as contiguous integers (1, 2, 3, ...) based on current visual order. No gaps.
- "Upload Photo" button (primary, top-right)

**Upload flow:**
1. Click "Upload Photo" → modal with drag-and-drop zone
2. Drop image → shows preview + metadata form (title pre-filled from filename, category dropdown, tags input)
3. Click "Upload & Process" → calls `/api/upload` then `/api/dispatch`
4. Progress indicator while Action runs (poll GitHub API)
5. On completion: admin auto-refreshes data from GitHub → photo appears in grid with real thumbnail

**While waiting for Action (intermediate state):** The photo card shows in the grid with a "Processing..." overlay, using the original file preview from the upload modal as a temporary thumbnail. Once the Action completes and data is refreshed, the real R2 URLs and base64 thumb replace the preview.

**Edit flow:**
- Click edit icon on card → inline panel or modal with title, category, tags fields
- Changes held in draft state (unsaved indicator in sidebar)

**Delete flow:**
- Click menu → "Delete" → confirmation → removes from local state
- Saved on "Save & Deploy" (entry removed from JSON, R2 files remain — zero storage cost, no cleanup needed. If storage becomes a concern in the future, a manual cleanup script can be added.)

### Experience Section

**List of expandable role cards:**
- Collapsed: company name (serif bold) + role + bullet count + expand arrow
- Expanded: full details + draggable bullet list

**Role card (expanded):**
- Header: company, role, period, location, logo (small image), url
- "Edit details" pill → inline editing of all header fields
- Bullet list: each bullet in a row with drag handle (⠿) + text + edit icon
- Bullets support `<strong>` for bold metrics (toolbar button or `**text**` syntax)
- "Add bullet" pill at bottom
- "Delete" link (muted, bottom-right)
- "Add Role" button at top of section

### Projects Section

**List of project cards:**
- Each shows: icon, title, label, description preview
- Click to expand/edit
- Fields: title, label (text + icon picker dropdown), description, tech (tag pills with add/remove), icon (image upload), href, badges (add/remove with label + href + icon picker)
- "Add Project" button

### Skills Section

**Skill groups:**
- Each group: category name + icon + item pills
- Click pill to remove, input field to add new
- Add/remove/reorder groups
- Icon picker for group icon

### Education Section

**Single form (array supports multiple, but currently one entry):**
- Fields: school, degree, CGPA, period, logo (image upload), url, leadership badges (add/remove)

### Preview Panel

Slide-over panel from the right (80% viewport width). Renders the actual site components (`Timeline`, `ProjectCard`, `MasonryGrid`, etc.) with draft data. Toggle between "Dev Page" and "Photography" previews.

Close button returns to editor.

### Save & Deploy

**Button in sidebar (primary):**
1. Click → confirmation modal showing what changed (diff of draft vs baseline loaded at page open, e.g. "2 photos reordered, 1 bullet edited")
2. Confirm → calls `POST /api/deploy` with updated JSON(s) + `baseSha`
3. If 409 conflict → "Data was updated externally — please review and try again" → re-fetch data
4. If success → shows deploy status: "Committing..." → "Building..." → "Live"
5. On success: baseline state updated to match draft (unsaved indicator clears)

**Unsaved changes indicator:** Dot on the "Save & Deploy" button when draft differs from committed state.

**Disabled states:**
- "Save & Deploy" is disabled while a photo Action is in-flight (prevents concurrent commits to `portfolio_images.json`)
- "Upload Photo" is disabled while a deploy is in-flight (same reason)

---

## Watermark

**Applied during GitHub Action processing (sharp pipeline).**

- **Text:** "akhil saxena" (lowercase)
- **Font:** DM Mono, 400 weight
- **Opacity:** 20% white
- **Position:** bottom-right, inset ~20px from bottom and ~24px from right (proportional to image size)
- **Applied to:** original (2000px) and medium (800px) variants
- **Not applied to:** thumbnail (40px, too small)

**Font sizing (proportional):**
- Original (2000px wide): ~20px font
- Medium (800px wide): ~11px font

**Implementation:** Generate SVG text element, composite onto image via sharp's `composite()` method.

**R2 storage:**
```
/photos/<category>/<slug>.webp        ← watermarked original (public)
/photos/<category>/<slug>-md.webp     ← watermarked medium (public)
/private/<category>/<slug>-clean.webp ← clean original (not public)
```

`/private/` prefix is not exposed via the r2.dev public URL.

**Existing photo migration:** One-time script downloads current originals from R2, re-processes with watermark, uploads watermarked versions to public paths and clean copies to `/private/`.

---

## GitHub Action Updates

### New trigger: `workflow_dispatch`

```yaml
on:
  push:
    branches: [main]
    paths: ['new-photos/**']
  workflow_dispatch:
    inputs:
      temp_key:
        description: 'R2 temp path of uploaded image'
        required: true
      title:
        description: 'Photo title'
        required: true
      category:
        description: 'Photo category'
        required: true
      tags:
        description: 'Comma-separated tags'
        required: false
        default: ''
```

### Updated processing pipeline

1. **Source:** either `/new-photos/<category>/` (push trigger) or R2 temp path (dispatch trigger)
2. Read EXIF metadata
3. Resize to 3 variants (original 2000px, medium 800px, thumb 40px)
4. **New: Watermark** original and medium variants
5. **New: Upload clean original** to `/private/<category>/<slug>-clean.webp`
6. Upload watermarked original + medium + thumb to public paths
7. Build JSON entry (with tags from dispatch input if present)
8. Update `portfolio_images.json`
9. Delete source (temp file from R2, or files from `/new-photos/`)
10. Commit and push

### New GitHub Secrets

- `GITHUB_PAT` — also set as CF Pages env var (for admin API functions)

### Updated `process-images.js`

Exports a new `addWatermark(imageBuffer, width)` function:
1. Creates SVG text overlay ("akhil saxena", DM Mono, sized to image)
2. Composites onto image with 0.20 opacity
3. Returns watermarked buffer

**Font in GitHub Actions:** DM Mono is not installed by default on `ubuntu-latest`. The watermark SVG uses inline font styling — sharp renders SVG text without requiring the font to be installed on the system when using `<text>` with explicit font metrics. If rendering quality is poor, bundle the DM Mono `.woff2` file in the repo at `scripts/fonts/DMMono-Regular.woff2` and register it via sharp's `font` option.

---

## New Files Summary

```
src/
├── app/
│   └── admin/
│       └── page.tsx                    ← Admin panel entry
├── components/
│   ├── admin/
│   │   ├── AdminLayout.tsx             ← Sidebar + content wrapper
│   │   ├── AdminSidebar.tsx            ← Nav items, preview/deploy
│   │   ├── AdminHeader.tsx             ← Section header + actions
│   │   ├── PhotoUploadZone.tsx         ← Drag-drop upload
│   │   ├── PhotoMetadataForm.tsx       ← Title, category, tags form
│   │   ├── PhotoGrid.tsx              ← Draggable photo grid
│   │   ├── PhotoCard.tsx              ← Single photo card
│   │   ├── PhotoEditModal.tsx         ← Edit photo metadata
│   │   ├── ExperienceEditor.tsx       ← Role cards list
│   │   ├── RoleCard.tsx               ← Expandable role editor
│   │   ├── BulletEditor.tsx           ← Inline bullet editing
│   │   ├── ProjectEditor.tsx          ← Project cards list
│   │   ├── ProjectForm.tsx            ← Project fields editor
│   │   ├── SkillsEditor.tsx           ← Skill groups editor
│   │   ├── EducationEditor.tsx        ← Education form
│   │   ├── PreviewPanel.tsx           ← Side panel with live preview
│   │   ├── DeployButton.tsx           ← Save & deploy with status
│   │   ├── IconPicker.tsx             ← SVG icon selector dropdown
│   │   ├── ImageUploader.tsx          ← Small drag-drop for logos
│   │   └── InlineEditor.tsx           ← Click-to-edit text field
│   └── styles/
│       └── admin.css                   ← Admin-specific styles
├── functions/
│   └── api/
│       ├── upload.ts                   ← R2 temp upload (photos)
│       ├── upload-asset.ts             ← R2 asset upload (logos, icons)
│       ├── dispatch.ts                 ← Trigger GitHub Action
│       ├── deploy.ts                   ← Commit JSON to GitHub
│       └── data.ts                     ← Fetch current data
├── data/
│   └── resume.json                     ← New: resume data
├── scripts/
│   ├── process-images.js              ← Updated: watermark step
│   └── migrate-watermark.js           ← New: one-time watermark migration
└── .github/
    └── workflows/
        └── process-photos.yml          ← Updated: workflow_dispatch + watermark
```

---

## Dependencies

**New:**
- `@dnd-kit/core` — drag-and-drop primitives
- `@dnd-kit/sortable` — sortable list abstraction (for photo grid and bullet reorder)
- `@dnd-kit/utilities` — CSS transform utilities

**Existing (no change):**
- `sharp` — image processing + watermark compositing
- `@aws-sdk/client-s3` — R2 uploads
- `exifr` — EXIF extraction

## Icon Library

All icon string identifiers (e.g. `"code"`, `"android"`, `"play-store"`, `"briefcase"`) map to a custom SVG icon set defined in a single `src/components/icons.tsx` file. These are the same stroke-style SVGs (1.5px stroke, round caps) used throughout the main site. The `IconPicker` component renders this set as a selectable grid.

Available icons: `image`, `briefcase`, `book`, `code`, `graduation-cap`, `eye`, `upload`, `filter`, `edit`, `dots`, `plus`, `github`, `play-store`, `chrome-store`, `android`, `chrome`, `terminal`, `layers`, `download`, `arrow-up-right`, `moon`, `sun`, `mail`, `linkedin`.

---

## Phasing

All capabilities in one release, built across 14 steps:

| Step | What | Depends on |
|------|------|------------|
| 1 | Extract resume data to `data/resume.json`, update dev page to import it | Nothing |
| 2 | Set up Cloudflare Access on `/admin` and `/api/*` | Nothing |
| 3 | Build admin layout (sidebar, routing, theme toggle) | Step 1 |
| 4 | Build CF Pages Functions (upload, dispatch, deploy, data) | Step 2 |
| 5 | Build photo management (grid, upload, edit, delete, reorder) | Steps 3, 4 |
| 6 | Build experience editor (role cards, bullet editing, reorder) | Step 3 |
| 7 | Build project editor (project form, icon/label picker) | Step 3 |
| 8 | Build skills + education editors | Step 3 |
| 9 | Build preview panel | Steps 5, 6, 7, 8 |
| 10 | Build save & deploy flow | Step 4 |
| 11 | Update sharp pipeline with watermark | Nothing |
| 12 | Update GitHub Action (workflow_dispatch + watermark) | Step 11 |
| 13 | Migrate existing photos (add watermark + store clean originals) | Step 12 |
| 14 | Polish, responsive testing, dark mode verification | All above |
