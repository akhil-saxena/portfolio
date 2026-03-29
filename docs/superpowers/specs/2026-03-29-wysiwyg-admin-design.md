# WYSIWYG Admin Panel — Design Specification

## Overview

Redesign the admin panel from a form-based editor to a WYSIWYG editor where the content area renders the actual website pages with inline editing. A right-side properties panel shows context-sensitive controls for the selected element. The admin IS the website, with edit affordances overlaid.

---

## Core Concept

```
┌──────────────────────────────────────────────┬──────────────┐
│                                              │              │
│   [Thin top bar: page tabs + Deploy]         │  Properties  │
│                                              │    Panel     │
│   ┌──────────────────────────────────────┐   │              │
│   │                                      │   │  (context-   │
│   │   The actual website page            │   │   sensitive  │
│   │   rendered exactly as visitors       │   │   based on   │
│   │   see it — but with hover            │   │   selected   │
│   │   outlines and click-to-edit         │   │   element)   │
│   │                                      │   │              │
│   │   Masonry grid matches real site     │   │              │
│   │   Timeline matches real site         │   │              │
│   │   Projects match real site           │   │              │
│   │                                      │   │              │
│   └──────────────────────────────────────┘   │              │
│                                              │              │
└──────────────────────────────────────────────┴──────────────┘
```

**Key principle:** The content area renders the same components as the public site (MasonryGrid, Timeline, ProjectCard, etc.) with the same CSS. The only differences are:
1. Elements get a subtle hover outline showing they're editable
2. Clicking an element selects it and populates the properties panel
3. Some elements support inline text editing (double-click)
4. Drag handles appear for reorderable items (photos, bullets, roles)

---

## Layout

### Top Bar

Thin horizontal bar across the full width. Contains:

| Left | Center | Right |
|------|--------|-------|
| "Admin" label | Page tabs: Home / Photography / Dev | Save & Deploy button + status |

The page tabs switch which site page is rendered in the content area. Each tab renders the actual page content using the same components as the public site.

Height: ~48px. Background: `var(--surface)`. Border-bottom: `var(--border)`.

### Content Area (Left)

Renders the actual website page for the selected tab. Uses the real components:
- **Home tab:** homepage layout (name, tagline, gallery grid, intro, CTAs)
- **Photography tab:** masonry grid with filters, search — same as `/photography`
- **Dev tab:** timeline, skills, education, projects — same as `/dev`

Photos in the masonry grid are draggable for reordering (using @dnd-kit). The order change is immediately reflected in the masonry layout — what you see IS what the site will look like.

### Properties Panel (Right)

Width: 320px. Background: `var(--surface)`. Border-left: `var(--border)`.
Sticky, scrolls independently from content.

Shows different content based on what's selected:

**Nothing selected → Page actions:**
- Upload Photo button (Photography tab)
- Add Role / Add Project / Add Skill Group buttons (Dev tab)
- Page-level settings

**Photo selected → Photo properties:**
- Thumbnail preview
- Title (editable input)
- Category (dropdown)
- Tags (chip input)
- EXIF data (collapsible form)
- Delete button

**Experience role selected → Role properties:**
- Company (input)
- Role (input)
- Period (month/year pickers + Present checkbox)
- Location (input)
- Company logo URL (input + preview)
- Company URL (input)
- Bullets list (editable, draggable, add/remove)
- Delete role button

**Project selected → Project properties:**
- Title, label, description, tech chips, icon URL, href
- Store links (add/remove with icon picker)
- Delete project button

**Skill group selected → Skill properties:**
- Category name (input)
- Icon (picker)
- Skill tags (add/remove)
- Delete group button

**Education selected → Education properties:**
- School, degree, CGPA, period, logo, URL
- Leadership badges (add/remove)

---

## Interaction Model

### Selection

- **Click** on any editable region → selects it, properties panel updates
- **Click** on empty space → deselects, properties panel shows page actions
- Selected element gets a subtle blue outline (`2px solid var(--ink)` with `4px offset`)
- Hover over editable elements shows a lighter outline (`1px dashed var(--border)`)

### Inline Editing

- **Double-click** on text (titles, bullets, descriptions) → inline text editing
- Press **Enter** or click away to save
- Press **Escape** to cancel

### Drag Reorder

- **Photos in masonry grid:** drag to reorder. The masonry layout updates in real-time — what you see is exactly what visitors will see.
- **Bullets in experience:** drag handle to reorder within a role
- **Roles in timeline:** drag to reorder
- **Projects:** drag to reorder

### Adding Items

- **Upload Photo:** button in properties panel (when nothing selected on Photography tab). Opens the upload zone + metadata form.
- **Add Role:** button in properties panel. Adds a new role card at the top of the timeline.
- **Add Project:** button in properties panel. Adds a new project card.
- **Add Skill Group:** button in properties panel. Adds a new group.

---

## Data Flow

Same as the current admin:
1. Load data from JSON files on mount
2. All edits held in React state (draft)
3. "Save & Deploy" commits updated JSON to GitHub via `/api/deploy`
4. CF Pages rebuilds

No changes to the API layer, deploy flow, or data model.

