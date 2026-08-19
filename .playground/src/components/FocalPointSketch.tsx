// FocalPointSketch — D-23's crop control, running, and G-1's evidence.
//
// ═══ WHY THIS ONE HYDRATES ══════════════════════════════════════════════════
// UI-SPEC's hydration budget permits exactly three islands in the whole phase
// and the rule for all three is the same: THE INTERACTION IS THE THING UNDER
// REVIEW. A screenshot of a 3:2 frame cannot answer whether a continuous crop
// value is reachable by pointer AND by keyboard, and answering that is the whole
// reason Phase 1 is being asked to fund `FocalPointPicker` upstream.
//
// ═══ WHAT G-1 SAYS, AND WHAT THIS FILE IS FOR ═══════════════════════════════
// G-1: the design system has NO crop or focal-point component. D-23 adds that a
// preset grid cannot substitute for one. Composing this control out of design-
// system primitives is therefore evidence-gathering, not a workaround — the gap
// is already filed, and what was missing was the COST of living without it. The
// cost is this file's length: every consumer that wants a focal point rewrites
// all of it, including the two accessibility defects fixed below, and each of
// them gets to reinvent the interaction model as well.
//
// ═══ THE LEGACY CONTROL, AND ITS THREE DEFECTS ══════════════════════════════
// git show legacy/nextjs-portfolio:src/components/admin/PropertiesPanel.tsx
// lines 739-786. It works, and it has exactly three defects:
//
//   1. MOUSE ONLY. A single mouse-down handler, no pointer and no touch events.
//      That is also D-09's evidence for the desktop-only refusal: the control
//      does not merely feel bad on a phone, it does not respond at all.
//   2. UNREACHABLE BY KEYBOARD. No tabIndex, no key handler. The frame is a
//      plain <div>, so there is no keyboard path to the value at all.
//   3. LEAKED LISTENERS. It attaches move and up handlers to `document` and
//      removes them only on mouse-up. Unmounting mid-drag leaks both.
//
// TWO OF THE THREE ARE FIXED HERE (1 and 2), and 3 is fixed as well because
// fixing 1 without it would have been dishonest about the cost. What is NOT
// fixed is the missing component: nothing below is proposed as a local
// substitute, and the file dies with the playground.
//
// ═══ ONE INTERACTION MODEL CHANGE, STATED RATHER THAN SLIPPED IN ════════════
// The legacy control drags the IMAGE, with an inverted delta and an arbitrary
// `/ 2` damping factor (`startPosX - (dx / 2)`), so the value moves at half the
// speed of the hand and in the opposite direction, and the damping is
// resolution-dependent: the same drag means a different value on a 320px frame
// than on a 640px one. This control instead places the FOCAL POINT directly.
//
// That is not a preference — the two models coincide geometrically, and the
// direct one is the only one that is resolution-independent. `object-position:
// x% y%` aligns the point at (x%, y%) OF THE IMAGE with the point at (x%, y%) OF
// THE FRAME. So a marker dragged to (x%, y%) of the frame IS the value, exactly,
// at any frame size. That two reasonable engineers would pick different models
// for the same three-line CSS property is one more argument for the component
// living upstream instead of being re-derived per consumer.
//
// ═══ WHY THE FRAME CSS LIVES IN THIS FILE ═══════════════════════════════════
// It is the control's own geometry — the 3:2 ratio, the cover fit, the grab
// cursor, the crosshair — ported from legacy:src/styles/admin.css lines
// 1777-1797. An upstream FocalPointPicker would ship exactly this and no
// consumer would ever type it. Keeping it beside the control rather than in the
// host page is what makes the "every consumer rewrites this" claim legible: the
// page's own block carries page chrome, and this carries the component.
//
// ═══ NO PERSISTENCE — THE D-02 SCOPE FENCE ══════════════════════════════════
// No network request, no storage of any kind, no endpoint. The value lives in
// component state and is thrown away on navigation. Asserted by grep rather than
// promised in a comment.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Badge, Eyebrow, Text } from "@akhil-saxena/design-system";

export interface FocalSlot {
	id: string;
	title: string;
	category: string;
	src: string;
	width: number;
	height: number;
	orientation: "wide" | "tall" | "exact";
	/** The stored crop, or null when the photo has never been cropped. */
	position: string | null;
}

