// PhotoLayoutBoard — the REAL public masonry, made editable.
//
// Replaces SortableReorder, which is deleted rather than kept beside this. That
// component rendered an ABSTRACT grid — auto-fill, minmax(128px, 1fr), fixed 88px
// thumbnails — and an abstract grid cannot answer the question the user actually
// asked, which was to "move and position photos as I want, and see them in the
// actual view where i can move and see the position on actual final website".
// A tile whose height is 88px regardless of the photo tells you nothing about
// where the photo lands in a masonry whose whole shape comes from real aspect
// ratios. Two components, one named for the grid it no longer renders, would have
// been a name that lies, and the hydration budget allows exactly one island here.
//
// ═══ THE COLUMN MODEL IS COPIED FROM /photos, NOT INVENTED ══════════════════
// src/pages/photos.astro:455-462 — `column-count: 3`, `column-gap: var(--space-4)`,
// tiles `break-inside: avoid` with `margin-bottom: var(--space-4)` and a 10px
// radius. There is NO media query on the count: the public masonry is a flat
// three columns at every device class, because D-25's Title-case/lower-case drift
// makes `site_config.categoryColumns` unreachable and photos.astro records that
// as the reason. So this board is a flat three columns too. THE BOARD MOVED, not
// /photos — photos.astro is a public sketch owned elsewhere, and a board that
// invents its own column count is the exact failure this file exists to remove.
//
// ═══ WHAT THE FOCAL POINT ACTUALLY DOES, MEASURED RATHER THAN ASSUMED ═══════
// The public gallery tile is `<a class="ph-tile" style="aspect-ratio: W / H">`
// with `.ph-img { width: 100%; height: auto }` (photos.astro:174-182, 460-484).
// It is UNCROPPED at the photo's own aspect ratio. So `object-position` is INERT
// on the public gallery, and a board that claimed to show a live crop there would
// be lying about the surface it is imitating.
//
// The focal point is load-bearing where a photo is put in a frame it does not
// fit: Home's 3:2 peek slots, which is where D-23 and G-1 came from in the first
// place. So the board has TWO FRAMES and says which one you are looking at:
//
//   GALLERY — aspect-ratio W/H, uncropped. Byte-for-byte the /photos composition.
//             This is the default, because "where will this sit" is the question.
//             The focal marker still renders, so the point is visible even where
//             it does not bite.
//   PEEK    — aspect-ratio 3/2, object-fit cover, object-position live. Home's
//             peek frame. Here the focal point visibly moves the image.
//
// The column count, the gap, the radius and the reading order are IDENTICAL in
// both. Only the frame changes, so switching cannot be mistaken for a different
// layout.
//
// ═══ D-22, CARRIED ACROSS UNCHANGED ═════════════════════════════════════════
// Photos keep the global `order` and gain a second per-category order; the
// per-category value wins when a filter is active. The reorder affordance is
// therefore MODAL ON THE ACTIVE FILTER, and the board states in words which of
// the two fields a drag is about to write. Every tile carries BOTH numbers, so a
// drag inside Architecture visibly moves one and visibly leaves the other alone.
// The second field is NOT named here: that is one of Phase 3's migrations. The
// per-axis order is DERIVED at mount from the existing global `order`.
//
// ═══ NO PERSISTENCE — THE D-02 SCOPE FENCE ══════════════════════════════════
// No request, no storage, no endpoint. Order and focal edits live in component
// state and are thrown away on navigation. Asserted by grep, not by comment.
//
// ═══ G-13 IS LEFT INTACT, DELIBERATELY ══════════════════════════════════════
// Drag is now the PRIMARY interaction of this screen rather than a secondary one,
// which is exactly why nothing here improves what the design system says during a
// keyboard drag. dnd-kit's DndContext already ships a default spoken-feedback set,
// so a status region exists and speech happens; it speaks the raw record slug and
// never a title and never a position, and `Sortable`'s prop surface
// ({items, onReorder, renderItem, id, className, style}) gives a consumer no way
// to replace it. The fix is to EXPOSE that hook upstream. Bolting a second status
// region onto a page that already has one per DndContext would produce duplicate
// speech AND convert an upstream finding into a silent local fix, which
// PROJECT.md's Core Value forbids. The escalation is written up in 00-ADMIN-IA.md
// with the Phase 7 dependency stated.
//
// ═══ MEASURED COMPOSITION LIMITS (new, this plan) ═══════════════════════════
// 1. `Sortable` hard-codes `verticalListSortingStrategy` (dist/index.js:9839) and
//    exposes no `strategy` prop. In any layout that is not one vertical column —
//    a masonry, a grid, anything with more than one column — the in-flight
//    shuffle transform it applies to the NON-dragged items is computed along one
//    axis and is wrong. Collision is `closestCenter` against real measured rects,
//    so the DROP TARGET is correct in two dimensions and the reflow after drop is
//    correct; only the preview is wrong. This board neutralises that one transform
//    in its own CSS (see PB_CSS) and lets the DragOverlay — which follows the
//    pointer and is strategy-independent — carry the feedback instead.
// 2. `FocalPointSketch` has NO value-out channel: no onChange, no callback, no
//    controlled `value` prop. Its state is private. Coupling a live tile to it
//    therefore required OBSERVING ITS RENDERED READOUT IN THE DOM (see the effect
//    below). That is not a clever trick, it is the cost of G-1: the control that
//    does not exist upstream also does not exist as a composable one downstream.
// 3. `FocalPointSketch`'s frame ratio is a prop in the ARITHMETIC only. Its own
//    `.fp-frame` rule hard-codes `aspect-ratio: 3 / 2`, so passing a different
//    ratio changes the readout's description of a frame the component is still
//    drawing at 3:2. This board therefore passes the SAME constant it draws the
//    peek frame with, so the maths and the paint agree.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Sortable, SortableDndContext, SortableItem } from "@akhil-saxena/design-system";
import FocalPointSketch from "./FocalPointSketch";

