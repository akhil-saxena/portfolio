# Lighthouse Plan A: Fonts, Metadata & SEO

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-host Google Fonts, add per-page metadata via route layouts, add JSON-LD structured data, fix color contrast, and add theme-color meta tags — targeting major Lighthouse score improvements with zero image pipeline changes.

**Architecture:** Download woff2 font files into `public/fonts/`, declare `@font-face` in globals.css, remove CDN links from layout.tsx. Create route-level `layout.tsx` files for photography and dev pages to export metadata (since their `page.tsx` files are client components). Fix `metadataBase` to the correct production domain.

**Tech Stack:** Next.js 15 App Router, CSS @font-face, JSON-LD.

---

## File Structure

```
public/
└── fonts/                              ← NEW: self-hosted woff2 files
    ├── dm-sans-400.woff2
    ├── dm-sans-500.woff2
    ├── dm-sans-700.woff2
    ├── dm-mono-400.woff2
    ├── libre-baskerville-400.woff2
    ├── libre-baskerville-400i.woff2
    └── libre-baskerville-700.woff2

src/
├── app/
│   ├── layout.tsx                      ← MODIFY: remove Google Fonts CDN, add font preload, fix metadataBase, add preconnect R2, theme-color, JSON-LD
│   ├── photography/
│   │   └── layout.tsx                  ← NEW: metadata for photography page
│   └── dev/
│       └── layout.tsx                  ← NEW: metadata for dev page
└── styles/
    └── globals.css                     ← MODIFY: add @font-face, add --ink-secondary
```

---

## Chunk 1: Self-Hosted Fonts

### Task 1: Download font files

**Files:**
- Create: `public/fonts/*.woff2` (7 files)

- [ ] **Step 1: Create fonts directory and download woff2 files**

```bash
mkdir -p public/fonts
# DM Sans
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop-hSA.woff2" -o public/fonts/dm-sans-400.woff2
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJ-hSA.woff2" -o public/fonts/dm-sans-500.woff2
curl -L "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJihSA.woff2" -o public/fonts/dm-sans-700.woff2
# DM Mono
curl -L "https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYhh2aBYyMcKdF.woff2" -o public/fonts/dm-mono-400.woff2
# Libre Baskerville
curl -L "https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0qNZaxMaC82U-ro.woff2" -o public/fonts/libre-baskerville-400.woff2
curl -L "https://fonts.gstatic.com/s/librebaskerville/v14/kmKhZrc3Hgbbcjq75U4uslyuy4kn0qviTjYwI8Gcw6Oi.woff2" -o public/fonts/libre-baskerville-400i.woff2
curl -L "https://fonts.gstatic.com/s/librebaskerville/v14/kmKiZrc3Hgbbcjq75U4uslyuy4kn0qNcaxYaDc2V2ro.woff2" -o public/fonts/libre-baskerville-700.woff2
```

Note: These URLs are from Google Fonts CDN. If any URL breaks, visit https://fonts.google.com and download the font families manually, then extract the woff2 files. Alternatively, use `google-webfonts-helper` tool.

- [ ] **Step 2: Verify files exist and are non-empty**

```bash
ls -la public/fonts/
```

Expected: 7 woff2 files, each 10-50KB.

- [ ] **Step 3: Commit**

```bash
git add public/fonts/
git commit -m "chore: add self-hosted woff2 font files"
```

---

### Task 2: Add @font-face declarations to globals.css

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Add @font-face rules at the TOP of globals.css (before the reset)**

Insert these declarations at the very beginning of `src/styles/globals.css`, before the `/* ===== Reset ===== */` comment:

```css
/* ===== Self-hosted fonts ===== */
@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/dm-sans-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/dm-sans-500.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/dm-sans-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'DM Mono';
  src: url('/fonts/dm-mono-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Libre Baskerville';
  src: url('/fonts/libre-baskerville-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Libre Baskerville';
  src: url('/fonts/libre-baskerville-400i.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'Libre Baskerville';
  src: url('/fonts/libre-baskerville-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 2: Add --ink-secondary for contrast compliance**

In the `:root` (light theme) section, add after `--ink-faint`:
```css
  --ink-secondary: #6b5f55;
```

In the `[data-theme="dark"]` section, add after `--ink-faint`:
```css
  --ink-secondary: #9a9a9a;
```

Note: `--ink-secondary` is for body-sized text that needs WCAG AA compliance. `--ink-muted` remains for decorative/large text. This variable is added for future use — no components need to switch to it in this plan.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: add @font-face declarations and --ink-secondary contrast token"
```

---

