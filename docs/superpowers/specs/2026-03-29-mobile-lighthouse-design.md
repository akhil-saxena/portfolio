# Mobile Touch & Lighthouse Optimization — Design Specification

## Overview

Optimize the portfolio site for near-perfect Lighthouse scores (98+ across Performance, Accessibility, Best Practices, and SEO — PWA is out of scope) and native-feeling mobile touch interactions. Covers responsive image variants, swipe gestures in the lightbox, self-hosted fonts, CLS elimination, and a comprehensive accessibility/SEO audit.

---

## Image Variants & Pipeline

### New variant sizes

| Variant | Max Width | Quality | Purpose | R2 Path Suffix |
|---------|-----------|---------|---------|----------------|
| Original | 2000px | 85% | Lightbox desktop | `.webp` |
| Large | 1200px | 85% | Lightbox mobile/tablet | `-lg.webp` |
| Medium | 800px | 85% | Grid desktop | `-md.webp` |
| Small | 400px | 80% | Grid mobile | `-sm.webp` |
| Thumb | 40px | 60% | Blur placeholder | base64 inline |

All variants except thumb are watermarked. Clean originals remain in `/private/`.

### JSON schema update

The `urls` object in `portfolio_images.json` grows from 3 to 5 fields:

```json
{
  "urls": {
    "original": "https://pub-<hash>.r2.dev/photos/<category>/<slug>.webp",
    "large": "https://pub-<hash>.r2.dev/photos/<category>/<slug>-lg.webp",
    "medium": "https://pub-<hash>.r2.dev/photos/<category>/<slug>-md.webp",
    "small": "https://pub-<hash>.r2.dev/photos/<category>/<slug>-sm.webp",
    "thumb": "data:image/webp;base64,..."
  },
  "dimensions": {
    "width": 2000,
    "height": 1333
  }
}
```

New `dimensions` field stores the original image's width and height. Used for `aspect-ratio` CSS to eliminate CLS.

### Pipeline changes (`scripts/process-images.js`)

Add two new entries to the `VARIANTS` array:

```js
const VARIANTS = [
  { suffix: "", maxWidth: 2000, quality: 85 },
  { suffix: "-lg", maxWidth: 1200, quality: 85 },
  { suffix: "-md", maxWidth: 800, quality: 85 },
  { suffix: "-sm", maxWidth: 400, quality: 80 },
];
```

The `processImage` function loops over `VARIANTS`, but the current URL key mapping is hardcoded (`suffix === "" ? "original" : "medium"`). This must be replaced with a suffix-to-key map:

```js
const URL_KEY_MAP = { "": "original", "-lg": "large", "-md": "medium", "-sm": "small" };
// In the loop:
const urlKey = URL_KEY_MAP[variant.suffix];
urls[urlKey] = `${publicUrl}/${r2Key}`;
```

Without this fix, the large and small variants would overwrite the medium URL.

Store source image dimensions in the returned entry:

```js
const metadata = await sharp(imageBuffer).metadata();
// ... existing code ...
return {
  // ... existing fields ...
  dimensions: {
    width: metadata.width || 2000,
    height: metadata.height || 1333,
  },
};
```

### Migration