export interface ReorderPhoto {
	id: string;
	title: string;
	category: string;
	order: number;
	src: string;
	width: number;
	height: number;
	pipeline: "processed" | "processing" | "failed";
	/** D-23's crop, in home_config.peekPositions' shape. Null = never cropped. */
	focalPoint?: string | null;
}

export interface ReorderCategory {
	id: string;
	label: string;
	count: number;
}

interface Props {
	/** The photos that are IN THE GALLERY. Staged uploads arrive separately. */
	photos: ReorderPhoto[];
	/** Committed but not yet in the gallery: D-12's asynchronous processing. */
	staged?: ReorderPhoto[];
	categories: ReorderCategory[];
	/** The filter the page was rendered with. */
	activeCategory?: string;
}

const PIPE = {
	processed: { label: "Processed", tone: "success" as const },
	processing: { label: "Processing", tone: "info" as const },
	failed: { label: "Failed", tone: "error" as const },
};

const ALL = "all";
const DEFAULT_FOCAL = "50% 50%";

// Home's peek slot. ONE constant, used for the peek tile frame AND for the props
// handed to FocalPointSketch, so limit 3 above cannot reopen: the frame the
// operator sees and the frame the readout describes are the same number.
const PEEK_W = 3;
const PEEK_H = 2;

type Frame = "gallery" | "peek";