interface Props {
	/** Null on every state where the control has nothing to do — see below. */
	slot?: FocalSlot | null;
	/** The peek card's frame, 3:2. Passed so the axis maths is not a constant. */
	frameRatioW?: number;
	frameRatioH?: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** `"50% 25%"` -> `{ x: 50, y: 25 }`. Missing or unparseable falls back to centre. */
function parsePosition(raw: string | null | undefined): { x: number; y: number } {
	const parts = String(raw ?? "50% 50%").trim().split(/\s+/);
	const x = Number.parseFloat(parts[0]);
	const y = Number.parseFloat(parts[1]);
	return {
		x: Number.isFinite(x) ? clamp(x) : 50,
		y: Number.isFinite(y) ? clamp(y) : 50,
	};
}

// The nine-point preset lattice a "crop presets" control would offer: top-left
// through bottom-right, i.e. {0, 50, 100} on each axis. D-23's argument is
// checked against it at render time rather than asserted in prose.
const PRESET_STOPS = [0, 50, 100];
const onPresetGrid = (x: number, y: number) => PRESET_STOPS.includes(x) && PRESET_STOPS.includes(y);

// Ported from legacy:src/styles/admin.css:1777-1797, recoloured onto charcoal
// tokens. The crosshair is the legacy control's, kept because it marks the one
// point the value is actually about.
const FRAME_CSS = `
.fp-frame {
	position: relative;
	width: 100%;
	max-width: 420px;
	aspect-ratio: 3 / 2;
	overflow: hidden;
	border-radius: var(--radius-md);
	border: 1px solid var(--wire);
	background: var(--cream-3);
	cursor: grab;
	user-select: none;
	touch-action: none;
}
.fp-frame[data-dragging="true"] { cursor: grabbing; }
.fp-frame:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.fp-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	pointer-events: none;
}
.fp-crosshair {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background:
		linear-gradient(to right, transparent calc(50% - 0.5px), rgba(255,255,255,0.32) calc(50% - 0.5px), rgba(255,255,255,0.32) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
		linear-gradient(to bottom, transparent calc(50% - 0.5px), rgba(255,255,255,0.32) calc(50% - 0.5px), rgba(255,255,255,0.32) calc(50% + 0.5px), transparent calc(50% + 0.5px));
}
.fp-marker {
	position: absolute;
	width: 22px;
	height: 22px;
	margin: -11px 0 0 -11px;
	border-radius: 50%;
	border: 2px solid var(--cream);
	box-shadow: 0 0 0 1px rgba(0,0,0,0.45);
	background: rgba(0,0,0,0.18);
	pointer-events: none;
}
.fp-marker::after {
	content: "";
	position: absolute;
	inset: 8px;
	border-radius: 50%;
	background: var(--cream);
}
.fp-readout {
	font-family: var(--mono);
	font-size: var(--text-sm);
	color: var(--ink);
	padding: 2px 6px;
	border: 1px solid var(--rule);
	border-radius: var(--radius-sm);
	background: var(--cream-2);
}
.fp-reset {
	display: inline-flex;
	align-items: center;
	min-height: 30px;
	padding: 0 var(--space-3);
	border: 1px solid var(--rule);
	border-radius: var(--radius-md);
	background: var(--cream-2);
	color: var(--ink-2);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	cursor: pointer;
}
.fp-reset:hover { border-color: var(--wire); color: var(--ink); }
.fp-reset:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
/* THE 44px FLOOR, on the hit area. Five of the six device classes in the
   responsive contract are coarse pointer, so this is the common case. The frame
   itself is far above the floor; this covers the reset control beside it.

   IT IS AFTER THE BASE RULE, NOT BEFORE, AND THAT IS THE BUG THIS SKETCH ALREADY
   MADE ONCE. A coarse-pointer min-height of 44px and the base rule's 30px are the
   SAME specificity (0,1,0) — a media query adds none — so whichever is written
   last wins. Written first, the floor
   measured 30px at 344, 390, 768 and 1024, all coarse. The audit caught it; a
   grep for the rule would not have, which is why the floor is measured in a
   browser rather than asserted with a pattern. */
@media (pointer: coarse) {
	.fp-reset { min-height: 44px; }
}
`;

export default function FocalPointSketch({
	slot = null,
	frameRatioW = 3,
	frameRatioH = 2,
}: Props) {
	const frameRef = useRef<HTMLDivElement | null>(null);
	const [pos, setPos] = useState(() => parsePosition(slot?.position));
	const [dragging, setDragging] = useState(false);
	const liveId = useId();

	// ── DEFECT 3, FIXED: cleanup on unmount ────────────────────────────────
	// Pointer capture is released for us on up and cancel, but capture can also
	// be lost without either — a context menu, a window blur, a device switch —
	// and the legacy control's `document` listeners survived unmount outright.
	// One AbortController covers both: the safety net exists while mounted and
	// every listener is removed with it.
	useEffect(() => {
		const ac = new AbortController();
		const stop = () => setDragging(false);
		window.addEventListener("pointercancel", stop, { signal: ac.signal });
		window.addEventListener("blur", stop, { signal: ac.signal });
		return () => {
			ac.abort();
			// Belt as well as braces: the same teardown written the long way, so
			// the cost of doing this correctly is visible rather than hidden
			// behind one clever line.
			window.removeEventListener("pointercancel", stop);
			window.removeEventListener("blur", stop);
		};
	}, []);

	const setFromPointer = useCallback((clientX: number, clientY: number) => {
		const el = frameRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) return;
		setPos({
			x: clamp(((clientX - r.left) / r.width) * 100),
			y: clamp(((clientY - r.top) / r.height) * 100),
		});
	}, []);