---

## Edit Affordances on Components

### MasonryGrid (Photography tab)

The existing MasonryGrid component is wrapped with drag-and-drop. Each photo card:
- Shows edit overlay on hover (subtle border + drag handle icon)
- Click → selects, properties panel shows photo details
- Drag → reorder in the masonry layout (order field updates)
- The masonry CSS `columns` layout is identical to the public site

### Timeline (Dev tab)

Each timeline entry:
- Hover → subtle outline
- Click → selects role, properties panel shows all fields
- Double-click on company name or bullet → inline edit
- Drag handle on left edge for reordering roles

### ProjectCard (Dev tab)

Each project card:
- Hover → subtle outline
- Click → selects, properties panel shows all fields
- Cards maintain the same grid layout as the public site

### Skills (Dev tab)

Each skill group:
- Hover → outline
- Click → selects, properties panel shows category + tags

### Education (Dev tab)

- Hover → outline
- Click → selects, properties panel shows all fields

### Homepage (Home tab)

- Title "Akhil Saxena" → double-click to edit (stored in a config, or hardcoded for now)
- Tagline "Interfaces & Imagery" → double-click to edit
- Gallery photos → click to select, drag to reorder (same 6 peek photos)
- Intro text → double-click to edit
- Copyright year is automatic

---

## CSS: Edit Mode Affordances

```css
/* Editable regions */
.admin-editable {
  position: relative;
  cursor: pointer;
  transition: outline 0.15s;
}

.admin-editable:hover {
  outline: 1px dashed var(--border);
  outline-offset: 4px;
}

.admin-editable.selected {
  outline: 2px solid var(--ink);
  outline-offset: 4px;
}

/* Drag handle (appears on hover for reorderable items) */
.admin-drag-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-faint);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;
}

.admin-editable:hover .admin-drag-handle {
  opacity: 1;
}

/* Inline editing state */
.admin-inline-editing {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  min-height: 1.5em;
  padding: 2px 4px;
}
```

---

## Properties Panel Component

```
PropertiesPanel
├── NothingSelected    → page-level actions (Upload, Add Role, etc.)
├── PhotoSelected      → photo metadata form
├── RoleSelected       → experience role form with bullets
├── ProjectSelected    → project form
├── SkillGroupSelected → skill group form
└── EducationSelected  → education form
```

Each panel variant uses the same form components (inputs, selects, chip inputs, date pickers) as the current admin — just reorganized into the right sidebar context.

---

## Components to Modify

### Existing (reuse as-is for rendering)
- `MasonryGrid` — renders the photography masonry grid
- `Timeline` — renders experience timeline
- `ProjectCard` — renders project cards
- `FilterTabs` — renders category filters
- `SearchBar` — renders search
- `Lightbox` — renders photo viewer (works in admin too for full preview)
- `Footer` — renders footer
- `Nav` — renders navigation

### New Components
- `AdminTopBar` — page tabs + deploy button
- `PropertiesPanel` — right sidebar, context-sensitive
- `EditableWrapper` — wraps any component to make it selectable/hoverable
- `InlineText` — double-click-to-edit text component
- `DraggableMasonry` — MasonryGrid with drag-and-drop photo reordering
- `DraggableTimeline` — Timeline with drag-and-drop role reordering

### Removed Components (replaced by WYSIWYG)
- `AdminSidebar` (replaced by top bar)
- `PreviewPanel` (no longer needed — the editor IS the preview)
- `PhotoGrid` (replaced by DraggableMasonry)
- `PhotoEditModal` (replaced by properties panel)
- `ExperienceEditor` (replaced by inline editing + properties panel)
- `ProjectEditor` (replaced by properties panel)
- `SkillsEditor` (replaced by properties panel)
- `EducationEditor` (replaced by properties panel)
- `PhotoUploadZone` (moved into properties panel as a section)

---

## Mobile Behavior

On screens < 768px:
- Top bar collapses to just page tabs (icons only) + deploy icon
- Properties panel becomes a bottom sheet (slides up from bottom when element selected)
- Content area takes full width
- Tap to select, long-press to drag

---

## Phasing

This is a full rewrite of the admin UI. Recommended build order:

| Step | What | Depends on |
|------|------|------------|
| 1 | AdminTopBar + basic page routing | Nothing |
| 2 | PropertiesPanel shell (empty context panels) | Step 1 |
| 3 | Photography tab — render real MasonryGrid with DraggableMasonry | Step 1 |
| 4 | Photo selection → properties panel | Steps 2, 3 |
| 5 | Photo upload via properties panel | Step 4 |
| 6 | Dev tab — render real Timeline, ProjectCard, Skills, Education | Step 1 |
| 7 | Role selection → properties panel | Steps 2, 6 |
| 8 | Project selection → properties panel | Steps 2, 6 |
| 9 | Skill/Education selection → properties panel | Steps 2, 6 |
| 10 | Inline text editing (double-click) | Step 6 |
| 11 | Home tab — render homepage with editable regions | Step 1 |
| 12 | Save & Deploy integration | All above |
| 13 | Mobile bottom sheet | All above |
| 14 | Remove old admin components | All above |