Re-run migration for all 41 photos to generate the two new variants (large 1200px + small 400px). Existing variants are overwritten (they'll be regenerated identically). The `dimensions` field is added to each JSON entry.

---

## Touch & Swipe Gestures

### Library

`react-swipeable` (~1.5KB gzipped). Installed as a production dependency.

### Lightbox swipe

Wrap the lightbox image area in `useSwipeable`:

```tsx
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => goNext(),
  onSwipedRight: () => goPrev(),
  delta: 50,           // minimum swipe distance in px
  trackMouse: false,    // touch only — mouse uses click/arrows
  preventScrollOnSwipe: true,
});
```

Apply `{...swipeHandlers}` to the outer `.lightbox` div (not `.lightbox-content`). The swipe zone must cover the full lightbox overlay so users can swipe anywhere on the backdrop or image. The existing `onClick` handler on `.lightbox` (which closes on backdrop click) is compatible — `react-swipeable` does not interfere with click events, only touch/swipe gestures.

### Visual feedback during swipe

Apply a CSS transform during the swipe gesture that shifts the image in the swipe direction:

```tsx
const [swipeOffset, setSwipeOffset] = useState(0);

const swipeHandlers = useSwipeable({
  onSwiping: (e) => setSwipeOffset(e.deltaX * 0.3),
  onSwipedLeft: () => { setSwipeOffset(0); goNext(); },
  onSwipedRight: () => { setSwipeOffset(0); goPrev(); },
  onTouchEndOrOnMouseUp: () => setSwipeOffset(0),
  delta: 50,
  trackMouse: false,
  preventScrollOnSwipe: true,
});
```

The image's style gets `transform: translateX(${swipeOffset}px)` during the gesture, then snaps back to 0.

### Touch target sizing

| Element | Current | Target | Fix |
|---------|---------|--------|-----|
| Lightbox nav arrows | `padding: 1rem` | 48x48px minimum | Add `min-width: 48px; min-height: 48px` |
| Lightbox close button | ~32px | 44x44px minimum | Add `min-width: 44px; min-height: 44px` |
| Filter tabs | `padding: 0.375rem 1rem` | 44px height | Add `min-height: 44px` |
| Masonry grid buttons | Block-level | Already adequate | No change needed |

---

## Lighthouse: Performance

### Responsive images with srcset

**MasonryGrid:** Each `<img>` gets:
```html
<img
  src={photo.urls.medium}
  srcSet={`${photo.urls.small} 400w, ${photo.urls.medium} 800w`}
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
  alt={photo.title}
  loading="lazy"
  width={photo.dimensions?.width}
  height={photo.dimensions?.height}
  style={{ aspectRatio: `${photo.dimensions?.width || 3} / ${photo.dimensions?.height || 2}` }}
/>
```

**Lightbox:** Each `<img>` gets:
```html
<img
  src={photo.urls.original}
  srcSet={`${photo.urls.large} 1200w, ${photo.urls.original} 2000w`}
  sizes="90vw"
  alt={photo.title}
/>
```

**Homepage gallery peek:** (3-column grid inside 800px container)
```html
<img
  src={photo.urls.small}
  srcSet={`${photo.urls.small} 400w, ${photo.urls.medium} 800w`}
  sizes="(max-width: 600px) 33vw, 270px"
/>
```

### Preload LCP element

On the homepage, the gallery images are the LCP element. Add a `<link rel="preload">` for the first image in the `<head>`:

```html
<link rel="preload" as="image" href="{firstPhoto.urls.medium}" type="image/webp" />
```

**App Router approach:** Since `page.tsx` is a `"use client"` component, `next/head` is not available. Instead, add the preload link directly in `layout.tsx` using a static `<link>` tag in the `<head>` section (which is a Server Component). The first gallery image URL can be hardcoded or pulled from the JSON at build time since it's static.

### Preconnect to R2

In `layout.tsx`, add:
```html
<link rel="preconnect" href="https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev" />
```

This is already partially done (there's a preconnect for Google Fonts). Add the R2 one alongside it.

---

## Lighthouse: CLS Elimination

### Image aspect ratio

Every `<img>` in the masonry grid and lightbox gets:
- `width` and `height` attributes from the `dimensions` field in JSON
- `style={{ aspectRatio: ... }}` as a fallback

This reserves space before the image loads, preventing layout shift.

### Font loading — self-hosted

**Remove Google Fonts CDN.** Instead:

1. Download DM Sans (400, 500, 700), DM Mono (400), Libre Baskerville (400, 400i, 700) as `.woff2`
2. Place in `public/fonts/`
3. Declare `@font-face` rules in `globals.css` with `font-display: swap`
4. Remove the `<link>` tags for Google Fonts from `layout.tsx`
5. Remove the `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com`
6. Add `<link rel="preload">` for the body font to prevent FOUT:
```html
<link rel="preload" as="font" href="/fonts/dm-sans-400.woff2" type="font/woff2" crossOrigin="anonymous" />
```

Font-face declarations:
```css
@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/dm-sans-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* ... repeat for 500, 700, and other families ... */
```

### Fallback font size-adjust

To minimize CLS during font swap, add `size-adjust` to the CSS variable fallbacks:

```css
--font-sans: 'DM Sans', system-ui, sans-serif;
```

The `system-ui` fallback is close enough in metrics that `size-adjust` is not strictly necessary, but if CLS is measurable, add:

```css
@font-face {
  font-family: 'DM Sans Fallback';
  src: local('system-ui');
  size-adjust: 104%;
  ascent-override: 92%;
  descent-override: 22%;
}
```

---

## Lighthouse: Accessibility

### Audit items

- All `<img>` tags: verify descriptive alt text (not just filenames)
- Color contrast: verify `--ink-muted` (#9a8d82) on `--bg` (#f5f0e8) meets WCAG AA 4.5:1 ratio. Current ratio is ~3.1:1 — **fails AA for small text.** Fix: darken `--ink-muted` to #7a6e60 or lighten it to use only for large text/decorative elements.
- Lightbox: add `aria-modal="true"` (currently missing, only has `role="dialog"`)
- Ensure all interactive elements are keyboard-focusable
- Verify `prefers-reduced-motion` disables all animations (already implemented)

### Contrast fix

`--ink-muted` is used for secondary text throughout the site. Two options:
- **A)** Darken `--ink-muted` from `#9a8d82` to `#7a6e60` globally — may affect the visual warmth
- **B)** Keep `--ink-muted` for decorative/large text, introduce `--ink-secondary` at `#7a6e60` for body-sized text that needs AA compliance

Recommend **B** — preserves the warm muted tone for labels and decorative text while ensuring readable text passes contrast.

---

## Lighthouse: Best Practices

- Add `<meta name="theme-color" content="#f5f0e8">` for light mode
- Add `<meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)">` for dark mode
- Verify no console errors in production build
- Verify all external links have `rel="noopener noreferrer"`

---

## Lighthouse: SEO

### Structured data (JSON-LD)

Add Person schema to the homepage:

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Akhil Saxena",
  "jobTitle": "Senior Software Engineer",
  "url": "https://akhilsaxena.pages.dev",
  "sameAs": [
    "https://github.com/akhil-saxena",
    "https://www.linkedin.com/in/akhil-saxena"
  ]
}
```

Injected via `<script type="application/ld+json">` in the homepage or layout.

### Per-page metadata

| Page | Title | Description |
|------|-------|-------------|
| `/` | Akhil Saxena — Interfaces & Imagery | Building for the web. Photographing everything else. |
| `/photography` | Photography — Akhil Saxena | Portfolio of photography across architecture, nature, street, and wildlife. |
| `/dev` | Development — Akhil Saxena | Senior Software Engineer. Experience at Brevo, PharmEasy, MAQ Software. |

**App Router constraint:** `page.tsx`, `photography/page.tsx`, and `dev/page.tsx` are all `"use client"` components — they cannot export `metadata` (it's silently ignored). Fix: create a `layout.tsx` in each route directory that exports the metadata, while the `page.tsx` remains a client component. For example:

- `src/app/photography/layout.tsx` — Server Component that exports `metadata` for the photography page
- `src/app/dev/layout.tsx` — Server Component that exports `metadata` for the dev page
- Homepage metadata stays in `src/app/layout.tsx` (already a Server Component)

Each layout is a simple pass-through: `export default function Layout({ children }) { return children; }`

### Canonical URLs

Add `<link rel="canonical" href="https://akhilsaxena.pages.dev{path}" />` via Next.js metadata `alternates.canonical`.

**Domain fix:** The existing `metadataBase` in `layout.tsx` points to `https://akhil-portfolio.pages.dev` — this must be updated to `https://akhilsaxena.pages.dev` to match the actual production domain. The JSON-LD `url` field must also use this domain.