	// ── DEFECT 1, FIXED: pointer events, so touch and pen work ─────────────
	// One handler set covers mouse, touch and pen, and pointer capture keeps the
	// drag alive when the finger leaves the frame — which is what the legacy
	// control needed `document`-level listeners for in the first place.
	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.preventDefault();
		setDragging(true);
		setFromPointer(e.clientX, e.clientY);
		// Capture LAST and guarded: setPointerCapture throws NotFoundError when the
		// pointer id is no longer active, and doing it first meant one throw took
		// the value update down with it. Capture is an enhancement — it keeps the
		// drag alive when the finger leaves the frame — not a precondition.
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			/* capture unavailable; the window-level safety net above still ends the drag */
		}
	};
	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging) return;
		setFromPointer(e.clientX, e.clientY);
	};
	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		setDragging(false);
	};

	// ── DEFECT 2, FIXED: the keyboard reaches the value ────────────────────
	// tabIndex plus arrow keys, 1% a step and 10% with shift, Home for centre.
	// This is the shape G-1's proposed upstream fix specifies, and it is also
	// the only path by which the value is reachable without a pointing device.
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const step = e.shiftKey ? 10 : 1;
		let dx = 0;
		let dy = 0;
		if (e.key === "ArrowLeft") dx = -step;
		else if (e.key === "ArrowRight") dx = step;
		else if (e.key === "ArrowUp") dy = -step;
		else if (e.key === "ArrowDown") dy = step;
		else if (e.key === "Home") {
			e.preventDefault();
			setPos({ x: 50, y: 50 });
			return;
		} else return;
		e.preventDefault();
		setPos((p) => ({ x: clamp(p.x + dx), y: clamp(p.y + dy) }));
	};

	// ── THE ISLAND IS RENDERED UNCONDITIONALLY, AND RETURNS NULL HERE ──────
	// check-no-js.sh fails an allowlisted route that ships ZERO script tags, and
	// every state route of an allowlisted screen is allowlisted. So the host
	// page always mounts this component and passes `slot={null}` where the
	// control has nothing to do — the empty and loading states, and the phone
	// refusal, whose whole point is that this control is absent. Astro still
	// emits the island element and the hydration script, so the budget gate
	// keeps measuring something real.
	if (!slot) return null;

	const value = `${pos.x}% ${pos.y}%`;
	const objectPosition = value;

	// Which axis the value actually moves, computed from the real pixel
	// dimensions rather than assumed. With `cover`, only the overflowing axis
	// responds; the other is inert at every value.
	const imageRatio = slot.width / slot.height;
	const frameRatio = frameRatioW / frameRatioH;
	const liveAxis =
		Math.abs(imageRatio - frameRatio) < 0.01
			? "neither"
			: imageRatio > frameRatio
				? "horizontal"
				: "vertical";

	// The visible band, in percent of the ORIGINAL image, at the current value.
	// This is what a preset would be moving, quantified.
	let band: { from: number; to: number; span: number } | null = null;
	if (liveAxis === "vertical") {
		const span = (frameRatioH / frameRatioW) * imageRatio; // visible fraction of image height
		const from = (1 - span) * (pos.y / 100);
		band = { from: from * 100, to: (from + span) * 100, span: span * 100 };
	} else if (liveAxis === "horizontal") {
		const span = (frameRatioW / frameRatioH) / imageRatio;
		const from = (1 - span) * (pos.x / 100);
		band = { from: from * 100, to: (from + span) * 100, span: span * 100 };
	}

	return (
		<div className="fp-root">
			<style>{FRAME_CSS}</style>

			<div className="fp-frame-wrap">
				{/* THE FRAME. `role="application"` is deliberately NOT used: this is a
				    single value edited with arrow keys, which is a slider's job, and a
				    slider role with aria-valuetext is what an upstream component should
				    expose. It is left as a focusable group here, with a live readout
				    beside it, because inventing the ARIA contract for a component that
				    does not exist is a decision for the component's author, not for a
				    sketch. Recorded as part of G-1's proposed shape. */}
				<div
					ref={frameRef}
					className="fp-frame"
					data-dragging={dragging ? "true" : undefined}
					tabIndex={0}
					aria-label={`Focal point for ${slot.title}. Arrow keys move it by one percent, shift by ten.`}
					aria-describedby={liveId}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
					onKeyDown={handleKeyDown}
				>
					<img
						className="fp-img"
						src={slot.src}
						alt={slot.title}
						width={slot.width}
						height={slot.height}
						style={{ objectPosition }}
						draggable={false}
					/>
					<div className="fp-crosshair" />
					<div className="fp-marker" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} />
				</div>

				<div className="fp-side">
					<Eyebrow size="sm" tone="muted">STORED VALUE</Eyebrow>
					<div className="fp-readout-row">
						<span className="fp-readout" id={liveId} role="status" aria-live="polite">
							{value}
						</span>
						<button
							type="button"
							className="fp-reset"
							onClick={() => setPos(parsePosition(slot.position))}
						>
							Reset to {slot.position ?? "50% 50%"}
						</button>
					</div>

					{/* D-23's ARGUMENT, CHECKED RATHER THAN ASSERTED. The nine-point
					    preset lattice is {0, 50, 100} on each axis. The site's one real
					    crop is 50% 25%, and 25 is not a stop on it. */}
					<Text size="sm" tone="muted">
						{onPresetGrid(pos.x, pos.y)
							? "This value is on the nine-point preset lattice (0 / 50 / 100 on each axis), so a preset picker could have produced it."
							: "This value is NOT on the nine-point preset lattice (0 / 50 / 100 on each axis). A preset picker would have had to change it."}
					</Text>

					<Text size="sm" tone="muted">
						{slot.width} × {slot.height} in a {frameRatioW}:{frameRatioH} frame, so the crop is{" "}
						<strong>{liveAxis}</strong>
						{liveAxis === "neither"
							? " — the photo already matches the frame, and neither number moves anything."
							: liveAxis === "vertical"
								? ` — the second number moves the image and the first is inert at every value.`
								: ` — the first number moves the image and the second is inert at every value.`}
					</Text>

					{band && (
						<Text size="sm" tone="muted">
							Showing {band.from.toFixed(1)}% to {band.to.toFixed(1)}% of the original — a{" "}
							{band.span.toFixed(1)}% band. At 50% it would be{" "}
							{(((1 - band.span / 100) * 0.5) * 100).toFixed(1)}% to{" "}
							{(((1 - band.span / 100) * 0.5) * 100 + band.span).toFixed(1)}%.
						</Text>
					)}

					<div className="fp-flags">
						<Badge tone="info">pointer + touch + pen</Badge>
						<Badge tone="info">keyboard</Badge>
						<Badge tone="pending" dot>no component upstream</Badge>
					</div>
				</div>
			</div>
		</div>
	);
}