// ═══ THE BOARD'S OWN CSS ════════════════════════════════════════════════════
// Shipped with the component rather than from the host page, the same way
// FocalPointSketch ships its frame CSS. A page's `<style>` is scoped by stamping
// data-astro-cid onto elements in the ASTRO template, and an island renders its
// own DOM which never receives the attribute — so island CSS in a page has to be
// `is:global` and stops being the island's. Keeping it here is what makes the
// masonry portable and what makes the "copied from photos.astro" claim checkable
// against one block rather than against half a page.
const PB_CSS = `
.pb-root { display: grid; gap: var(--space-4); }

/* == D-22's axis selector: one control, because D-22 is one decision ======= */
.pb-axis { display: grid; gap: var(--space-2); }
.pb-legend {
	font-family: var(--mono);
	font-size: var(--text-2xs);
	letter-spacing: var(--ls-wide);
	text-transform: uppercase;
	color: var(--ink-3);
}
.pb-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.pb-btn {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	min-height: 30px;
	padding: 0 var(--space-2);
	border: 1px solid var(--rule);
	border-radius: var(--radius-md);
	background: var(--cream-2);
	color: var(--ink-2);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	cursor: pointer;
}
.pb-btn:hover { border-color: var(--wire); color: var(--ink); }
.pb-btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.pb-btn[data-on="true"] {
	border-color: var(--wire);
	background: var(--cream-3);
	color: var(--ink);
}
.pb-key {
	font-family: var(--mono);
	font-size: var(--text-2xs);
	padding: 0 4px;
	border-radius: var(--radius-sm);
	background: var(--cream-3);
	color: var(--ink-3);
}
.pb-says { margin: 0; font-size: var(--text-sm); color: var(--ink-2); }
.pb-says strong { font-weight: 600; color: var(--ink); }
.pb-note { margin: 0; font-size: var(--text-xs); color: var(--ink-3); }

/* == The board splits: masonry, then the focal panel BESIDE it ============
   R-6 reflow, never hide. Below 900px the panel moves under the board rather
   than disappearing; every control in it is still present and reachable. */
.pb-split { display: grid; gap: var(--space-4); align-items: start; }
@media (min-width: 900px) {
	.pb-split { grid-template-columns: minmax(0, 1fr) 340px; }
	.pb-panel { position: sticky; top: var(--space-4); }
}

/* == THE MASONRY, COPIED FROM photos.astro:455-462 ========================
   Flat three columns at EVERY device class, because the public masonry is. No
   media query on the count here for the same reason there is none there. */
.ds-atom-sortable.pb-masonry {
	display: block;
	list-style: none;
	margin: 0;
	padding: 0;
	column-count: 3;
	/* 16px LITERAL, NOT var(--space-4), AND THAT IS THE WHOLE POINT.
	   photos.astro writes column-gap: var(--space-4) on a PUBLIC page, where
	   the token is 16px. This board sits inside the admin, and
	   density-compact.css:98 reassigns --space-4: 12px under pointer: fine.
	   Writing the token here therefore drew the board at a 16px gap on every
	   coarse class and a 12px gap at 1440 — MEASURED, not reasoned: the probe
	   reported /photos cols=3 gap=16px against board cols=3 gap=12px at 1440
	   only. A narrower gap widens the columns, which changes tile heights, which
	   moves where the multi-column algorithm breaks between columns. The board
	   would have been showing a composition the public page does not have, at
	   the one device class the operator actually works on.
	   The density axis is right and this is not a bug in it: a preview of a
	   public surface has to be drawn at the public surface's spacing, not at the
	   host chrome's. So the public value is pinned. */
	column-gap: 16px;
}
.pb-masonry > li {
	break-inside: avoid;
	padding: 0;
	list-style: none;
	/* !important IS LOAD-BEARING HERE, AND IT IS A DESIGN-SYSTEM LIMIT.
	   Sortable renders every item as <li style={{listStyle:"none", padding:0,
	   margin:0}}> (dist/index.js:9845) — an INLINE style, which beats any
	   stylesheet rule a consumer can write. So the vertical rhythm the public
	   masonry gets from .ph-tile { margin-bottom: var(--space-4) } is
	   unreachable by normal means and the board rendered with zero vertical gap
	   until this was measured (li margin-bottom read back as 0px). A stylesheet
	   !important outranks a non-important inline style, which is the only
	   route left. Reported: Sortable should not hard-code item box model. */
	margin: 0 0 16px !important;
}
/* LIMIT 1, NEUTRALISED IN CSS BECAUSE THE PROP DOES NOT EXIST. Sortable pins
   verticalListSortingStrategy, whose one-axis shuffle transform is meaningless
   across three columns and makes tiles jump into each other mid-drag. The
   DragOverlay follows the pointer and is strategy-independent, so killing this
   transform costs no feedback and removes a wrong picture. Reported upstream as
   "Sortable needs a strategy prop", not worked around silently. */
.pb-masonry .ds-atom-sortable-item {
	transform: none !important;
	transition: none !important;
	height: auto;
}

/* == The tile. Geometry is the public tile's, not a thumbnail's. ========== */
.pb-tile {
	position: relative;
	display: block;
	width: 100%;
	overflow: hidden;
	border-radius: 10px;
	background-color: var(--cream-3);
}
.pb-tile[data-frame="gallery"] { /* aspect-ratio set inline, per photo */ }
.pb-tile[data-frame="peek"] { aspect-ratio: ${PEEK_W} / ${PEEK_H}; }
.pb-img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pb-tile[data-selected="true"] { box-shadow: 0 0 0 2px var(--focus); }
.ds-atom-sortable-item:focus-visible .pb-tile { box-shadow: 0 0 0 2px var(--focus); }
.pb-tile[data-pipeline="processing"],
.pb-tile[data-pipeline="failed"] { outline: 1px dashed var(--wire); outline-offset: -1px; }

/* The focal point, VISIBLE EVEN WHERE IT DOES NOT BITE. In the gallery frame
   the photo is uncropped so the marker moves nothing — but the operator still
   needs to see where the point is, because it is the value they are editing. */
.pb-dot {
	position: absolute;
	width: 12px;
	height: 12px;
	margin: -6px 0 0 -6px;
	border-radius: 50%;
	border: 2px solid var(--cream);
	background: rgba(0, 0, 0, 0.35);
	box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
	pointer-events: none;
}

/* Caption OVERLAID, not stacked under. A footer below the image would change
   the tile height and the composition would stop being the public one — which
   is the single thing this board must not get wrong. */
.pb-cap {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	display: grid;
	gap: 1px;
	padding: var(--space-5) var(--space-2) var(--space-1);
	background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
	pointer-events: none;
}
.pb-cap-title {
	font-family: var(--font-body);
	font-size: var(--text-xs);
	line-height: 1.2;
	color: #fff;
}
.pb-cap-pos { font-family: var(--mono); font-size: var(--text-2xs); color: rgba(255, 255, 255, 0.82); }
.pb-ord {
	position: absolute;
	top: 6px;
	left: 6px;
	min-width: 20px;
	padding: 1px 4px;
	border-radius: var(--radius-sm);
	background: var(--ink);
	color: var(--cream);
	font-family: var(--mono);
	font-size: var(--text-2xs);
	text-align: center;
}

/* == The focal panel ====================================================== */
.pb-panel { display: grid; gap: var(--space-2); }
.pb-panel-empty {
	padding: var(--space-4);
	border: 1px dashed var(--rule);
	border-radius: var(--radius-md);
	color: var(--ink-3);
	font-size: var(--text-sm);
}

/* == The staged strip ===================================================== */
.pb-staged { display: grid; gap: var(--space-2); }
.pb-staged-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
	gap: var(--space-3);
	opacity: 0.9;
}
.pb-staged-li { list-style: none; }

/* == THE 44px FLOOR, ON EVERY COARSE-POINTER CLASS ========================
   AFTER the base rules, never before: a media query adds no specificity, so a
   floor written above a 30px base rule loses to it and measures 30px. That
   mistake has already been made once in this playground and the audit, not a
   grep, is what caught it. Gated on the coarse-pointer media feature only —
   never on width, and never on the any- prefixed variant.
   The TILE is the drag handle (SortableItem spreads dnd-kit's listeners onto
   the item wrapper), so the floor belongs on the tile, not on a glyph. */
@media (pointer: coarse) {
	.pb-btn { min-height: 44px; }
	.pb-tile,
	.pb-masonry .ds-atom-sortable-item,
	.pb-staged-li .ds-atom-sortable-item { min-height: 44px; }
}
`;