### Task 3: Update layout.tsx — remove CDN, add preload + preconnect + theme-color + JSON-LD

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read the current layout.tsx, then replace it entirely**

The current file has Google Fonts `<link>` tags and preconnects to googleapis.com/gstatic.com. Replace the entire file with:

```tsx
import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Akhil Saxena — Interfaces & Imagery",
  description: "Building for the web. Photographing everything else. Portfolio of Akhil Saxena.",
  metadataBase: new URL("https://akhilsaxena.pages.dev"),
  openGraph: {
    title: "Akhil Saxena — Interfaces & Imagery",
    description: "Building for the web. Photographing everything else.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akhil Saxena — Interfaces & Imagery",
    description: "Building for the web. Photographing everything else.",
  },
  alternates: {
    canonical: "https://akhilsaxena.pages.dev",
  },
};

const themeScript = `
  (function() {
    const saved = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  })();
`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Akhil Saxena",
  jobTitle: "Senior Software Engineer",
  url: "https://akhilsaxena.pages.dev",
  sameAs: [
    "https://github.com/akhil-saxena",
    "https://www.linkedin.com/in/akhil-saxena",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" as="font" href="/fonts/dm-sans-400.woff2" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev" />
        <meta name="theme-color" content="#f5f0e8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
```

Key changes:
- Removed all Google Fonts `<link>` tags (3 removed: preconnect googleapis, preconnect gstatic, font stylesheet)
- Added `<link rel="preload">` for DM Sans 400 (body font — prevents FOUT)
- Added `<link rel="preconnect">` for R2 CDN
- Added `<meta name="theme-color">` for both light and dark
- Added JSON-LD Person schema
- Fixed `metadataBase` from `akhil-portfolio.pages.dev` to `akhilsaxena.pages.dev`
- Added `alternates.canonical`
- Updated all title/description to use "Interfaces & Imagery"

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: self-host fonts, add JSON-LD, theme-color, preconnect R2, fix metadataBase"
```

---

## Chunk 2: Per-Page Metadata

### Task 4: Create photography page layout with metadata

**Files:**
- Create: `src/app/photography/layout.tsx`

- [ ] **Step 1: Create the layout file**

Create `src/app/photography/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photography — Akhil Saxena",
  description: "Portfolio of photography across architecture, nature, street, wildlife, and more.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/photography",
  },
};

export default function PhotographyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/photography/layout.tsx
git commit -m "feat: add photography page metadata via route layout"
```

---

### Task 5: Create dev page layout with metadata

**Files:**
- Create: `src/app/dev/layout.tsx`

- [ ] **Step 1: Create the layout file**

Create `src/app/dev/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Development — Akhil Saxena",
  description: "Senior Software Engineer. Experience at Brevo, PharmEasy, MAQ Software. Projects, skills, and resume.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/dev",
  },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dev/layout.tsx
git commit -m "feat: add dev page metadata via route layout"
```

---

### Task 6: Verify build and check Lighthouse locally

**Files:**
- No new files

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: Build succeeds. All pages render. No Google Fonts warning (the `no-page-custom-font` ESLint warning should be gone since we removed the CDN links).

- [ ] **Step 2: Run dev server and check fonts load**

```bash
npm run dev
```

Open http://localhost:3000 in browser. Verify:
- Fonts render correctly (DM Sans body, Libre Baskerville headings, DM Mono code)
- No flash of unstyled text (FOUT) — the preloaded DM Sans 400 should be instant
- Theme toggle works
- Dark mode colors are correct

- [ ] **Step 3: Check page source for metadata**

Navigate to each page and verify in view-source:
- `/` — title "Akhil Saxena — Interfaces & Imagery", JSON-LD present, theme-color present
- `/photography` — title "Photography — Akhil Saxena"
- `/dev` — title "Development — Akhil Saxena"

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build issues from font migration"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Download woff2 font files | `public/fonts/*.woff2` |
| 2 | @font-face + --ink-secondary | `src/styles/globals.css` |
| 3 | Layout overhaul (remove CDN, add preload/preconnect/theme-color/JSON-LD) | `src/app/layout.tsx` |
| 4 | Photography metadata layout | `src/app/photography/layout.tsx` |
| 5 | Dev metadata layout | `src/app/dev/layout.tsx` |
| 6 | Verify build + fonts + metadata | — |

**After this plan:**
- Google Fonts CDN is eliminated (no render-blocking external requests)
- Fonts are self-hosted with preload (faster LCP)
- Each page has unique title + description + canonical URL
- JSON-LD structured data on homepage
- Theme-color meta tags for mobile browser chrome
- WCAG-ready contrast token available
- Lighthouse: Performance and SEO scores should improve significantly