### TypeScript interface updates

The `Photo` interface is defined in three separate files: `Lightbox.tsx`, `MasonryGrid.tsx`, and `photography/page.tsx`. All three must be updated to include the new `urls` fields (`large`, `small`) and the `dimensions` field. Consider extracting a shared `Photo` type into a `src/types.ts` file to avoid duplication.

---

## Dependencies

**New:**
- `react-swipeable` (~1.5KB) — touch swipe detection for lightbox

**Removed:**
- Google Fonts CDN (replaced with self-hosted woff2 files)

---

## Files Changed

```
scripts/
├── process-images.js              ← MODIFY: add large + small variants, store dimensions
├── migrate-existing.js            ← MODIFY: re-run with new variants

data/
└── portfolio_images.json          ← MODIFY: add large, small URLs + dimensions per photo

public/
└── fonts/                         ← NEW: self-hosted woff2 font files
    ├── dm-sans-400.woff2
    ├── dm-sans-500.woff2
    ├── dm-sans-700.woff2
    ├── dm-mono-400.woff2
    ├── libre-baskerville-400.woff2
    ├── libre-baskerville-400i.woff2
    └── libre-baskerville-700.woff2

src/
├── app/
│   ├── layout.tsx                 ← MODIFY: remove Google Fonts, add preconnect R2, theme-color, JSON-LD, font preload, fix metadataBase
│   ├── page.tsx                   ← MODIFY: srcset on gallery images
│   ├── photography/
│   │   ├── layout.tsx             ← NEW: Server Component exporting photography page metadata
│   │   └── page.tsx               ← MODIFY: update Photo interface
│   └── dev/
│       ├── layout.tsx             ← NEW: Server Component exporting dev page metadata
│       └── page.tsx               ← no change (imports from resume.json)
├── components/
│   ├── Lightbox.tsx               ← MODIFY: add swipe handlers, srcset, touch targets, aria-modal
│   └── MasonryGrid.tsx            ← MODIFY: add srcset, sizes, aspect-ratio, dimensions
├── types.ts                       ← NEW: shared Photo type with urls.large, urls.small, dimensions
└── styles/
    ├── globals.css                ← MODIFY: @font-face declarations, --ink-secondary
    └── photography.css            ← MODIFY: touch target sizes for filter tabs
```

---

## Phasing

| Step | What | Depends on |
|------|------|------------|
| 1 | Self-host fonts (download woff2, @font-face, remove CDN links) | Nothing |
| 2 | Update sharp pipeline with new variants + dimensions | Nothing |
| 3 | Re-run migration for all 41 photos | Step 2 |
| 4 | Update MasonryGrid with srcset, sizes, aspect-ratio | Step 3 |
| 5 | Update Lightbox with srcset, swipe gestures, touch targets, aria-modal | Step 3 |
| 6 | Update homepage with srcset, preload, preconnect | Step 3 |
| 7 | Add per-page metadata, canonical URLs, JSON-LD | Nothing |
| 8 | Contrast fix (--ink-secondary) | Nothing |
| 9 | Add theme-color meta tags | Nothing |
| 10 | Run Lighthouse audit, fix remaining issues | All above |