/** `"50% 25%"` -> `{ x, y }` in percent. Missing or unparseable falls back to centre. */
function parseFocal(raw: string | null | undefined): { x: number; y: number } {
	const parts = String(raw ?? DEFAULT_FOCAL).trim().split(/\s+/);
	const x = Number.parseFloat(parts[0]);
	const y = Number.parseFloat(parts[1]);
	return {
		x: Number.isFinite(x) ? x : 50,
		y: Number.isFinite(y) ? y : 50,
	};
}

function labelOf(categories: ReorderCategory[], id: string) {
	return categories.find((c) => c.id === id)?.label ?? id;
}

export default function PhotoLayoutBoard({
	photos,
	staged = [],
	categories,
	activeCategory = ALL,
}: Props) {
	// One list of ids per axis, both seeded from the SAME existing `order`. They
	// start in agreement, so any later disagreement is something the operator did
	// — which is what makes D-22's two-field model legible instead of asserted.
	const seed = useMemo(() => {
		const byOrder = [...photos].sort((a, b) => a.order - b.order);
		const next: Record<string, string[]> = { [ALL]: byOrder.map((p) => p.id) };
		for (const c of categories) {
			next[c.id] = byOrder.filter((p) => p.category === c.id).map((p) => p.id);
		}
		return next;
	}, [photos, categories]);

	const [axis, setAxis] = useState(activeCategory);
	const [frame, setFrame] = useState<Frame>("gallery");
	const [orders, setOrders] = useState(seed);
	const [moves, setMoves] = useState<Record<string, number>>({});
	const [stagedOrder, setStagedOrder] = useState(staged.map((p) => p.id));
	const [selectedId, setSelectedId] = useState<string | null>(null);
	// Focal edits, live. Keyed by photo id, seeded lazily from the fixture value.
	const [focal, setFocal] = useState<Record<string, string>>({});
	const panelRef = useRef<HTMLDivElement | null>(null);

	const byId = useMemo(() => {
		const m: Record<string, ReorderPhoto> = {};
		for (const p of [...photos, ...staged]) m[p.id] = p;
		return m;
	}, [photos, staged]);

	const focalOf = useCallback(
		(id: string) => focal[id] ?? byId[id]?.focalPoint ?? DEFAULT_FOCAL,
		[focal, byId],
	);

	// ── LIMIT 2, PAID IN FULL ──────────────────────────────────────────────
	// FocalPointSketch owns its value privately: no onChange, no controlled prop,
	// nothing returned. The only place the current value exists outside the
	// component is the readout it paints. So the board watches that node and
	// mirrors it onto the tile. This is the literal request — "see the position on
	// actual final website" — costing a DOM observer because the design system has
	// no focal control and the local stand-in is not composable either. Recorded
	// under G-1 rather than hidden behind a helper with a tidy name.
	useEffect(() => {
		const host = panelRef.current;
		if (!host || !selectedId) return;
		const id = selectedId;
		const read = () => {
			const text = host.querySelector(".fp-readout")?.textContent?.trim();
			if (!text) return;
			setFocal((prev) => (prev[id] === text ? prev : { ...prev, [id]: text }));
		};
		read();
		const mo = new MutationObserver(read);
		mo.observe(host, { subtree: true, childList: true, characterData: true });
		return () => mo.disconnect();
	}, [selectedId]);

	// ── SELECTION IS DELEGATED, AND THAT IS FORCED ─────────────────────────
	// SortableItem spreads dnd-kit's attributes AND listeners onto the item
	// wrapper (dist/index.js:9765-9769), so the WHOLE TILE is the drag handle and
	// the wrapper carries role="button" and tabIndex 0. A button, a link or an
	// input nested inside it would be interactive content inside a role="button":
	// invalid ARIA, and unreachable by keyboard because the parent consumes the
	// key events. THE OBVIOUS IMPLEMENTATION IS THE FORBIDDEN ONE, which is why
	// this comment sits where the tile is defined.
	//
	// The resolution: focal editing lives in a panel BESIDE the board, and the
	// board selects by delegation from a wrapper of ours. `focusin` bubbles, so
	// arrowing or tabbing to a tile selects it; capture-phase pointerdown runs
	// before dnd-kit's own bubble-phase handler on the wrapper, so clicking a
	// tile selects it without competing with the drag.
	const pick = useCallback((target: EventTarget | null) => {
		const el = target instanceof Element ? target : null;
		if (!el) return;
		const hit = el.closest("[data-photo-id]") ?? el.querySelector("[data-photo-id]");
		const id = hit?.getAttribute("data-photo-id");
		if (id) setSelectedId(id);
	}, []);

	// The island is rendered UNCONDITIONALLY by the route — check-no-js.sh fails an
	// allowlisted route that ships zero script tags, and every state route of an
	// allowlisted screen is allowlisted — so it returns null when there is nothing
	// to order. The page's own empty state is the artefact; a second message here
	// would put two designs on screen for one fact.
	if (photos.length === 0 && staged.length === 0) return null;

	const axisIds = orders[axis] ?? [];
	const items = axisIds.map((id) => byId[id]).filter(Boolean);
	const axisLabel = axis === ALL ? "Global order" : `${labelOf(categories, axis)} order`;
	const axisField = axis === ALL ? "order" : `the per-category order for ${axis}`;
	const moved = moves[axis] ?? 0;
	const selected = selectedId ? byId[selectedId] : null;

	function handleReorder(next: Array<{ id: string | number }>) {
		setOrders((prev) => ({ ...prev, [axis]: next.map((i) => String(i.id)) }));
		setMoves((prev) => ({ ...prev, [axis]: (prev[axis] ?? 0) + 1 }));
	}

	// SortableDndContext hands back ids rather than a reordered array, because it
	// is built for moving an item BETWEEN lists. The staged strip is hand-built
	// for that reason, and the limit it surfaces is recorded in 00-13-SUMMARY.md.
	function handleStagedMove(activeId: string, overId: string) {
		setStagedOrder((prev) => {
			const from = prev.indexOf(activeId);
			const to = prev.indexOf(overId);
			if (from < 0 || to < 0 || from === to) return prev;
			const next = [...prev];
			next.splice(to, 0, next.splice(from, 1)[0]);
			return next;
		});
	}

	return (
		<div className="pb-root">
			<style>{PB_CSS}</style>

			{/* ── The axis selector. ONE control, because D-22 has one decision. ── */}
			<div className="pb-axis">
				<span className="pb-legend" id="pb-axis-legend">
					Reorder within
				</span>
				<div className="pb-row" role="group" aria-labelledby="pb-axis-legend">
					{[{ id: ALL, label: "All", count: photos.length }, ...categories].map((c) => (
						<button
							key={c.id}
							type="button"
							className="pb-btn"
							aria-pressed={axis === c.id}
							data-on={axis === c.id ? "true" : undefined}
							onClick={() => setAxis(c.id)}
						>
							<span>{c.label}</span>
							<code className="pb-key">{c.id}</code>
						</button>
					))}
				</div>

				{/* D-22's sentence. A live reorder that does not name the field it
				    writes leaves the operator to conclude a reorder was lost. It is
				    stated BEFORE the drag, not reported after it. */}
				<p className="pb-says">
					Dragging now writes <strong>{axisLabel}</strong> ({axisField}).{" "}
					{axis === ALL
						? "Per-category orders are untouched."
						: "The global order is untouched, and so is every other category."}
				</p>
				<p className="pb-note">
					{moved === 0
						? "No reorder yet on this axis."
						: `${moved} reorder${moved === 1 ? "" : "s"} on this axis. Nothing is saved: this sketch has no store, by design.`}
				</p>
			</div>

			{/* ── Which frame the tiles are drawn in ───────────────────────────
			    Not a style toggle. The public gallery shows every photo UNCROPPED
			    at its own aspect ratio, so the focal point does nothing there; the
			    peek slot crops to 3:2, so it does everything there. Naming the
			    surface is the only way the board can show a live crop without
			    lying about which page it is imitating. */}
			<div className="pb-axis">
				<span className="pb-legend" id="pb-frame-legend">
					Draw tiles as
				</span>
				<div className="pb-row" role="group" aria-labelledby="pb-frame-legend">
					<button
						type="button"
						className="pb-btn"
						aria-pressed={frame === "gallery"}
						data-on={frame === "gallery" ? "true" : undefined}
						onClick={() => setFrame("gallery")}
					>
						<span>Gallery</span>
						<code className="pb-key">/photos</code>
					</button>
					<button
						type="button"
						className="pb-btn"
						aria-pressed={frame === "peek"}
						data-on={frame === "peek" ? "true" : undefined}
						onClick={() => setFrame("peek")}
					>
						<span>Peek slot</span>
						<code className="pb-key">
							{PEEK_W}:{PEEK_H}
						</code>
					</button>
				</div>
				<p className="pb-note">
					{frame === "gallery"
						? "Three columns, real aspect ratios, uncropped — the /photos masonry exactly. The focal marker shows where the point is, but it moves nothing here: the public gallery never crops."
						: `Three columns and the same gap, every tile cropped to Home's ${PEEK_W}:${PEEK_H} peek frame. This is where the focal point bites, and the crop updates as you edit it.`}
				</p>
			</div>

			<div className="pb-split">
				{/* ── The board: the public masonry, reorderable ──────────────── */}
				<div onPointerDownCapture={(e) => pick(e.target)} onFocusCapture={(e) => pick(e.target)}>
					<Sortable
						id="gallery"
						className="pb-masonry"
						items={items}
						onReorder={handleReorder}
						renderItem={(item) => {
							const p = byId[String(item.id)];
							if (!p) return null;
							const g = (orders[ALL] ?? []).indexOf(p.id) + 1;
							const c = (orders[p.category] ?? []).indexOf(p.id) + 1;
							const value = focalOf(p.id);
							const dot = parseFocal(value);
							return (
								<div
									className="pb-tile"
									data-photo-id={p.id}
									data-frame={frame}
									data-pipeline={p.pipeline}
									data-selected={selectedId === p.id ? "true" : undefined}
									style={
										frame === "gallery"
											? { aspectRatio: `${p.width} / ${p.height}` }
											: undefined
									}
								>
									<span className="pb-ord">{axis === ALL ? g : c}</span>
									<img
										className="pb-img"
										src={p.src}
										alt={p.title}
										width={p.width}
										height={p.height}
										style={{ objectPosition: value }}
										loading="lazy"
										decoding="async"
										draggable={false}
									/>
									<span className="pb-dot" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} />
									<span className="pb-cap">
										<span className="pb-cap-title">{p.title}</span>
										{/* BOTH numbers on every tile, so a drag inside a category
										    visibly moves one and visibly leaves the other alone. */}
										<span className="pb-cap-pos">
											global #{g} · {p.category} #{c}
										</span>
										<span className="pb-cap-pos">focal {value}</span>
									</span>
								</div>
							);
						}}
					/>
				</div>

				{/* ── The focal panel, BESIDE the board ───────────────────────── */}
				<div className="pb-panel" ref={panelRef}>
					<span className="pb-legend">Focal point</span>
					{selected ? (
						<>
							<p className="pb-note">
								Editing <strong>{selected.title}</strong>. Drag inside the frame, or focus it
								and use the arrow keys. The tile in the board follows this value.
							</p>
							{/* REUSED, NOT REBUILT. This is G-1's measured cost: 269
							    non-comment lines that every consumer wanting a focal point
							    writes for itself, 86 of them frame CSS. Reusing them here is
							    what shows the absence is load-bearing for the whole gallery
							    admin rather than for six peek slots.

							    `key` remounts it per photo: its value is seeded in a useState
							    initialiser, which runs once, so a changed `slot` on a kept
							    instance would show the previous photo's number.

							    The ratio props are the SAME constant the peek tile is drawn
							    with, because .fp-frame hard-codes aspect-ratio 3/2 in the
							    component's own CSS — the ratio is a prop in the arithmetic
							    only, and a different number would describe a frame it is
							    still painting at 3:2. */}
							<FocalPointSketch
								key={selected.id}
								slot={{
									id: selected.id,
									title: selected.title,
									category: selected.category,
									src: selected.src,
									width: selected.width,
									height: selected.height,
									orientation:
										selected.width > selected.height
											? "wide"
											: selected.width < selected.height
												? "tall"
												: "exact",
									position: focalOf(selected.id),
								}}
								frameRatioW={PEEK_W}
								frameRatioH={PEEK_H}
							/>
						</>
					) : (
						<p className="pb-panel-empty">
							Select a tile in the board — click it, or tab to it — to edit its focal point.
							The control cannot live on the tile itself: the tile is the drag handle, so a
							control inside it would be unreachable by keyboard.
						</p>
					)}
				</div>
			</div>

			{/* ── The staged strip: D-12 made visible ─────────────────────────────
			    Committed but NOT in the gallery, because processing has not
			    finished. Keeping them out of the masonry is what makes the topbar
			    strip and this board agree rather than merely sit near each other.
			    Not a second Sortable: nesting one inside SortableDndContext makes
			    its onReorder silently stop firing (dist/index.js:9848-9850), so the
			    two are siblings. Recorded in 00-13-SUMMARY.md, not worked around. */}
			{stagedOrder.length > 0 && (
				<div className="pb-staged">
					<span className="pb-legend">Staged, not in the gallery yet</span>
					<SortableDndContext onMove={(a, o) => handleStagedMove(String(a), String(o))}>
						<ul className="pb-staged-list">
							{stagedOrder.map((id) => {
								const p = byId[id];
								if (!p) return null;
								return (
									<li key={id} className="pb-staged-li">
										<SortableItem id={id} reducedMotion={false}>
											<div
												className="pb-tile"
												data-frame="peek"
												data-pipeline={p.pipeline}
											>
												<img
													className="pb-img"
													src={p.src}
													alt={p.title}
													width={p.width}
													height={p.height}
													style={{ objectPosition: focalOf(p.id) }}
													loading="lazy"
													decoding="async"
													draggable={false}
												/>
												<span className="pb-cap">
													<span className="pb-cap-title">{p.title}</span>
													<Badge tone={PIPE[p.pipeline].tone} dot>
														{PIPE[p.pipeline].label}
													</Badge>
												</span>
											</div>
										</SortableItem>
									</li>
								);
							})}
						</ul>
					</SortableDndContext>
					<p className="pb-note">
						A staged photo has no place in either ordering until processing finishes, so it
						carries no position number.
					</p>
				</div>
			)}
		</div>
	);
}
